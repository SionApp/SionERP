package middleware

import (
	"backend-sion/utils"
	"fmt"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireRole middleware checks if the authenticated user's role level
// meets the minimum required level.
//
// Role hierarchy:
//
//	admin/owner = 5, pastor = 4, staff = 3,
//	supervisor = 2, server = 1, member = 0
func RequireRole(minLevel int) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// db_role is set by SupabaseAuth / OptionalAuth middleware
			roleVal := c.Get("db_role")
			if roleVal == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error":   "Authentication required",
					"message": "You must be authenticated to access this resource",
				})
			}

			role, ok := roleVal.(string)
			if !ok || role == "" {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error":   "Access denied",
					"message": "Could not determine your role",
				})
			}

			roleLevel := utils.GetRoleLevel(role)
			if roleLevel < minLevel {
				userID := c.Get("user_id")
				email := c.Get("email")
				log.Printf("🚫 ACCESS DENIED: user=%v email=%v role=%s(level=%d) tried to access %s %s (requires level %d)",
					userID, email, role, roleLevel, c.Request().Method, c.Request().URL.Path, minLevel)

				LogAccessDeniedSimple(c,
					userID.(string), email.(string), role, roleLevel, minLevel,
					"insufficient_role",
					fmt.Sprintf("Role '%s' level %d, required %d", role, roleLevel, minLevel),
				)

				return c.JSON(http.StatusForbidden, map[string]string{
					"error":       "Insufficient role level",
					"message":     fmt.Sprintf("This action requires role level %d or higher. Your role '%s' has level %d.", minLevel, role, roleLevel),
					"role":        role,
					"role_level":  fmt.Sprintf("%d", roleLevel),
					"min_level":   fmt.Sprintf("%d", minLevel),
				})
			}

			return next(c)
		}
	}
}
