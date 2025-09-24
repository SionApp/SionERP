package models

import (
	"time"
)

type User struct {
	ID            string     `json:"id" db:"id"`
	FirstName     string     `json:"first_name" db:"first_name"`
	LastName      string     `json:"last_name" db:"last_name"`
	IdNumber      string     `json:"id_number" db:"id_number"`
	Email         string     `json:"email" db:"email"`
	Phone         string     `json:"phone" db:"phone"`
	Address       string     `json:"address" db:"address"`
	BaptismDate   *time.Time `json:"baptism_date,omitempty" db:"baptism_date"`
	Baptized      bool       `json:"baptized" db:"baptized"`
	Role          string     `json:"role" db:"role"`
	WhatsApp      bool       `json:"whatsapp" db:"whatsapp"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
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