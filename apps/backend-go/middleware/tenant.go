// Package middleware — TenantTx middleware for per-request church isolation.
// Phase 0: defined and compiling; registered on the protected group but INERT
// when church_id is absent (returns 403 only after Phase 2 backfills the JWT).
// In Phase 0 the only users in production have no church_id in their JWT yet,
// so the middleware would always 403.  For that reason we leave it registered
// here but the real enforcement begins when Phase 2 backfills JWT app_metadata.
//
// TODO(phase 2): remove the early-return no-op once all JWTs carry church_id.
// TODO(phase 3): validateDB must be redefined to call config.Tx(c) so handlers
//
//	actually use the tenant-scoped transaction.
package middleware

import (
	"net/http"

	"backend-sion/config"

	"github.com/labstack/echo/v4"
)

// TenantTx returns an Echo middleware that:
//  1. Reads church_id from the Echo context (stashed by SupabaseAuth).
//  2. Opens a *sql.Tx on the global pool.
//  3. Calls set_config('app.current_church_id', churchID, true) inside the tx
//     (the third arg = is_local = true, making it tx-scoped and pooler-safe).
//  4. Stashes the *sql.Tx on the context under config.TxKey so handlers can
//     retrieve it via config.Tx(c).
//  5. Commits on 2xx/3xx; rolls back otherwise.
//
// Phase 0 constraint: if church_id is absent from the context (all current
// users before Phase 2 JWT backfill), the middleware is a no-op pass-through
// so existing single-tenant behaviour is unchanged.
func TenantTx() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			churchID, _ := c.Get("church_id").(string)

			// ponytail: Phase 0 pass-through — remove this block in Phase 2
			// once all JWTs carry app_metadata.church_id.
			if churchID == "" {
				return next(c)
			}

			tx, err := config.GetDB().DB.BeginTx(c.Request().Context(), nil)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "failed to begin transaction",
				})
			}

			// set_config is parameterised — avoids string interpolation / GUC injection.
			// true = is_local → GUC is scoped to the current transaction only (pooler-safe).
			if _, err := tx.ExecContext(c.Request().Context(),
				"SELECT set_config('app.current_church_id', $1, true)", churchID); err != nil {
				_ = tx.Rollback()
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "failed to set tenant context",
				})
			}

			c.Set(config.TxKey(), tx)

			handlerErr := next(c)

			// Commit on success (2xx/3xx); rollback on any error or 4xx/5xx.
			if handlerErr != nil || c.Response().Status >= http.StatusBadRequest {
				_ = tx.Rollback()
				return handlerErr
			}
			if commitErr := tx.Commit(); commitErr != nil {
				return commitErr
			}
			return nil
		}
	}
}
