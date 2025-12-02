// Package models contiene los modelos de la base de datos
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
	BirthDate        *string    `json:"birth_date" db:"birth_date"`
	BaptismDate      *string    `json:"baptism_date" db:"baptism_date"`
	Baptized         bool       `json:"baptized" db:"baptized"`
	Role             string     `json:"role" db:"role"`
	WhatsApp         bool       `json:"whatsapp" db:"whatsapp"`
	PasswordHash     string     `json:"-" db:"password_hash"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	MaritalStatus    *string    `json:"marital_status" db:"marital_status"`
	Occupation       *string    `json:"occupation" db:"occupation"`
	EducationLevel   *string    `json:"education_level" db:"education_level"`
	HowFoundChurch   *string    `json:"how_found_church" db:"how_found_church"`
	MinistryInterest *string    `json:"ministry_interest" db:"ministry_interest"`
	FirstVisitDate   *string    `json:"first_visit_date" db:"first_visit_date"`
	CellGroup        *string    `json:"cell_group" db:"cell_group"`
	CellLeaderID     *string    `json:"cell_leader_id" db:"cell_leader_id"`
	PastoralNotes    *string    `json:"pastoral_notes" db:"pastoral_notes"`
	IsActive         bool       `json:"is_active" db:"is_active"`
	IsActiveMember   bool       `json:"is_active_member" db:"is_active_member"`
	MembershipDate   *string    `json:"membership_date" db:"membership_date"`

	Territory         *string `json:"territory" db:"territory"`
	ZoneName          *string `json:"zone_name" db:"zone_name"`
	ActiveGroupsCount *int    `json:"active_groups_count" db:"active_groups_count"`
	DiscipleshipLevel *int    `json:"discipleship_level" db:"discipleship_level"`
	EmergencyContactName *string `json:"emergency_contact_name" db:"emergency_contact_name"`
	EmergencyContactPhone *string `json:"emergency_contact_phone" db:"emergency_contact_phone"`

	// Invitation status (from LEFT JOIN with user_invitations)
	InvitationStatus *string `json:"invitation_status,omitempty" db:"invitation_status"`
}

type UpdateUserRequest struct {
	FirstName *string `json:"first_name,omitempty" validate:"omitempty,min=2"`
	LastName  *string `json:"last_name,omitempty" validate:"omitempty,min=2"`
	Phone     *string `json:"phone,omitempty" validate:"omitempty,min=10"`
	Address   *string `json:"address,omitempty" validate:"omitempty,min=5"`
	IdNumber *string `json:"id_number,omitempty" db:"id_number"`


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
	EmergencyContactName *string `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone *string `json:"emergency_contact_phone,omitempty"`

	// Territory
	Territory *string `json:"territory,omitempty"`
	ZoneName *string `json:"zone_name,omitempty"`
	ActiveGroupsCount *int `json:"active_groups_count,omitempty"`
	DiscipleshipLevel *int `json:"discipleship_level,omitempty"`

	// Role
	Role *string `json:"role,omitempty"`

	// ID Number
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
