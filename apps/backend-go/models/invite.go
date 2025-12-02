// Package models contiene los modelos de la base de datos

package models

import "time"

type InviteUserRequest struct {
	Email     string `json:"email" validate:"required,email"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
	Phone     string `json:"phone"`
	IdNumber  string `json:"id_number"`
	Role      string `json:"assigned_role" validate:"required,oneof=pastor staff supervisor server"`
}

type InviteResponse struct {
	InvitationID string    `json:"invitation_id"`
	Email        string    `json:"email"`
	Status       string    `json:"status"`
	ExpiresAt    time.Time `json:"expires_at"`
	Message      string    `json:"message"`
}
