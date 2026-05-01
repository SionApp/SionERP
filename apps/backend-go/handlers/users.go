// Package handlers contiene los controladores para manejar las solicitudes HTTP relacionadas con usuarios.
package handlers

import (
	"backend-sion/config"
	"backend-sion/database"
	"backend-sion/models"
	"backend-sion/utils"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type UserHandler struct{}

var validate = validator.New()

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// getUserRoleLevel returns the role level for a given user ID, or -1 if not found
func getUserRoleLevel(userID string) int {
	var role string
	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
	if err != nil {
		return -1
	}
	return utils.GetRoleLevel(role)
}

// GetUsers obtiene la lista de usuarios con su estado de invitación
// Applies resource-level filtering based on the requesting user's role:
//   - admin/pastor: all users
//   - staff: all users except admin/owner
//   - supervisor: only users assigned to them (same cell_leader_id or zone)
//   - server/member: only their own profile
func (h *UserHandler) GetUsers(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	// Get requesting user's role for resource-level filtering
	requestingUserID := c.Get("user_id").(string)
	var requestingRole string
	err = db.DB.QueryRow("SELECT role FROM users WHERE id = $1", requestingUserID).Scan(&requestingRole)
	if err != nil {
		c.Logger().Error("Error fetching requesting user role:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "Error verifying permissions",
		})
	}

	requestingRoleLevel := utils.GetRoleLevel(requestingRole)

	query := `
		SELECT
			u.id, u.auth_id, u.first_name, u.last_name, u.id_number, u.email, u.phone, u.address,
			u.birth_date, u.marital_status, u.occupation, u.education_level,
			u.how_found_church, u.ministry_interest, u.first_visit_date,
			u.baptized, u.baptism_date, u.is_active_member, u.membership_date,
			u.cell_group, u.cell_leader_id, u.role, u.pastoral_notes, u.is_active,
			u.discipleship_level,
			u.whatsapp, u.created_at, u.updated_at,
			i.status as invitation_status,
			COALESCE(u.zone_id::text, '') as zone_id,
			COALESCE(z.name, '') as zone_name,
			u.onboarding_completed
		FROM users u
		LEFT JOIN user_invitations i ON u.email = i.email
			AND i.status IN ('pending', 'accepted')
		LEFT JOIN zones z ON u.zone_id = z.id
		WHERE u.is_active = true
	`

	args := []interface{}{}
	argCount := 0

	// ── Resource-level filtering ──
	switch requestingRoleLevel {
	case 5, 4: // admin, pastor → see all users
		// No additional filter
	case 3: // staff → cannot see admin/owner
		argCount++
		query += fmt.Sprintf(" AND u.role NOT IN ($%d)", argCount)
		args = append(args, "admin")
		argCount++
		query += fmt.Sprintf(" AND u.role NOT IN ($%d)", argCount)
		args = append(args, "owner")
	case 2: // supervisor → only see their subordinates (cell_leader_id = their ID or same zone)
		argCount++
		query += fmt.Sprintf(" AND (u.cell_leader_id = $%d OR u.zone_id = (SELECT zone_id FROM users WHERE id = $1))", argCount)
		args = append(args, requestingUserID)
	default: // server/member → only their own profile
		argCount++
		query += fmt.Sprintf(" AND u.id = $%d", argCount)
		args = append(args, requestingUserID)
	}

	// Optional role filter (only applies within the resource-level constraint)
	roleParam := c.QueryParam("role")
	if roleParam != "" {
		rolesStr := strings.Split(roleParam, ",")
		roles := make([]string, 0, len(rolesStr))
		for _, r := range rolesStr {
			trimmed := strings.TrimSpace(r)
			if trimmed != "" {
				roles = append(roles, trimmed)
			}
		}
		if len(roles) > 0 {
			inPlaceholders := make([]string, len(roles))
			for i := range roles {
				argCount++
				inPlaceholders[i] = fmt.Sprintf("$%d", argCount)
				args = append(args, roles[i])
			}
			query += fmt.Sprintf(" AND u.role IN (%s)", strings.Join(inPlaceholders, ","))
		}
	}

	query += " ORDER BY u.created_at DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Database query error in GetUsers: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error fetching users from database",
			"message": err.Error(),
			"details": "Failed to execute query",
		})
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.AuthID, &user.FirstName, &user.LastName, &user.IdNumber, &user.Email,
			&user.Phone, &user.Address, &user.BirthDate, &user.MaritalStatus,
			&user.Occupation, &user.EducationLevel, &user.HowFoundChurch,
			&user.MinistryInterest, &user.FirstVisitDate, &user.Baptized,
			&user.BaptismDate, &user.IsActiveMember, &user.MembershipDate,
			&user.CellGroup, &user.CellLeaderID, &user.Role, &user.PastoralNotes,
			&user.IsActive, &user.DiscipleshipLevel, &user.WhatsApp, &user.CreatedAt, &user.UpdatedAt,
			&user.InvitationStatus,
			&user.ZoneID,
			&user.ZoneName,
			&user.OnboardingCompleted,
		)
		if err != nil {
			c.Logger().Error("Row scan error in GetUsers: ", err)
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error":   "Error scanning user data",
				"message": err.Error(),
				"details": "Column count mismatch or type conversion error",
			})
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		c.Logger().Error("Rows iteration error in GetUsers: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error iterating through results",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"users": users,
		"total": len(users),
	})
}

