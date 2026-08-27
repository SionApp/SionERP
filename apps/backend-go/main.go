package main

import (
	"backend-sion/config"
	"backend-sion/handlers"
	appMiddleware "backend-sion/middleware"
	"backend-sion/routes"
	"backend-sion/services"
	"log"
	"os"
	"strings"
	"time"

	sentry "github.com/getsentry/sentry-go"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// localDevOrigins son los orígenes de frontend que se usan en desarrollo
// local en esta máquina (SionERP en :5173/:5174, BonDev en :8080). Sirven de
// default cuando CORS_ORIGINS no está seteado — production siempre lo setea
// explícito (ver deploy), así que este fallback solo corre local.
var localDevOrigins = []string{
	"http://localhost:5173",
	"http://localhost:5174",
	"http://localhost:8080",
	"http://localhost:8081",
}

// corsAllowOrigins resuelve la lista de orígenes permitidos desde
// CORS_ORIGINS (coma-separado). Sin setear, devuelve localDevOrigins — antes
// caía a ["*"], que es exactamente la combinación que el spec de CORS
// prohíbe con AllowCredentials=true.
//
// Gotcha real (encontrado en vivo, 2026-07-24): "*" + AllowCredentials=true
// es una combinación que el spec de CORS prohíbe — el browser bloquea
// silenciosamente cualquier fetch con `credentials:'include'` cross-origin
// (falla con net::ERR_FAILED, sin mensaje útil en la Network tab más allá
// de eso). Esto rompe, por ejemplo, el acceso federado (BonDev): la cookie
// httpOnly de sesión nunca llega si el frontend corre en un origen
// distinto al backend (dev local: :5173 vs :8181). Con CORS_ORIGINS sin
// setear, arrancar el backend "a mano" (sin pasar por .claude/launch.json)
// caía en "*" y rompía el login apenas el frontend corría en un puerto
// distinto al de siempre (ej. :8080) — de ahí el default explícito.
func corsAllowOrigins() []string {
	v := os.Getenv("CORS_ORIGINS")
	if v == "" {
		return localDevOrigins
	}
	var origins []string
	for _, o := range strings.Split(v, ",") {
		if t := strings.TrimSpace(o); t != "" {
			origins = append(origins, t)
		}
	}
	if len(origins) == 0 {
		return localDevOrigins
	}
	return origins
}

func sentryMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			hub := sentry.CurrentHub().Clone()
			hub.Scope().SetRequest(c.Request())
			ctx := sentry.SetHubOnContext(c.Request().Context(), hub)
			c.SetRequest(c.Request().WithContext(ctx))

			defer func() {
				if r := recover(); r != nil {
					hub.RecoverWithContext(ctx, r)
					sentry.Flush(2 * time.Second)
					panic(r) // re-panic so Recover middleware handles the HTTP 500 response
				}
			}()

			return next(c)
		}
	}
}

