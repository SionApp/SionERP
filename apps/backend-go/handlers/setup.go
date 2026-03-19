package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type SetupHandler struct{}

func NewSetupHandler() *SetupHandler {
	return &SetupHandler{}
}

// hasAnyAdmin checks if there is any admin user in the system
// Returns true if:
//   - There is a user with role = 'admin' OR
func hasAnyAdmin(db *config.Database) (bool, error) {
	var adminCount int
	err := db.DB.QueryRow(`
		SELECT COUNT(*) FROM users 
		WHERE role = 'admin'
	`).Scan(&adminCount)
	if err != nil {
		return false, err
	}
	return adminCount > 0, nil
}

// hasAdminAccessFromContext checks if the current user has admin access
// Uses the has_admin_access flag from context or falls back to checking db_role and email
func hasAdminAccessFromContext(c echo.Context) bool {
	// Check if has_admin_access flag is set (from auth middleware)
	hasAdminAccess := c.Get("has_admin_access")
	if hasAdminAccess != nil {
		if hasAccess, ok := hasAdminAccess.(bool); ok && hasAccess {
			return true
		}
	}

	// Fallback: check db_role and email directly
	userRole := c.Get("db_role")
	userEmail := c.Get("email")

	role, _ := userRole.(string)
	email, _ := userEmail.(string)

	return hasAdminAccessHelper(email, role)
}

// hasAdminAccessHelper checks if a user has admin access
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

// GetSetupStatus returns the list of available modules
// Access: Public if no users exist (initial setup), Admin-only otherwise
func (h *SetupHandler) GetSetupStatus(c echo.Context) error {
	db := config.GetDB()

	// Check if ANY user exists (for initial setup detection)
	var userCount int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error checking user status: " + err.Error(),
		})
	}

	isInitialized := userCount > 0

	// Check if there is any admin user
	hasAdmin, err := hasAnyAdmin(db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error checking admin status: " + err.Error(),
		})
	}

	// Fetch modules
	var modules []models.Module
	rows, err := db.DB.Query("SELECT key, name, description, is_installed, installed_at FROM modules ORDER BY name")
	if err != nil {
		// If table doesn't exist, it might be a fresh install without migration run yet.
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error fetching modules: " + err.Error(),
		})
	}
	defer rows.Close()

	for rows.Next() {
		var m models.Module
		if err := rows.Scan(&m.Key, &m.Name, &m.Description, &m.IsInstalled, &m.InstalledAt); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Error scanning modules",
			})
		}
		modules = append(modules, m)
	}

	return c.JSON(http.StatusOK, models.SetupStatusResponse{
		IsInitialized: isInitialized,
		HasAdmin:      hasAdmin,
		Modules:       modules,
	})
}

// PerformSetup creates admin user and installs selected modules
// Access: Public if no users exist (initial setup), Admin-only otherwise
// Also allows creating admin if no admin exists even if system is initialized
func (h *SetupHandler) PerformSetup(c echo.Context) error {
	var req models.SetupRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	db := config.GetDB()

	// Check if system is already initialized
	var userCount int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error checking user status: " + err.Error(),
		})
	}

	isInitialized := userCount > 0

	// Check if there is any admin user
	hasAdmin, err := hasAnyAdmin(db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error checking admin status: " + err.Error(),
		})
	}

	// If system is initialized and has admin, require admin access for module management
	// But allow creating admin if no admin exists
	if isInitialized && hasAdmin {
		if !hasAdminAccessFromContext(c) {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Authentication required",
			})
		}
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to start transaction"})
	}
	defer tx.Rollback()

	// 1. Create Admin User (if system is NOT initialized OR if no admin exists)
	shouldCreateAdmin := !isInitialized || !hasAdmin
	if shouldCreateAdmin && req.AdminUser.Email != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.AdminUser.PasswordHash), bcrypt.DefaultCost)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error hashing password"})
		}

		// Ensure vital fields
		if req.AdminUser.Role == "" {
			req.AdminUser.Role = "admin"
		}

		queryUser := `
			INSERT INTO users (
				first_name, last_name, email, password_hash, role, is_active, created_at, updated_at,
				id_number, phone, address, birth_date, marital_status, occupation, education_level, how_found_church, ministry_interest
			) VALUES (
				$1, $2, $3, $4, $5, true, NOW(), NOW(),
				'N/A', 'N/A', 'N/A', NOW(), 'single', 'N/A', 'N/A', 'Setup', 'N/A' 
			) RETURNING id`

		var newUserId string
		err = tx.QueryRow(queryUser,
			req.AdminUser.FirstName,
			req.AdminUser.LastName,
			req.AdminUser.Email,
			string(hashedPassword),
			req.AdminUser.Role,
		).Scan(&newUserId)

		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Error creating admin user: " + err.Error()})
		}
	} else if shouldCreateAdmin && req.AdminUser.Email == "" {
		// Admin creation required but no admin data provided
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Admin user data is required to create the first administrator",
		})
	}

	// 2. Install Selected Modules
	// First enable base module always
	_, err = tx.Exec("UPDATE modules SET is_installed = true, installed_at = NOW() WHERE key = 'base'")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error enabling base module"})
	}

	// Disable all non-base modules that are NOT selected.
	// This ensures that sending selected_modules: [] will disable all optional modules.
	_, err = tx.Exec(
		"UPDATE modules SET is_installed = false, installed_at = NULL WHERE key <> 'base' AND key <> ALL($1)",
		pq.Array(req.SelectedModules),
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error disabling unselected modules"})
	}

	if len(req.SelectedModules) > 0 {
		// Update selected modules
		// Using a loop for simplicity, or could build a WHERE IN query
		for _, modKey := range req.SelectedModules {
			// Never allow disabling/enabling base through selected list
			if modKey == "base" {
				continue
			}
			_, err := tx.Exec("UPDATE modules SET is_installed = true, installed_at = NOW() WHERE key = $1", modKey)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error installing module " + modKey})
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "System setup completed successfully"})
}

// UpdateModuleStatus actualiza el estado de instalación de un módulo
func (h *SetupHandler) UpdateModuleStatus(c echo.Context) error {
	moduleKey := c.Param("key")

	var req struct {
		IsInstalled bool `json:"is_installed"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	// Prevent disabling base module
	if moduleKey == "base" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Cannot disable base module",
		})
	}

	db := config.GetDB()

	var query string
	if req.IsInstalled {
		query = "UPDATE modules SET is_installed = true, installed_at = NOW() WHERE key = $1"
	} else {
		query = "UPDATE modules SET is_installed = false, installed_at = NULL WHERE key = $1"
	}

	result, err := db.DB.Exec(query, moduleKey)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error updating module: " + err.Error(),
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Module not found",
		})
	}

	// Registrar el cambio en audit_logs
	userID, _ := c.Get("user_id").(string)
	if userID == "" {
		userID = "system"
	}
	newValues := fmt.Sprintf(`{"is_installed": %v}`, req.IsInstalled)
	_, _ = db.DB.Exec(
		`INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by, changed_at)
		 VALUES ('modules', $1, 'UPDATE', $2::jsonb, $3, NOW())`,
		moduleKey, newValues, userID,
	)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Module updated successfully",
	})
}
