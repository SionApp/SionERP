package handlers

import (
	"encoding/json"
	"net/http"
	"time"
	"database/sql"
	"fmt"

	"github.com/labstack/echo/v4"
	"../config"
)

type UserHandler struct {
	db *config.Database
}

type User struct {
	ID               string     `json:"id" db:"id"`
	Nombres          string     `json:"nombres" db:"nombres"`
	Apellidos        string     `json:"apellidos" db:"apellidos"`
	Cedula           string     `json:"cedula" db:"cedula"`
	Correo           string     `json:"correo" db:"correo"`
	Telefono         string     `json:"telefono" db:"telefono"`
	Direccion        string     `json:"direccion" db:"direccion"`
	
	// Extended fields
	BirthDate        *string    `json:"birth_date,omitempty" db:"birth_date"`
	MaritalStatus    *string    `json:"marital_status,omitempty" db:"marital_status"`
	Occupation       *string    `json:"occupation,omitempty" db:"occupation"`
	EducationLevel   *string    `json:"education_level,omitempty" db:"education_level"`
	HowFoundChurch   *string    `json:"how_found_church,omitempty" db:"how_found_church"`
	MinistryInterest *string    `json:"ministry_interest,omitempty" db:"ministry_interest"`
	FirstVisitDate   *string    `json:"first_visit_date,omitempty" db:"first_visit_date"`
	
	// Church membership
	Bautizado        bool       `json:"bautizado" db:"bautizado"`
	FechaBautizo     *time.Time `json:"fecha_bautizo,omitempty" db:"fecha_bautizo"`
	IsActiveMember   bool       `json:"is_active_member" db:"is_active_member"`
	MembershipDate   *time.Time `json:"membership_date,omitempty" db:"membership_date"`
	
	// Cell group
	CellGroup        *string    `json:"cell_group,omitempty" db:"cell_group"`
	CellLeaderID     *string    `json:"cell_leader_id,omitempty" db:"cell_leader_id"`
	
	// Role and admin
	Role             string     `json:"role" db:"role"`
	PastoralNotes    *string    `json:"pastoral_notes,omitempty" db:"pastoral_notes"`
	IsActive         bool       `json:"is_active" db:"is_active"`
	WhatsApp         bool       `json:"whatsapp" db:"whatsapp"`
	
	// Timestamps
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateUserRequest struct {
	Nombres          string  `json:"nombres" validate:"required,min=2"`
	Apellidos        string  `json:"apellidos" validate:"required,min=2"`
	Cedula           string  `json:"cedula" validate:"required,min=8"`
	Correo           string  `json:"correo" validate:"required,email"`
	Telefono         string  `json:"telefono" validate:"required,min=10"`
	Direccion        string  `json:"direccion" validate:"required,min=5"`
	Password         string  `json:"password" validate:"required,min=6"`
	
	// Extended fields
	BirthDate        *string `json:"birth_date,omitempty"`
	MaritalStatus    *string `json:"marital_status,omitempty"`
	Occupation       *string `json:"occupation,omitempty"`
	EducationLevel   *string `json:"education_level,omitempty"`
	HowFoundChurch   *string `json:"how_found_church,omitempty"`
	MinistryInterest *string `json:"ministry_interest,omitempty"`
	FirstVisitDate   *string `json:"first_visit_date,omitempty"`
	
	// Church membership
	Bautizado        bool    `json:"bautizado"`
	FechaBautizo     *string `json:"fecha_bautizo,omitempty"`
	IsActiveMember   bool    `json:"is_active_member"`
	MembershipDate   *string `json:"membership_date,omitempty"`
	
	// Cell group
	CellGroup        *string `json:"cell_group,omitempty"`
	
	// Role and preferences
	Role             string  `json:"role" validate:"required,oneof=pastor staff supervisor server"`
	WhatsApp         bool    `json:"whatsapp"`
	PastoralNotes    *string `json:"pastoral_notes,omitempty"`
}

type UpdateUserRequest struct {
	Nombres          *string `json:"nombres,omitempty" validate:"omitempty,min=2"`
	Apellidos        *string `json:"apellidos,omitempty" validate:"omitempty,min=2"`
	Telefono         *string `json:"telefono,omitempty" validate:"omitempty,min=10"`
	Direccion        *string `json:"direccion,omitempty" validate:"omitempty,min=5"`
	
	// Extended fields
	BirthDate        *string `json:"birth_date,omitempty"`
	MaritalStatus    *string `json:"marital_status,omitempty"`
	Occupation       *string `json:"occupation,omitempty"`
	EducationLevel   *string `json:"education_level,omitempty"`
	HowFoundChurch   *string `json:"how_found_church,omitempty"`
	MinistryInterest *string `json:"ministry_interest,omitempty"`
	FirstVisitDate   *string `json:"first_visit_date,omitempty"`
	
	// Church membership
	Bautizado        *bool   `json:"bautizado,omitempty"`
	FechaBautizo     *string `json:"fecha_bautizo,omitempty"`
	IsActiveMember   *bool   `json:"is_active_member,omitempty"`
	MembershipDate   *string `json:"membership_date,omitempty"`
	
	// Cell group
	CellGroup        *string `json:"cell_group,omitempty"`
	
	// Preferences
	WhatsApp         *bool   `json:"whatsapp,omitempty"`
	PastoralNotes    *string `json:"pastoral_notes,omitempty"`
}

func NewUserHandler(db *config.Database) *UserHandler {
	return &UserHandler{db: db}
}

// GetUsers obtiene la lista de usuarios
func (h *UserHandler) GetUsers(c echo.Context) error {
	query := `
		SELECT id, nombres, apellidos, cedula, correo, telefono, direccion,
			   birth_date, marital_status, occupation, education_level, 
			   how_found_church, ministry_interest, first_visit_date,
			   bautizado, fecha_bautizo, is_active_member, membership_date,
			   cell_group, cell_leader_id, role, pastoral_notes, is_active,
			   whatsapp, created_at, updated_at
		FROM users 
		WHERE is_active = true
		ORDER BY created_at DESC
	`
	
	rows, err := h.db.DB.Query(query)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error fetching users",
		})
	}
	defer rows.Close()
	
	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID, &user.Nombres, &user.Apellidos, &user.Cedula, &user.Correo,
			&user.Telefono, &user.Direccion, &user.BirthDate, &user.MaritalStatus,
			&user.Occupation, &user.EducationLevel, &user.HowFoundChurch,
			&user.MinistryInterest, &user.FirstVisitDate, &user.Bautizado,
			&user.FechaBautizo, &user.IsActiveMember, &user.MembershipDate,
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
	user := User{
		ID:        userID,
		Nombres:   "Juan",
		Apellidos: "Pérez",
		Cedula:    "001-1234567-1",
		Correo:    "juan@example.com",
		Telefono:  "8095551234",
		Direccion: "Santo Domingo",
		Role:      "server",
		IsActive:  true,
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
			nombres, apellidos, cedula, correo, telefono, direccion, password_hash,
			birth_date, marital_status, occupation, education_level, 
			how_found_church, ministry_interest, first_visit_date,
			bautizado, fecha_bautizo, is_active_member, membership_date,
			cell_group, role, pastoral_notes, whatsapp
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		) RETURNING id
	`
	
	var userID string
	err := h.db.DB.QueryRow(
		query, req.Nombres, req.Apellidos, req.Cedula, req.Correo, req.Telefono,
		req.Direccion, "temp_hash", req.BirthDate, req.MaritalStatus, req.Occupation,
		req.EducationLevel, req.HowFoundChurch, req.MinistryInterest, req.FirstVisitDate,
		req.Bautizado, req.FechaBautizo, req.IsActiveMember, req.MembershipDate,
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
	
	user := User{
		ID:        "current-user-id",
		Nombres:   "Usuario",
		Apellidos: "Actual",
		Cedula:    "001-1234567-1",
		Correo:    "usuario@example.com",
		Telefono:  "8095551234",
		Direccion: "Santo Domingo",
		Role:      "server",
		IsActive:  true,
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