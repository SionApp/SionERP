package main

import (
	"backend-sion/config"
	"backend-sion/handlers"
	appMiddleware "backend-sion/middleware"
	"backend-sion/routes"
	"backend-sion/services"
	"log"
	"os"
	"time"

	sentry "github.com/getsentry/sentry-go"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

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

	// Middleware
	e.Use(middleware.Logger())
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
		AllowOrigins:     []string{"*"}, // En producción, especificar orígenes permitidos
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
