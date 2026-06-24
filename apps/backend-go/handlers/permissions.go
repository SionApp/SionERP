package handlers

import (
	"backend-sion/config"
	"backend-sion/middleware"
	"backend-sion/utils"
	"database/sql"
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

// GetModuleRole returns the current user's role level in a specific module.
//
// Query param:
//   - module (required): module key, e.g. "discipleship", "events"
//
// Responses:
//   - 200 {module, role_level, role_name, is_admin}  — role found
//   - 404 {error: "no_module_role", module}           — user has no role in this module
//   - 400 {error}                                     — missing module param
func (h *PermissionsHandler) GetModuleRole(c echo.Context) error {
	moduleKey := c.QueryParam("module")
	if moduleKey == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "'module' query param is required",
		})
	}

	// Bypass EXCLUSIVO para pastor y admin — el staff tiene su propio rol de módulo.
	// has_admin_access incluye staff (acceso ERP), pero para el módulo queremos el nivel real.
	dbRole, _ := c.Get("db_role").(string)
	isSuperAdmin, _ := c.Get("is_super_admin").(bool)
	if isSuperAdmin || dbRole == utils.RolePastor || dbRole == utils.RoleAdmin {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"module":     moduleKey,
			"role_level": 5,
			"role_name":  "Pastoral",
			"is_admin":   true,
		})
	}

	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User ID not found in context",
		})
	}

	db := config.GetDB()
	var roleLevel int
	var roleName sql.NullString
	err := db.DB.QueryRow(
		`SELECT role_level, role_name FROM module_user_roles
		 WHERE user_id = $1 AND module_key = $2
		 LIMIT 1`,
		userID, moduleKey,
	).Scan(&roleLevel, &roleName)

	if err == sql.ErrNoRows {
		// Fallback para discipleship: si el usuario tiene nivel en discipleship_hierarchy,
		// ese nivel es su acceso al módulo (coordinadora nivel 4, supervisor nivel 3, etc.)
		if moduleKey == "discipleship" {
			var hierarchyLevel int
			fallbackErr := db.DB.QueryRow(
				`SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1 LIMIT 1`,
				userID,
			).Scan(&hierarchyLevel)
			if fallbackErr == nil && hierarchyLevel > 0 {
				levelNames := map[int]string{1: "Líder", 2: "Supervisor Auxiliar", 3: "Supervisor General", 4: "Coordinador", 5: "Pastoral"}
				return c.JSON(http.StatusOK, map[string]interface{}{
					"module":     moduleKey,
					"role_level": hierarchyLevel,
					"role_name":  levelNames[hierarchyLevel],
					"is_admin":   false,
				})
			}
		}
		return c.JSON(http.StatusNotFound, map[string]string{
			"error":  "no_module_role",
			"module": moduleKey,
		})
	}
	if err != nil {
		log.Printf("❌ Error querying module_user_roles [module=%s, user=%s]: %v", moduleKey, userID, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al consultar rol de módulo",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"module":     moduleKey,
		"role_level": roleLevel,
		"role_name":  roleName.String,
		"is_admin":   false,
	})
}
