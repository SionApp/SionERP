package models

import "time"

type Notification struct {
	ID                string    `json:"id" db:"id"`
	UserID            string    `json:"user_id" db:"user_id"`
	Type              string    `json:"type" db:"type"`
	Title             string    `json:"title" db:"title"`
	Message           string    `json:"message" db:"message"`
	ActionURL         *string   `json:"action_url,omitempty" db:"action_url"`
	ActionText        *string   `json:"action_text,omitempty" db:"action_text"`
	RelatedEntityType *string   `json:"related_entity_type,omitempty" db:"related_entity_type"`
	RelatedEntityID   *string   `json:"related_entity_id,omitempty" db:"related_entity_id"`
	Read              bool      `json:"read" db:"read"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

type NotificationInput struct {
	ChurchID          string
	UserID            string
	Type              string
	Title             string
	Message           string
	ActionURL         *string
	ActionText        *string
	RelatedEntityType *string
	RelatedEntityID   *string
}
