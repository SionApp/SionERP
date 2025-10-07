package models

import (
	"time"
)

type User struct {
	ID               string     `json:"id" db:"id"`
	FirstName        string     `json:"first_name" db:"first_name"`
	LastName         string     `json:"last_name" db:"last_name"`
	IdNumber         string     `json:"id_number" db:"id_number"`
	Email            string     `json:"email" db:"email"`
	Phone            string     `json:"phone" db:"phone"`
	Address          string     `json:"address" db:"address"`
	BirthDate        *string    `json:"birth_date,omitempty" db:"birth_date"`
	BaptismDate      *time.Time `json:"baptism_date,omitempty" db:"baptism_date"`
	Baptized         bool       `json:"baptized" db:"baptized"`
	Role             string     `json:"role" db:"role"`
	WhatsApp         bool       `json:"whatsapp" db:"whatsapp"`
	PasswordHash     string     `json:"-" db:"password_hash"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	MaritalStatus    *string    `json:"marital_status,omitempty" db:"marital_status"`
	Occupation       *string    `json:"occupation,omitempty" db:"occupation"`
	EducationLevel   *string    `json:"education_level,omitempty" db:"education_level"`
	HowFoundChurch   *string    `json:"how_found_church,omitempty" db:"how_found_church"`
	MinistryInterest *string    `json:"ministry_interest,omitempty" db:"ministry_interest"`
	FirstVisitDate   *string    `json:"first_visit_date,omitempty" db:"first_visit_date"`
	CellGroup        *string    `json:"cell_group,omitempty" db:"cell_group"`
	CellLeaderID     *string    `json:"cell_leader_id,omitempty" db:"cell_leader_id"`
	PastoralNotes    *string    `json:"pastoral_notes,omitempty" db:"pastoral_notes"`
	IsActive         bool       `json:"is_active" db:"is_active"`
	IsActiveMember   bool       `json:"is_active_member" db:"is_active_member"`
	MembershipDate   *string    `json:"membership_date,omitempty" db:"membership_date"`

	Territory         *string `json:"territory,omitempty" db:"territory"`
	ZoneName          *string `json:"zone_name,omitempty" db:"zone_name"`
	ActiveGroupsCount *int    `json:"active_groups_count,omitempty" db:"active_groups_count"`
	DiscipleshipLevel *int    `json:"discipleship_level,omitempty" db:"discipleship_level"`
}

type LiveStream struct {
	ID             string     `json:"id" db:"id"`
	Title          string     `json:"title" db:"title"`
	Description    *string    `json:"description,omitempty" db:"description"`
	YoutubeVideoID *string    `json:"youtube_video_id,omitempty" db:"youtube_video_id"`
	IsLive         bool       `json:"is_live" db:"is_live"`
	ScheduledStart *time.Time `json:"scheduled_start,omitempty" db:"scheduled_start"`
	ActualStart    *time.Time `json:"actual_start,omitempty" db:"actual_start"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}
