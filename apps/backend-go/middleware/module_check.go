package middleware

import (
	"backend-sion/config"
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireModule middleware checks if a specific module is installed for the
// authenticated user's church. `modules`' primary key is (church_id, key) —
// querying by key alone returns an arbitrary church's row, which either
// wrongly grants or wrongly denies access depending on row order. church_id
// comes from the auth middleware context (see auth.go); if it's missing we
// fail closed (403) instead of silently falling back to an unscoped query.
func RequireModule(moduleKey string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			churchID, _ := c.Get("church_id").(string)
			if churchID == "" {
				userID := c.Get("user_id")
				email := c.Get("email")
				log.Printf("🚫 MODULE DENIED: user=%v email=%v tried to access module '%s' via %s %s (no church_id in context)",
					userID, email, moduleKey, c.Request().Method, c.Request().URL.Path)
				return c.JSON(http.StatusForbidden, map[string]string{
					"error":   "Module access denied",
					"message": "No se pudo determinar tu iglesia",
				})
			}

			db := config.GetDB()
			var isInstalled bool
			err := db.DB.QueryRow(
				"SELECT is_installed FROM modules WHERE church_id = $1 AND key = $2",
				churchID, moduleKey,
			).Scan(&isInstalled)

			if err != nil {
				if err == sql.ErrNoRows {
					// Module unknown for this church, deny by default
					return c.JSON(http.StatusForbidden, map[string]string{
						"error":   "Module access denied",
						"message": "Module '" + moduleKey + "' is not recognized",
					})
				}
				// DB Error
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Internal Error checking module status",
				})
			}

			if !isInstalled {
				userID := c.Get("user_id")
				email := c.Get("email")
				log.Printf("🚫 MODULE DENIED: user=%v email=%v tried to access module '%s' via %s %s",
					userID, email, moduleKey, c.Request().Method, c.Request().URL.Path)

				LogAccessDeniedSimple(c,
					userID.(string), email.(string), "", 0, 0,
					"module_not_installed",
					fmt.Sprintf("Module '%s' not installed", moduleKey),
				)

				return c.JSON(http.StatusForbidden, map[string]string{
					"error":   "Module not installed",
					"message": "The module '" + moduleKey + "' is not enabled in this system. Please contact your administrator.",
				})
			}

			return next(c)
		}
	}
}
