package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type UserHandler struct{}

type CreateUserRequest struct {
	FirstName string `json:"first_name" validate:"required,min=2"`
	LastName  string `json:"last_name" validate:"required,min=2"`
	IdNumber  string `json:"id_number" validate:"required,min=8"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone" validate:"required,min=10"`
	Address   string `json:"address" validate:"required,min=5"`
	Password  string `json:"password" validate:"required,min=6"`

	// Extended fields
	BirthDate        *string `json:"birth_date,omitempty"`
	MaritalStatus    *string `json:"marital_status,omitempty"`
	Occupation       *string `json:"occupation,omitempty"`
	EducationLevel   *string `json:"education_level,omitempty"`
	HowFoundChurch   *string `json:"how_found_church,omitempty"`
	MinistryInterest *string `json:"ministry_interest,omitempty"`
	FirstVisitDate   *string `json:"first_visit_date,omitempty"`

	// Church membership
	Baptized       bool    `json:"baptized"`
	BaptismDate    *string `json:"baptism_date,omitempty"`
	IsActiveMember bool    `json:"is_active_member"`
	MembershipDate *string `json:"membership_date,omitempty"`

	// Cell group
	CellGroup *string `json:"cell_group,omitempty"`

	// Role and preferences
	Role          string  `json:"role" validate:"required,oneof=pastor staff supervisor server"`
	WhatsApp      bool    `json:"whatsapp"`
	PastoralNotes *string `json:"pastoral_notes,omitempty"`
}

type UpdateUserRequest struct {
	FirstName *string `json:"first_name,omitempty" validate:"omitempty,min=2"`
	LastName  *string `json:"last_name,omitempty" validate:"omitempty,min=2"`
	Phone     *string `json:"phone,omitempty" validate:"omitempty,min=10"`
	Address   *string `json:"address,omitempty" validate:"omitempty,min=5"`

	// Extended fields
	BirthDate        *string `json:"birth_date,omitempty"`
	MaritalStatus    *string `json:"marital_status,omitempty"`
	Occupation       *string `json:"occupation,omitempty"`
	EducationLevel   *string `json:"education_level,omitempty"`
	HowFoundChurch   *string `json:"how_found_church,omitempty"`
	MinistryInterest *string `json:"ministry_interest,omitempty"`
	FirstVisitDate   *string `json:"first_visit_date,omitempty"`

	// Church membership
	Baptized       *bool   `json:"baptized,omitempty"`
	BaptismDate    *string `json:"baptism_date,omitempty"`
	IsActiveMember *bool   `json:"is_active_member,omitempty"`
	MembershipDate *string `json:"membership_date,omitempty"`

	// Cell group
	CellGroup *string `json:"cell_group,omitempty"`

	// Preferences
	WhatsApp      *bool   `json:"whatsapp,omitempty"`
	PastoralNotes *string `json:"pastoral_notes,omitempty"`
}

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
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error fetching users",
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
			continue
		}
		users = append(users, user)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"users": users,
		"total": len(users),
	})
}

// GetUser obtiene un usuario por ID
func (h *UserHandler) GetUser(c echo.Context) error {
	userID := c.Param("id")

	// TODO: Query user from database
	user := models.User{
		ID:        userID,
		FirstName: "Juan",
		LastName:  "Pérez",
		IdNumber:  "001-1234567-1",
		Email:     "juan@example.com",
		Phone:     "8095551234",
		Address:   "Santo Domingo",
		Role:      "server",
		Baptized:  true,
		WhatsApp:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return c.JSON(http.StatusOK, user)
}

// CreateUser crea un nuevo usuario
func (h *UserHandler) CreateUser(c echo.Context) error {
	var req CreateUserRequest

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	// TODO: Hash password
	// TODO: Create auth user first

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
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error creating user",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "User created successfully",
		"user_id": userID,
	})
}

// UpdateUser actualiza un usuario existente
func (h *UserHandler) UpdateUser(c echo.Context) error {
	userID := c.Param("id")

	var req UpdateUserRequest

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	// TODO: Validate request data
	// TODO: Check role-based authorization
	// TODO: Update user in database

	// For now, return success
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "User updated successfully",
		"user_id": userID,
	})
}

// DeleteUser elimina un usuario
func (h *UserHandler) DeleteUser(c echo.Context) error {
	userID := c.Param("id")

	// TODO: Check role-based authorization (pastors cannot be deleted)
	// TODO: Delete user from database

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "User deleted successfully",
		"user_id": userID,
	})
}

// GetCurrentUser obtiene el perfil del usuario actual
func (h *UserHandler) GetCurrentUser(c echo.Context) error {
	// TODO: Get user ID from JWT token
	// TODO: Query user from database

	user := models.User{
		ID:        "current-user-id",
		FirstName: "Usuario",
		LastName:  "Actual",
		IdNumber:  "001-1234567-1",
		Email:     "usuario@example.com",
		Phone:     "8095551234",
		Address:   "Santo Domingo",
		Role:      "server",
		Baptized:  true,
		WhatsApp:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return c.JSON(http.StatusOK, user)
}

// UpdateCurrentUser actualiza el perfil del usuario actual
func (h *UserHandler) UpdateCurrentUser(c echo.Context) error {
	var req UpdateUserRequest

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	// TODO: Get user ID from JWT token
	// TODO: Validate that user can only update their own profile
	// TODO: Update user in database

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Profile updated successfully",
	})
}
