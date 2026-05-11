package utils

import (
	"backend-sion/config"
	"backend-sion/models"
	"log"
)

// Ptr returns a pointer to the given string. Used to set nullable fields in NotificationInput.
func Ptr(s string) *string {
	return &s
}

// CreateNotification inserts a notification row for the given user.
// Errors are logged internally and never propagated — callers use fire-and-forget.
func CreateNotification(db *config.Database, n models.NotificationInput) error {
	_, err := db.DB.Exec(`
		INSERT INTO notifications (
			user_id, type, title, message,
			action_url, action_text,
			related_entity_type, related_entity_id
		)
		VALUES (
			$1, $2, $3, $4,
			$5, $6,
			$7, NULLIF($8::text, '')::uuid
		)
	`,
		n.UserID, n.Type, n.Title, n.Message,
		n.ActionURL, n.ActionText,
		n.RelatedEntityType, stringOrEmpty(n.RelatedEntityID),
	)
	if err != nil {
		log.Printf("CreateNotification error for user %s: %v", n.UserID, err)
	}
	return err
}

// stringOrEmpty dereferences a *string safely, returning "" if nil.
func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
