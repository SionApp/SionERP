package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireAdmin middleware ensures only users with 'admin' role can access the route
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
			return echo.NewHTTPError(http.StatusForbidden, "Admin access required")
		}

		return next(c)
	}
}

// hasAdminAccessHelper checks if a user has admin access
// Returns true if:
//   - role == "admin" OR
//   - email == "boanegro4@yopmail.com" (special admin access)
func hasAdminAccessHelper(email, role string) bool {
	if role == "admin" {
		return true
	}
	// Special admin access for specific email
	if email == "boanegro4@yopmail.com" {
		return true
	}
	return false
}