func (h *UserHandler) GetUser(c echo.Context) error {
	userID := c.Param("id")
	currentUserID := c.Get("user_id").(string)

	// Get requesting user's role for resource-level filtering
	var requestingRole string
	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", currentUserID).Scan(&requestingRole)
	if err != nil {
		c.Logger().Error("Error fetching requesting user role:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "Error verifying permissions",
		})
	}
	requestingRoleLevel := utils.GetRoleLevel(requestingRole)

	// Enforce resource-level access
	if requestingRoleLevel < 3 && currentUserID != userID {
		// server/member can only see themselves; supervisor can only see their subordinates
		if requestingRoleLevel <= 1 {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"error":   "Access denied",
				"message": "You can only view your own profile",
			})
		}
		// Check if supervisor has access to this user
		var cellLeaderID, userZoneID sql.NullString
		err = config.GetDB().DB.QueryRow(
			"SELECT cell_leader_id, zone_id FROM users WHERE id = $1", userID,
		).Scan(&cellLeaderID, &userZoneID)
		if err != nil {
			return c.JSON(http.StatusNotFound, map[string]interface{}{
				"error":   "User not found",
				"message": "The requested user does not exist",
			})
		}
		if cellLeaderID.String != currentUserID {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"error":   "Access denied",
				"message": "You can only view users assigned to you",
			})
		}
	}

	query := `
		SELECT id, first_name, last_name, id_number, email, phone, address,
			   birth_date, marital_status, occupation, education_level,
			   how_found_church, ministry_interest, first_visit_date,
			   baptized, baptism_date, is_active_member, membership_date,
			   cell_group, cell_leader_id, role, pastoral_notes, is_active,
			   whatsapp,created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user models.User
	err = config.GetDB().DB.QueryRow(query, userID).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.IdNumber, &user.Email,
		&user.Phone, &user.Address, &user.BirthDate, &user.MaritalStatus,
		&user.Occupation, &user.EducationLevel, &user.HowFoundChurch,
		&user.MinistryInterest, &user.FirstVisitDate, &user.Baptized,
		&user.BaptismDate, &user.IsActiveMember, &user.MembershipDate,
		&user.CellGroup, &user.CellLeaderID, &user.Role, &user.PastoralNotes,
		&user.IsActive, &user.WhatsApp, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			c.Logger().Warn(fmt.Sprintf("User not found with ID: %s", userID))
			return c.JSON(http.StatusNotFound, map[string]interface{}{
				"error":   "User not found",
				"message": fmt.Sprintf("No user exists with ID: %s", userID),
			})
		}
		c.Logger().Error("Database error in GetUser: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error fetching user",
			"message": err.Error(),
			"details": "Database query or scan error",
		})
	}
	return c.JSON(http.StatusOK, user)
}

// CreateUser crea un nuevo usuario
func (h *UserHandler) CreateUser(c echo.Context) error {
	var req models.User

	if err := c.Bind(&req); err != nil {
		c.Logger().Error("Bind error in CreateUser: ", err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
			"details": "Failed to parse JSON request body",
		})
	}

	query := `
		INSERT INTO users (
			first_name, last_name, id_number, email, phone, address,
			birth_date, marital_status, occupation, education_level,
			how_found_church, ministry_interest, first_visit_date,
			baptized, baptism_date, is_active_member, membership_date,
			cell_group, role, pastoral_notes, whatsapp
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		) RETURNING id
	`

	var userID string
	err := config.GetDB().DB.QueryRow(
		query, req.FirstName, req.LastName, req.IdNumber, req.Email, req.Phone,
		req.Address, req.BirthDate, req.MaritalStatus, req.Occupation,
		req.EducationLevel, req.HowFoundChurch, req.MinistryInterest, req.FirstVisitDate,
		req.Baptized, req.BaptismDate, req.IsActiveMember, req.MembershipDate,
		req.CellGroup, req.Role, req.PastoralNotes, req.WhatsApp,
	).Scan(&userID)
	if err != nil {
		c.Logger().Error("Database error in CreateUser: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error creating user",
			"message": err.Error(),
			"details": "Failed to insert user into database",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "User created successfully",
		"user_id": userID,
	})
}

func (h *UserHandler) UpdateUser(c echo.Context) error {
	userID := c.Param("id")
	currentUserID := c.Get("user_id").(string)

	var currentUserRole string
	var isCurrentUserSuperAdmin bool
	err := config.GetDB().DB.QueryRow("SELECT role, COALESCE(is_super_admin, false) FROM users WHERE id = $1", currentUserID).Scan(&currentUserRole, &isCurrentUserSuperAdmin)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusUnauthorized, map[string]interface{}{
				"error":   "User not found",
				"message": "You must be a valid user to perform this action",
			})
		}
		c.Logger().Error("Database error fetching user role:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Database error",
			"message": err.Error(),
		})
	}

	// ── Resource-level: cannot edit users above your level ──
	currentUserRoleLevel := utils.GetRoleLevel(currentUserRole)
	targetRoleLevel := getUserRoleLevel(userID)

	// Higher level = more power. If my level is LOWER (less power) than target, I can't edit.
	if currentUserRoleLevel < targetRoleLevel {
		c.Logger().Error("Unauthorized update attempt:", currentUserID, "role_level", currentUserRoleLevel,
			"trying to edit user", userID, "role_level", targetRoleLevel)
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "You cannot edit users with a higher role level than yours",
		})
	}

	// ── System super admin is protected ──
	var isTargetSuperAdmin bool
	config.GetDB().DB.QueryRow("SELECT COALESCE(is_super_admin, false) FROM users WHERE id = $1", userID).Scan(&isTargetSuperAdmin)
	if isTargetSuperAdmin && !isCurrentUserSuperAdmin {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "Cannot modify the system administrator account",
		})
	}

	// server can only edit themselves (lowest role with permissions)
	if currentUserRoleLevel <= utils.LevelServer && currentUserID != userID {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "You can only edit your own profile",
		})
	}

	// supervisor can only edit their subordinates
	if currentUserRoleLevel == utils.LevelSupervisor && currentUserID != userID {
		var cellLeaderID sql.NullString
		config.GetDB().DB.QueryRow("SELECT cell_leader_id FROM users WHERE id = $1", userID).Scan(&cellLeaderID)
		if cellLeaderID.String != currentUserID {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"error":   "Forbidden",
				"message": "You can only edit users assigned to you",
			})
		}
	}

	var req models.UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		c.Logger().Error("Bind error in UpdateUser:", err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if currentUserID != userID && !utils.IsAdminRole(currentUserRole) {
		c.Logger().Error("Unauthorized access in UpdateUser:", currentUserID, "is not allowed to update user", userID)
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "Unauthorized",
			"message": "You are not allowed to update this user",
		})
	}

	if err := validate.Struct(req); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		errorMessages := make(map[string]string)
		for _, fieldError := range validationErrors {
			errorMessages[fieldError.Field()] = fmt.Sprintf("Validation error: %s", fieldError.Error())
		}
		c.Logger().Error("Validation error in UpdateUser:", err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Validation error",
			"message": errorMessages,
		})
	}

	query, args, err := database.BuildUpdateQuery(&req, "users", "id", userID)
	if err != nil {
		c.Logger().Error("Error building update query:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error building update query",
			"message": err.Error(),
		})
	}

	result, err := config.GetDB().DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error(fmt.Sprintf("Database error in UpdateUser for user %s: %v", userID, err))
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error updating user",
			"message": err.Error(),
			"details": "Database update failed",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.Logger().Warn(fmt.Sprintf("No rows affected when updating user %s", userID))
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "User updated successfully",
		"user_id": userID,
		"user":    req,
	})
}

func (h *UserHandler) DeleteUser(c echo.Context) error {
	userID := c.Param("id")
	currentUserID := c.Get("user_id").(string)

	// Cannot delete yourself
	if currentUserID == userID {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid operation",
			"message": "You cannot delete your own account",
		})
	}

	// ── Resource-level: cannot delete users above your level ──
	currentUserRoleLevel := getUserRoleLevel(currentUserID)
	targetRoleLevel := getUserRoleLevel(userID)

	if targetRoleLevel == -1 {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
		})
	}

	if currentUserRoleLevel < targetRoleLevel {
		c.Logger().Error("Unauthorized delete attempt:", currentUserID, "role_level", currentUserRoleLevel,
			"trying to delete user", userID, "role_level", targetRoleLevel)
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "You cannot delete users with a higher role level than yours",
		})
	}

	// ── System super admin is protected ──
	var isTargetSuperAdmin bool
	config.GetDB().DB.QueryRow("SELECT COALESCE(is_super_admin, false) FROM users WHERE id = $1", userID).Scan(&isTargetSuperAdmin)
	if isTargetSuperAdmin {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "Cannot delete the system administrator account",
		})
	}

	// supervisor can only delete their subordinates
	if currentUserRoleLevel == utils.LevelSupervisor {
		var cellLeaderID sql.NullString
		config.GetDB().DB.QueryRow("SELECT cell_leader_id FROM users WHERE id = $1", userID).Scan(&cellLeaderID)
		if cellLeaderID.String != currentUserID {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"error":   "Forbidden",
				"message": "You can only delete users assigned to you",
			})
		}
	}

	// server/member cannot delete anyone
	if currentUserRoleLevel <= utils.LevelServer {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "You do not have permission to delete users",
		})
	}

	query := `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`
	result, err := config.GetDB().DB.Exec(query, userID)

	if err != nil {
		c.Logger().Error(fmt.Sprintf("Database error in UpdateUser for user %s: %v", userID, err))
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Database error",
			"message": err.Error(),
			"details": "Database update failed",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.Logger().Warn(fmt.Sprintf("No rows affected when updating user %s", userID))
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
		})
	}

	c.Logger().Info(fmt.Sprintf("User deleted successfully: target=%s by=%s", userID, currentUserID))
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "User deleted successfully",
		"user_id": userID,
	})
}

func (h *UserHandler) GetCurrentUser(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		c.Logger().Error("Invalid user_id in context")
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "Unauthorized",
			"message": "User ID not found in authentication context",
		})
	}

	// Query by auth_id (JWT sub), fallback to id for backward compatibility
	query := `
		SELECT id, auth_id, first_name, last_name, id_number, email, phone, address,
			   birth_date, marital_status, occupation, education_level,
			   how_found_church, ministry_interest, first_visit_date,
			   baptized, baptism_date, is_active_member, membership_date,
			   cell_group, cell_leader_id, role, pastoral_notes, is_active,
			   whatsapp, created_at, updated_at, emergency_contact_name, emergency_contact_phone,
			   territory, zone_name, active_groups_count, discipleship_level,
			   onboarding_completed
		FROM users
		WHERE auth_id = $1 OR id = $1
	`
	var user models.User
	err := config.GetDB().DB.QueryRow(query, userID).Scan(
		&user.ID, &user.AuthID, &user.FirstName, &user.LastName, &user.IdNumber, &user.Email,
		&user.Phone, &user.Address, &user.BirthDate, &user.MaritalStatus,
		&user.Occupation, &user.EducationLevel, &user.HowFoundChurch,
		&user.MinistryInterest, &user.FirstVisitDate, &user.Baptized,
		&user.BaptismDate, &user.IsActiveMember, &user.MembershipDate,
		&user.CellGroup, &user.CellLeaderID, &user.Role, &user.PastoralNotes,
		&user.IsActive, &user.WhatsApp, &user.CreatedAt, &user.UpdatedAt, &user.EmergencyContactName, &user.EmergencyContactPhone,
		&user.Territory, &user.ZoneName, &user.ActiveGroupsCount, &user.DiscipleshipLevel,
		&user.OnboardingCompleted,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			c.Logger().Warn(fmt.Sprintf("Current user not found in database with ID: %s", userID))
			return c.JSON(http.StatusNotFound, map[string]interface{}{
				"error":   "User not found",
				"message": "Your user profile was not found in the database",
				"user_id": userID,
			})
		}
		c.Logger().Error(fmt.Sprintf("Database error in GetCurrentUser for user %s: %v", userID, err))
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error fetching user profile",
			"message": err.Error(),
			"details": "Database query or scan error - check server logs",
		})
	}

	return c.JSON(http.StatusOK, user)
}

// UpdateCurrentUser actualiza el perfil del usuario actual
func (h *UserHandler) UpdateCurrentUser(c echo.Context) error {
	var req models.UpdateUserRequest

	if err := c.Bind(&req); err != nil {
		c.Logger().Error("Bind error in UpdateCurrentUser: ", err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	userID, ok := c.Get("user_id").(string)
	if !ok {
		c.Logger().Error("Invalid user_id in context")
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "Unauthorized",
			"message": "User ID not found in authentication context",
		})
	}

	query, args, err := database.BuildUpdateQuery(&req, "users", "id", userID)
	if err != nil {
		c.Logger().Error(fmt.Sprintf("Database error in UpdateCurrentUser for user %s: %v", userID, err))
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error updating user profile",
			"message": err.Error(),
			"details": "Database update failed",
		})
	}

	result, err := config.GetDB().DB.Exec(query, args...)

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.Logger().Warn(fmt.Sprintf("No rows affected when updating user %s: %v", userID, err))
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
		})
	}
	c.Logger().Info(fmt.Sprintf("Profile updated successfully with ID: %s", userID))
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Profile updated successfully",
		"user_id": userID,
		"user":    req,
	})
}

// CompleteOnboarding marks the user as having completed their onboarding
func (h *UserHandler) CompleteOnboarding(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		c.Logger().Error("Invalid user_id in context")
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "Unauthorized",
			"message": "User ID not found in authentication context",
		})
	}

	var req struct {
		FirstName *string `json:"first_name,omitempty"`
		LastName  *string `json:"last_name,omitempty"`
		Phone     *string `json:"phone,omitempty"`
		Address   *string `json:"address,omitempty"`
		IdNumber  *string `json:"id_number,omitempty"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	// Build dynamic update query with onboarding_completed
	updates := []string{"onboarding_completed = true", "updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1

	if req.FirstName != nil && *req.FirstName != "" {
		updates = append(updates, fmt.Sprintf("first_name = $%d", argIdx))
		args = append(args, *req.FirstName)
		argIdx++
	}
	if req.LastName != nil && *req.LastName != "" {
		updates = append(updates, fmt.Sprintf("last_name = $%d", argIdx))
		args = append(args, *req.LastName)
		argIdx++
	}
	if req.Phone != nil && *req.Phone != "" {
		updates = append(updates, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, *req.Phone)
		argIdx++
	}
	if req.Address != nil && *req.Address != "" {
		updates = append(updates, fmt.Sprintf("address = $%d", argIdx))
		args = append(args, *req.Address)
		argIdx++
	}
	if req.IdNumber != nil && *req.IdNumber != "" {
		updates = append(updates, fmt.Sprintf("id_number = $%d", argIdx))
		args = append(args, *req.IdNumber)
		argIdx++
	}

	args = append(args, userID)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(updates, ", "), argIdx)

	result, err := config.GetDB().DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error(fmt.Sprintf("Database error in CompleteOnboarding for user %s: %v", userID, err))
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error completing onboarding",
			"message": err.Error(),
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Onboarding completed successfully",
		"user_id": userID,
	})
}