func main() {
	// Cargar variables de entorno del archivo .env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Initialize Sentry (only if DSN is set)
	if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              dsn,
			Environment:      os.Getenv("ENVIRONMENT"),
			TracesSampleRate: 0.2,
		}); err != nil {
			log.Printf("[sentry] init error: %v", err)
		} else {
			defer sentry.Flush(2 * time.Second)
			log.Println("[sentry] initialized")
		}
	}

	// Initialize database
	db := config.GetDB()
	defer db.Close()

	// Fase 0 observability: wire db.Stats() (InUse/Idle/WaitCount/MaxOpenConnections)
	// into Prometheus gauges — the key metric for the known pool-cap bottleneck
	// (SetMaxOpenConns(15), see config/database.go).
	appMiddleware.RegisterPoolStats(db.DB)

	// Bootstrap super admin from env vars (first-time deploy)
	if err := services.BootstrapSuperAdmin(db.DB); err != nil {
		log.Printf("[bootstrap] WARNING: %v", err)
	}

	e := echo.New()

	// Sólo HTTPS (2026-07-24, pedido explícito): en producción, Render
	// termina TLS y reenvía HTTP puro al proceso — Echo detecta esto vía
	// X-Forwarded-Proto (c.Scheme(), ver echo/context.go), así que
	// HTTPSRedirect() funciona bien detrás de ese proxy sin configuración
	// extra. Gateado a producción: en dev local no hay TLS, redirigir a
	// https://localhost rompería todo (no hay certificado).
	// Pre() en vez de Use(): corre ANTES que cualquier otro middleware —
	// si la request no es HTTPS, no vale la pena ni loguearla.
	if os.Getenv("ENVIRONMENT") == "production" {
		e.Pre(middleware.HTTPSRedirect())
	}

	// Middleware
	e.Use(middleware.Logger())
	// HSTS + headers de seguridad estándar. HSTSMaxAge=1 año, le dice al
	// browser "nunca más intentes HTTP con este dominio" — mitiga
	// downgrade/SSL-stripping incluso si algún link viejo apunta a http://.
	// El header sólo se manda cuando la request YA llegó por HTTPS (mismo
	// chequeo de X-Forwarded-Proto que arriba) — no hace nada en dev local
	// sobre HTTP, seguro dejarlo siempre activo.
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XSSProtection:      "1; mode=block",
		ContentTypeNosniff: "nosniff",
		XFrameOptions:      "SAMEORIGIN",
		HSTSMaxAge:         31536000, // 1 año, valor estándar
		// HSTSPreloadEnabled queda en false a propósito: sumarse a la
		// preload list de los browsers es un compromiso mucho más difícil
		// de revertir (aplica ANTES de la primera visita, a todos los
		// subdominios) — decisión aparte, no algo para activar de taquito acá.
	}))
	if os.Getenv("SENTRY_DSN") != "" {
		e.Use(sentryMiddleware())
	}
	e.Use(middleware.Recover())
	// Fase 0 observability: per-endpoint latency histogram (method+route+status),
	// scraped at GET /metrics below. Wired after Recover so a recovered panic's
	// resulting status still gets measured, and before routes so every route
	// registered by SetupRoutes is covered.
	e.Use(appMiddleware.MetricsMiddleware())
	// Fase 3 (scalability): bound every request with a context deadline so a
	// handler stuck behind the saturated DB pool fails fast instead of hanging
	// for the client's full 60s. Complements the DB statement_timeout.
	e.Use(appMiddleware.RequestTimeout())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     corsAllowOrigins(), // CORS_ORIGINS (coma-separado); sin setear, mantiene "*" (comportamiento previo)
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           3600,
	}))

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"message":     "Backend Sion API",
			"version":     "1.0.0",
			"description": "API Backend para la Iglesia Sion",
		})
	})

	// Fase 0 observability: Prometheus scrape endpoint. Intentionally OUTSIDE
	// /api/v1 and the authenticated group — scrapers don't carry a Supabase
	// JWT. Guard it via METRICS_TOKEN in any environment reachable from the
	// public internet (see MetricsHandler doc comment for the exact contract);
	// prefer binding this to an internal network/VPC when the deploy target
	// supports it.
	e.GET("/metrics", appMiddleware.MetricsHandler())

	// Setup all routes
	routes.SetupRoutes(e)

	// Start background scheduler (weekly report check every Tuesday 8am)
	handlers.StartWeeklyReportScheduler()

	// Recordatorio preventivo antes del vencimiento del reporte semanal (viernes 12:00)
	handlers.StartReportReminderScheduler()

	// Cola de notificaciones por email (Resend) — no-op si no hay API key configurada
	handlers.StartNotificationQueueWorker()

	// Borrado automático de datos de tenants cancelados (30 días de gracia)
	handlers.StartTenantPurgeScheduler()

	// Start Telegram channel ingestion for the Music module (no-op if unconfigured)
	handlers.StartTelegramIngestion()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Server starting on port %s", port)
	e.Logger.Fatal(e.Start(":" + port))
}
