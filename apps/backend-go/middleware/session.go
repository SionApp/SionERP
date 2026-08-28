// Package middleware — SessionGuard: sesión única activa + vencimiento por
// inactividad. Corre DESPUÉS de SupabaseAuth (necesita user_id del contexto) y
// es independiente de TenantTx: chequea active_sessions por el pool global,
// scopeando explícito por user_id.
//
// Contrato con el frontend:
//   - Al loguearse, el cliente hace POST /auth/session/claim con un session_id
//     propio (uuid en localStorage). Eso pisa la fila del usuario → el
//     dispositivo anterior deja de coincidir.
//   - En cada request el cliente manda X-Session-Id. Si no coincide con la fila
//     activa → 401 SESSION_SUPERSEDED (otro dispositivo tomó la sesión). Si la
//     fila quedó inactiva > sessionIdleGraceMin → 401 SESSION_EXPIRED.
//
// El enforcement SOLO aplica cuando el header viene presente: así un cliente
// viejo (pre-deploy, sin el header) no queda pateado de golpe — el kill real
// cross-device lo maneja igual la suscripción Realtime del cliente nuevo.
package middleware

import (
	"net/http"
	"strings"

	"backend-sion/config"

	"github.com/labstack/echo/v4"
)

// sessionIdleGraceMin: minutos de inactividad tras los cuales el backstop del
// server invalida la sesión. El enforcer preciso de "30 min sin actividad de
// usuario" es el timer del cliente; acá dejamos un margen (35) para no cortar
// en carreras contra ese timer. last_seen lo bumpea este mismo guard con el
// tráfico real de la app.
const sessionIdleGraceMin = 35

func SessionGuard() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Sesión federada (BonDev): no tiene active_sessions, saltear.
			if isFederated, _ := c.Get("is_federated").(bool); isFederated {
				return next(c)
			}
			// El propio claim no puede ser bloqueado por la sesión vieja: es
			// justamente el request que toma la sesión.
			if strings.HasSuffix(c.Path(), "/auth/session/claim") {
				return next(c)
			}

			userID, _ := c.Get("user_id").(string)
			sessionID := c.Request().Header.Get("X-Session-Id")
			if userID == "" || sessionID == "" {
				return next(c) // sin header no hay enforcement (cliente viejo)
			}

			db := config.GetDB()
			if db == nil || db.DB == nil {
				return next(c)
			}

			var activeID string
			var stale bool
			err := db.DB.QueryRow(`
				SELECT session_id, (last_seen_at < now() - make_interval(mins => $2))
				FROM active_sessions WHERE user_id = $1
			`, userID, sessionIdleGraceMin).Scan(&activeID, &stale)
			if err != nil {
				// No hay fila todavía (sesión no reclamada) → dejar pasar; el
				// claim la creará. Cualquier otro error tampoco debe tumbar el
				// request real.
				return next(c)
			}

			if stale {
				_, _ = db.DB.Exec(`DELETE FROM active_sessions WHERE user_id = $1`, userID)
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "sesión vencida por inactividad",
					"code":  "SESSION_EXPIRED",
				})
			}
			if activeID != sessionID {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "se inició sesión en otro dispositivo",
					"code":  "SESSION_SUPERSEDED",
				})
			}

			// Coincide y está viva → bumpear last_seen (throttle 1 min).
			_, _ = db.DB.Exec(`
				UPDATE active_sessions SET last_seen_at = now()
				WHERE user_id = $1 AND last_seen_at < now() - interval '1 minute'
			`, userID)
			return next(c)
		}
	}
}