// CreateUserDirect creates a user with a password directly (no invitation link)
// Used by admins to create users without email/SMTP
func (h *UserHandler) CreateUserDirect(c echo.Context) error {
	currentUserID := c.Get("user_id").(string)

	var currentUserRole string
	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", currentUserID).Scan(&currentUserRole)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "User not found",
			"message": "You must be a valid user to perform this action",
		})
	}

	if currentUserRole != utils.RolePastor && currentUserRole != utils.RoleStaff && currentUserRole != "admin" {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"error":   "Forbidden",
			"message": "Only admin, pastor, or staff can create users directly",
		})
	}

	var req struct {
		Email     string `json:"email" validate:"required,email"`
		Password  string `json:"password" validate:"required,min=6"`
		FirstName string `json:"first_name" validate:"required,min=2"`
		LastName  string `json:"last_name" validate:"required,min=2"`
		Role      string `json:"role" validate:"required"`
		Phone     string `json:"phone,omitempty"`
		IdNumber  string `json:"id_number,omitempty"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Validation error",
			"message": err.Error(),
		})
	}

	supabase := config.NewSupabaseClient()

	// Check if user already exists in public.users (data without login access)
	var existingUserID, existingRole string
	err = config.GetDB().DB.QueryRow(
		"SELECT id, role FROM users WHERE email = $1", req.Email,
	).Scan(&existingUserID, &existingRole)

	if err == nil {
		// User exists in public.users — check if they already have auth access
		authUser, authErr := supabase.GetUserByEmail(req.Email)
		if authErr == nil && authUser != nil {
			// User already has login access
			return c.JSON(http.StatusConflict, map[string]interface{}{
				"error":   "User already has access",
				"message": fmt.Sprintf("%s ya tiene acceso al sistema. Podés cambiar su rol desde la gestión de usuarios.", req.Email),
			})
		}

		// User exists in public.users but has NO auth access — grant them access
		// Create auth account (Supabase will assign a new auth ID)
		authUser, err = supabase.CreateUserWithEmailPassword(req.Email, req.Password, map[string]interface{}{
			"first_name": req.FirstName,
			"last_name":  req.LastName,
			"role":       req.Role,
		})
		if err != nil {
			c.Logger().Error("Failed to create auth for existing user:", err)
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error":   "Error creating user",
				"message": fmt.Sprintf("Failed to create authentication account: %v", err),
			})
		}

		// Update existing profile (set auth_id so login works)
		_, err = config.GetDB().DB.Exec(
			`UPDATE users SET auth_id = $1, role = $2, first_name = $3, last_name = $4,
			 phone = COALESCE(NULLIF($5, ''), phone), id_number = COALESCE(NULLIF($6, ''), id_number),
			 onboarding_completed = true, updated_at = NOW()
			 WHERE id = $7`,
			authUser.ID, req.Role, req.FirstName, req.LastName, req.Phone, req.IdNumber, existingUserID,
		)
		if err != nil {
			c.Logger().Error("Failed to update existing user profile:", err)
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error":   "Error updating user profile",
				"message": err.Error(),
			})
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"message":              "User granted access successfully",
			"user_id":              authUser.ID,
			"email":                req.Email,
			"onboarding_completed": true,
		})
	}

	// User doesn't exist anywhere — create from scratch
	authUser, err := supabase.CreateUserWithEmailPassword(req.Email, req.Password, map[string]interface{}{
		"first_name": req.FirstName,
		"last_name":  req.LastName,
		"role":       req.Role,
	})
	if err != nil {
		c.Logger().Error("Failed to create user in Supabase Auth:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error creating user",
			"message": fmt.Sprintf("Failed to create authentication account: %v", err),
		})
	}

	// Create user profile in users table (onboarding_completed = true since admin filled data)
	query := `
		INSERT INTO users (
			id, auth_id, email, first_name, last_name, role, phone, id_number,
			address, onboarding_completed, is_active, created_at, updated_at
		) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, '', true, true, NOW(), NOW())
		RETURNING id
	`

	var userID string
	err = config.GetDB().DB.QueryRow(
		query, authUser.ID, req.Email, req.FirstName, req.LastName, req.Role, req.Phone, req.IdNumber,
	).Scan(&userID)
	if err != nil {
		c.Logger().Error("Database error in CreateUserDirect:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error creating user profile",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":              "User created successfully",
		"user_id":              userID,
		"email":                req.Email,
		"onboarding_completed": true,
	})
}
