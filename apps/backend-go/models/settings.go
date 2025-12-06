// Package models contiene los modelos de configuración
package models

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"strings"
	"time"
)

// NullString es un wrapper para sql.NullString que se serializa correctamente a JSON
type NullString struct {
	sql.NullString
}

// Scan implementa sql.Scanner para compatibilidad con database/sql
func (ns *NullString) Scan(value interface{}) error {
	return ns.NullString.Scan(value)
}

// Value implementa driver.Valuer para compatibilidad con database/sql
func (ns NullString) Value() (driver.Value, error) {
	return ns.NullString.Value()
}

// MarshalJSON implementa json.Marshaler para NullString
func (ns NullString) MarshalJSON() ([]byte, error) {
	if !ns.Valid {
		return []byte("null"), nil
	}
	// Limpiar espacios en blanco antes de serializar
	cleanValue := strings.TrimSpace(ns.String)
	return json.Marshal(cleanValue)
}

// UnmarshalJSON implementa json.Unmarshaler para NullString
func (ns *NullString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		ns.Valid = false
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	ns.String = strings.TrimSpace(s)
	ns.Valid = true
	return nil
}

// NullInt64 es un wrapper para sql.NullInt64 que se serializa correctamente a JSON
type NullInt64 struct {
	sql.NullInt64
}

// Scan implementa sql.Scanner para compatibilidad con database/sql
func (ni *NullInt64) Scan(value interface{}) error {
	return ni.NullInt64.Scan(value)
}

// Value implementa driver.Valuer para compatibilidad con database/sql
func (ni NullInt64) Value() (driver.Value, error) {
	return ni.NullInt64.Value()
}

// MarshalJSON implementa json.Marshaler para NullInt64
func (ni NullInt64) MarshalJSON() ([]byte, error) {
	if !ni.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(ni.Int64)
}

// UnmarshalJSON implementa json.Unmarshaler para NullInt64
func (ni *NullInt64) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		ni.Valid = false
		return nil
	}
	var i int64
	if err := json.Unmarshal(data, &i); err != nil {
		return err
	}
	ni.Int64 = i
	ni.Valid = true
	return nil
}

// SystemSettings representa la configuración del sistema
type SystemSettings struct {
	ID                    string    `json:"id" db:"id"`
	SiteName              string    `json:"site_name" db:"site_name"`
	SiteVersion           NullString `json:"site_version" db:"site_version"`
	MaintenanceMode       bool      `json:"maintenance_mode" db:"maintenance_mode"`
	AllowRegistrations    bool      `json:"allow_registrations" db:"allow_registrations"`
	MaxUsersPerGroup      NullInt64 `json:"max_users_per_group" db:"max_users_per_group"`
	SessionTimeoutMinutes NullInt64 `json:"session_timeout_minutes" db:"session_timeout_minutes"`
	DefaultTheme          NullString `json:"default_theme" db:"default_theme"`
	DefaultLanguage       NullString `json:"default_language" db:"default_language"`
	Timezone              NullString `json:"timezone" db:"timezone"`
	AnimationsEnabled     bool      `json:"animations_enabled" db:"animations_enabled"`
	SidebarCollapsed      bool      `json:"sidebar_collapsed" db:"sidebar_collapsed"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
}

// ChurchInfo representa la información de la iglesia
type ChurchInfo struct {
	ID             string         `json:"id" db:"id"`
	Name           string         `json:"name" db:"name"`
	PastorName     NullString `json:"pastor_name" db:"pastor_name"`
	Description    NullString `json:"description" db:"description"`
	Mission        NullString `json:"mission" db:"mission"`
	Vision         NullString `json:"vision" db:"vision"`
	Address        NullString `json:"address" db:"address"`
	Phone          NullString `json:"phone" db:"phone"`
	Email          NullString `json:"email" db:"email"`
	Website        NullString `json:"website" db:"website"`
	LogoURL        NullString `json:"logo_url" db:"logo_url"`
	BannerURL      NullString `json:"banner_url" db:"banner_url"`
	PrimaryColor   NullString `json:"primary_color" db:"primary_color"`
	SecondaryColor NullString `json:"secondary_color" db:"secondary_color"`
	SocialFacebook NullString `json:"social_facebook" db:"social_facebook"`
	SocialInstagram NullString `json:"social_instagram" db:"social_instagram"`
	SocialYoutube  NullString `json:"social_youtube" db:"social_youtube"`
	SocialTwitter  NullString `json:"social_twitter" db:"social_twitter"`
	ServiceTimes   NullString `json:"service_times" db:"service_times"` // JSON string
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`
}

// NotificationConfig representa la configuración de notificaciones
type NotificationConfig struct {
	ID                      string    `json:"id" db:"id"`
	EmailEnabled            bool      `json:"email_enabled" db:"email_enabled"`
	SMSEnabled              bool      `json:"sms_enabled" db:"sms_enabled"`
	PushEnabled             bool      `json:"push_enabled" db:"push_enabled"`
	NewUserNotifications    bool      `json:"new_user_notifications" db:"new_user_notifications"`
	RoleChangeNotifications bool      `json:"role_change_notifications" db:"role_change_notifications"`
	WeeklyReports           bool      `json:"weekly_reports" db:"weekly_reports"`
	EventReminders          bool      `json:"event_reminders" db:"event_reminders"`
	ImportantMessages       bool      `json:"important_messages" db:"important_messages"`
	SMTPHost                NullString `json:"smtp_host" db:"smtp_host"`
	SMTPPort                NullInt64  `json:"smtp_port" db:"smtp_port"`
	SMTPUser                NullString `json:"smtp_user" db:"smtp_user"`
	SMTPPassword            NullString `json:"smtp_password" db:"smtp_password"`
	SMTPFromEmail           NullString `json:"smtp_from_email" db:"smtp_from_email"`
	SMTPFromName            NullString `json:"smtp_from_name" db:"smtp_from_name"`
	CreatedAt               time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time      `json:"updated_at" db:"updated_at"`
}

// UserPreferences representa las preferencias del usuario
type UserPreferences struct {
	ID                  string         `json:"id" db:"id"`
	UserID              string         `json:"user_id" db:"user_id"`
	Theme               NullString `json:"theme" db:"theme"`
	Language            NullString `json:"language" db:"language"`
	Timezone            NullString `json:"timezone" db:"timezone"`
	ProfileVisibility   NullString `json:"profile_visibility" db:"profile_visibility"`
	EmailNotifications  bool           `json:"email_notifications" db:"email_notifications"`
	PushNotifications   bool           `json:"push_notifications" db:"push_notifications"`
	SMSNotifications    bool           `json:"sms_notifications" db:"sms_notifications"`
	WhatsAppNotifications bool         `json:"whatsapp_notifications" db:"whatsapp_notifications"`
	EventReminders      bool           `json:"event_reminders" db:"event_reminders"`
	WeeklyNewsletter    bool           `json:"weekly_newsletter" db:"weekly_newsletter"`
	ShowEmail           bool           `json:"show_email" db:"show_email"`
	ShowPhone           bool           `json:"show_phone" db:"show_phone"`
	CreatedAt           time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at" db:"updated_at"`
}

