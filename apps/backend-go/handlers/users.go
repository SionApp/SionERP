// Package handlers contiene los controladores para manejar las solicitudes HTTP relacionadas con usuarios.
package handlers

import (
	"backend-sion/config"
	"backend-sion/database"
	"backend-sion/models"
	"backend-sion/utils"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type UserHandler struct{}

var validate = validator.New()

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// GetUsers obtiene la lista de usuarios
func (h *UserHandler) GetUsers(c echo.Context) error {
	query := `
		SELECT id, first_name, last_name, id_number, email, phone, address,
			   birth_date, marital_status, occupation, education_level,
			   how_found_church, ministry_interest, first_visit_date,
			   baptized, baptism_date, is_active_member, membership_date,
			   cell_group, cell_leader_id, role, pastoral_notes, is_active,
			   whatsapp, created_at, updated_at
		FROM users
		WHERE is_active = true
		ORDER BY created_at DESC
	`

	rows, err := config.GetDB().DB.Query(query)
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
			&user.ID, &user.FirstName, &user.LastName, &user.IdNumber, &user.Email,
			&user.Phone, &user.Address, &user.BirthDate, &user.MaritalStatus,
			&user.Occupation, &user.EducationLevel, &user.HowFoundChurch,
			&user.MinistryInterest, &user.FirstVisitDate, &user.Baptized,
			&user.BaptismDate, &user.IsActiveMember, &user.MembershipDate,
			&user.CellGroup, &user.CellLeaderID, &user.Role, &user.PastoralNotes,
			&user.IsActive, &user.WhatsApp, &user.CreatedAt, &user.UpdatedAt,
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
	err := config.GetDB().DB.QueryRow(query, userID).Scan(
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
			first_name, last_name, id_number, email, phone, address, password_hash,
			birth_date, marital_status, occupation, education_level,
			how_found_church, ministry_interest, first_visit_date,
			baptized, baptism_date, is_active_member, membership_date,
			cell_group, role, pastoral_notes, whatsapp
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		) RETURNING id
	`

	var userID string
	err := config.GetDB().DB.QueryRow(
		query, req.FirstName, req.LastName, req.IdNumber, req.Email, req.Phone,
		req.Address, "temp_hash", req.BirthDate, req.MaritalStatus, req.Occupation,
		req.EducationLevel, req.HowFoundChurch, req.MinistryInterest, req.FirstVisitDate,
		req.Baptized, req.BaptismDate, req.IsActiveMember, req.MembershipDate,
		req.CellGroup, req.Role, req.PastoralNotes, req.WhatsApp,
	).Scan(&userID)
	if err != nil {
		c.Logger().Error("Database error in CreateUser: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Error creating user",
			"message": err.Error(),
			"details": "Failed to insert user into database - check for duplicate email/id_number",
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
	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", currentUserID).Scan(&currentUserRole)
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

	var req models.UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		c.Logger().Error("Bind error in UpdateUser:", err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"error":   "Invalid request body",
			"message": err.Error(),
		})
	}

	if currentUserID != userID && (currentUserRole != "pastor" && currentUserRole != "staff") {
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
	userToDelete := c.Get("user_id").(string)

	var currentUserRole string

	err := config.GetDB().DB.QueryRow("SELECT role FROM users WHERE id = $1", userToDelete).Scan(&currentUserRole)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.Logger().Error("User not found in database:", err)
			return c.JSON(http.StatusUnauthorized, map[string]interface{}{
				"error":   "User not found",
				"message": "You must be a valid user to perform this action. User not found in database",
			})
		}
		c.Logger().Error("Database error fetching user role:", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error":   "Database error",
			"message": err.Error(),
		})
	}

	if currentUserRole != utils.RolePastor && currentUserRole != utils.RoleStaff {
		c.Logger().Error("Unauthorized delete attempt:", currentUserRole, "is not allowed to delete user", userID)
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error":   "Unauthorized",
			"message": "You are not allowed to delete this user",
		})
	}

	var exists bool
	err = config.GetDB().DB.QueryRow("SELECT EXISTS(SELECT FROM users WHERE id = $1", userToDelete).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusUnauthorized, map[string]interface{}{
				"error":   "Database error",
				"message": "You must be a valid user to perform this action",
			})
		}
	}

	if !exists {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"error":   "User not found",
			"message": fmt.Sprintf("User with ID %s does not exist", userID),
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

	c.Logger().Info(fmt.Sprintf("User deleted successfully with ID: %s and userToDelete: %s", userID, userToDelete))
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

	query := `
		SELECT id, first_name, last_name, id_number, email, phone, address,
			   birth_date, marital_status, occupation, education_level,
			   how_found_church, ministry_interest, first_visit_date,
			   baptized, baptism_date, is_active_member, membership_date,
			   cell_group, cell_leader_id, role, pastoral_notes, is_active,
			   whatsapp, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user models.User
	err := config.GetDB().DB.QueryRow(query, userID).Scan(
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
