package handlers

import (
	"backend-sion/database"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

type PreferencesHandler struct{}

func NewPreferencesHandler() *PreferencesHandler {
	return &PreferencesHandler{}
}

// GetUserPreferences obtiene preferencias del usuario actual.
// Si el usuario no tiene fila todavía, se crea una con los DEFAULT de la tabla
// (auto-provisión) — así el frontend siempre recibe 200 con datos persistibles.
func (h *PreferencesHandler) GetUserPreferences(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	const selectCols = `id, user_id, theme, language, timezone, email_notifications,
		push_notifications, sms_notifications, whatsapp_notifications, event_reminders,
		weekly_newsletter, profile_visibility, show_email, show_phone, created_at, updated_at`

	scan := func(row *sql.Row, prefs *models.UserPreferences) error {
		return row.Scan(
			&prefs.ID, &prefs.UserID, &prefs.Theme, &prefs.Language, &prefs.Timezone,
			&prefs.EmailNotifications, &prefs.PushNotifications, &prefs.SMSNotifications,
			&prefs.WhatsAppNotifications, &prefs.EventReminders, &prefs.WeeklyNewsletter,
			&prefs.ProfileVisibility, &prefs.ShowEmail, &prefs.ShowPhone,
			&prefs.CreatedAt, &prefs.UpdatedAt,
		)
	}

	var prefs models.UserPreferences
	err = scan(q.QueryRow(
		`SELECT `+selectCols+` FROM user_preferences WHERE user_id = $1 AND church_id = $2`,
		userID, churchID,
	), &prefs)
	if err == sql.ErrNoRows {
		// Auto-provisión: crear la fila con los defaults CONFIGURADOS por la iglesia
		// (system_settings.default_theme/default_language/timezone), con fallback
		// a valores sanos si la iglesia aún no tiene settings.
		err = scan(q.QueryRow(
			`INSERT INTO user_preferences (user_id, church_id, theme, language, timezone)
			 SELECT $1, $2,
			        COALESCE(s.default_theme, 'light'),
			        COALESCE(s.default_language, 'es'),
			        COALESCE(s.timezone, 'UTC')
			 FROM (SELECT 1) one
			 LEFT JOIN system_settings s ON s.church_id = $2
			 ON CONFLICT (church_id, user_id) DO UPDATE SET updated_at = now()
			 RETURNING `+selectCols,
			userID, churchID,
		), &prefs)
	}
	if err != nil {
		c.Logger().Error("Error fetching user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user preferences",
		})
	}

	return c.JSON(http.StatusOK, prefs)
}

// UpdateUserPreferences actualiza preferencias
func (h *PreferencesHandler) UpdateUserPreferences(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error":   "Unauthorized",
			"message": "User ID not found in context",
		})
	}

	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Asegurar que la fila exista (idempotente, con church_id — NOT NULL desde multi-tenancy)
	_, err = q.Exec(`
		INSERT INTO user_preferences (user_id, church_id) VALUES ($1, $2)
		ON CONFLICT (church_id, user_id) DO NOTHING
	`, userID, churchID)
	if err != nil {
		c.Logger().Error("Error creating user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create user preferences",
		})
	}

	// UPDATE dinámico (el builder valida los nombres de columna del payload)
	updateQuery, args, err := database.BuildUpdateQueryFromMap(req, "user_preferences", "user_id", userID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "Failed to build update query",
			"message": err.Error(),
		})
	}
	// Scope de tenant explícito además del user_id
	updateQuery += fmt.Sprintf(" AND church_id = $%d", len(args)+1)
	args = append(args, churchID)

	_, err = q.Exec(updateQuery, args...)
	if err != nil {
		c.Logger().Error("Error updating user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to update user preferences",
			"message": err.Error(),
		})
	}

	// Retornar las preferencias actualizadas
	return h.GetUserPreferences(c)
}
