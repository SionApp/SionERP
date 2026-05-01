package handlers

import (
	"backend-sion/config"
	"backend-sion/utils"
	"net/http"

	"github.com/labstack/echo/v4"
)

// PermissionsHandler handles permission-related endpoints
type PermissionsHandler struct{}

// NewPermissionsHandler creates a new PermissionsHandler
func NewPermissionsHandler() *PermissionsHandler {
	return &PermissionsHandler{}
}

// GetMyPermissions returns the current user's role level and accessible modules
func (h *PermissionsHandler) GetMyPermissions(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User ID not found in context",
		})
	}

	// Get user role
	var role string
	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "User not found",
		})
	}

	// Get role level
	roleLevel := utils.GetRoleLevel(role)

	// Get installed modules from the `modules` table
	var modules []string
	rows, err := config.GetDB().DB.Query(`
		SELECT key FROM modules WHERE is_installed = true ORDER BY key
	`)
	if err != nil {
		// If table doesn't exist or error, return empty modules
		modules = []string{}
	} else {
		defer rows.Close()
		for rows.Next() {
			var key string
			if err := rows.Scan(&key); err == nil {
				modules = append(modules, key)
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"role":              role,
		"role_level":        roleLevel,
		"installed_modules": modules,
	})
}
