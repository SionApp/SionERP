package middleware

import (
	"backend-sion/config"
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireModule middleware checks if a specific module is installed
func RequireModule(moduleKey string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			db := config.GetDB()
			var isInstalled bool
			err := db.DB.QueryRow("SELECT is_installed FROM modules WHERE key = $1", moduleKey).Scan(&isInstalled)

			if err != nil {
				if err == sql.ErrNoRows {
					// Module unknown, deny by default
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
