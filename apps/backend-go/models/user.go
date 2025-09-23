package models

import (
	"time"
)

type User struct {
	ID               string    `json:"id" db:"id"`
	Nombres          string    `json:"nombres" db:"nombres"`
	Apellidos        string    `json:"apellidos" db:"apellidos"`
	Cedula           string    `json:"cedula" db:"cedula"`
	Correo           string    `json:"correo" db:"correo"`
	Telefono         string    `json:"telefono" db:"telefono"`
	Direccion        string    `json:"direccion" db:"direccion"`
	FechaBautizo     *time.Time `json:"fecha_bautizo,omitempty" db:"fecha_bautizo"`
	Bautizado        bool      `json:"bautizado" db:"bautizado"`
	Role             string    `json:"role" db:"role"`
	WhatsApp         bool      `json:"whatsapp" db:"whatsapp"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

type LiveStream struct {
	ID              string     `json:"id" db:"id"`
	Title           string     `json:"title" db:"title"`
	Description     *string    `json:"description,omitempty" db:"description"`
	YoutubeVideoID  *string    `json:"youtube_video_id,omitempty" db:"youtube_video_id"`
	IsLive          bool       `json:"is_live" db:"is_live"`
	ScheduledStart  *time.Time `json:"scheduled_start,omitempty" db:"scheduled_start"`
	ActualStart     *time.Time `json:"actual_start,omitempty" db:"actual_start"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}