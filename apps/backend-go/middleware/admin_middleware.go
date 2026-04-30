package middleware

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireAdmin middleware ensures only users with 'admin' or 'owner' role can access the route
func RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Check if has_admin_access flag is set (from auth middleware)
		hasAdminAccess := c.Get("has_admin_access")
		if hasAdminAccess != nil {
			if hasAccess, ok := hasAdminAccess.(bool); ok && hasAccess {
				return next(c)
			}
		}

		// Fallback: check db_role and email directly
		userRole := c.Get("db_role")
		userEmail := c.Get("email")

		if userRole == nil && userEmail == nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "Authentication required")
		}

		// Check if user has admin access
		role, _ := userRole.(string)
		email, _ := userEmail.(string)

		if !hasAdminAccessHelper(email, role) {
			log.Printf("🚫 ADMIN DENIED: user_id=%v email=%v role=%s tried to access %s %s",
				c.Get("user_id"), email, role, c.Request().Method, c.Request().URL.Path)

			LogAccessDeniedSimple(c,
				c.Get("user_id").(string), email, role, 0, 5,
				"insufficient_role", "Admin access required",
			)

			return echo.NewHTTPError(http.StatusForbidden, "Admin access required")
		}

		return next(c)
	}
}

// hasAdminAccessHelper checks if a user has admin access
// Returns true if role == "admin" or "owner"
func hasAdminAccessHelper(_, role string) bool {
	return role == "admin" || role == "owner"
}
