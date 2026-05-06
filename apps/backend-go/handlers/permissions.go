package handlers

import (
	"backend-sion/config"
	"backend-sion/middleware"
	"backend-sion/utils"
	"log"
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

	// Get user role and super admin status
	var role string
	var isSuperAdmin bool
	err := config.GetDB().DB.QueryRow("SELECT role, COALESCE(is_super_admin, false) FROM users WHERE id = $1", userID).Scan(&role, &isSuperAdmin)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "User not found",
		})
	}

	// Get role level
	roleLevel := utils.GetRoleLevel(role)

	// Get installed modules from the `modules` table
	modules := []string{}
	rows, err := config.GetDB().DB.Query(`
		SELECT key FROM modules WHERE is_installed = true ORDER BY key
	`)
	if err != nil {
		// Log the error and return 500 so the frontend knows something went wrong
		log.Printf("❌ Error querying modules table: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to fetch installed modules",
			"details": err.Error(),
		})
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err == nil {
			modules = append(modules, key)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("❌ Error iterating modules rows: %v", err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"role":              role,
		"role_level":        roleLevel,
		"has_admin_access":  middleware.HasAdminAccess(role, isSuperAdmin),
		"installed_modules": modules,
	})
}
