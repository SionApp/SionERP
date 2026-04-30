package middleware

import (
	"backend-sion/config"
	"encoding/json"
	"log"

	"github.com/labstack/echo/v4"
)

// AccessDeniedLog represents a denied access attempt
type AccessDeniedLog struct {
	UserID       string    `json:"user_id"`
	UserEmail    string    `json:"user_email"`
	UserRole     string    `json:"user_role"`
	RoleLevel    int       `json:"user_role_level"`
	RequiredLevel int      `json:"required_level"`
	DeniedReason string    `json:"denied_reason"`
	HTTPMethod   string    `json:"http_method"`
	RequestPath  string    `json:"request_path"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	Details      string    `json:"details"` // JSON string for extra context
}

// LogAccessDenied persists a denied access attempt to the database
func LogAccessDenied(c echo.Context, entry AccessDeniedLog) {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		log.Printf("⚠️  Cannot log access denied: DB not available — user=%s path=%s reason=%s",
			entry.UserID, entry.RequestPath, entry.DeniedReason)
		return
	}

	query := `
		INSERT INTO access_denied_logs (
			user_id, user_email, user_role, user_role_level, required_level,
			denied_reason, http_method, request_path, ip_address, user_agent, details
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := db.DB.Exec(
		query,
		entry.UserID, entry.UserEmail, entry.UserRole, entry.RoleLevel, entry.RequiredLevel,
		entry.DeniedReason, entry.HTTPMethod, entry.RequestPath,
		c.RealIP(), c.Request().UserAgent(), entry.Details,
	)
	if err != nil {
		log.Printf("⚠️  Failed to persist access denied log: %v", err)
	}
}

// LogAccessDeniedSimple is a convenience wrapper for common cases
func LogAccessDeniedSimple(c echo.Context, userID, email, role string, roleLevel, requiredLevel int, reason, details string) {
	detailsJSON := ""
	if details != "" {
		b, _ := json.Marshal(map[string]string{"context": details})
		detailsJSON = string(b)
	}

	LogAccessDenied(c, AccessDeniedLog{
		UserID:        userID,
		UserEmail:     email,
		UserRole:      role,
		RoleLevel:     roleLevel,
		RequiredLevel: requiredLevel,
		DeniedReason:  reason,
		HTTPMethod:    c.Request().Method,
		RequestPath:   c.Request().URL.Path,
		Details:       detailsJSON,
	})
}
