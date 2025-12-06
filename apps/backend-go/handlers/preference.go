package handlers

import (
	"backend-sion/config"
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

// GetUserPreferences obtiene preferencias del usuario actual
func (h *PreferencesHandler) GetUserPreferences(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
			"message": "User ID not found in context",
		})
	}

	db := config.GetDB()

	query := `SELECT id, user_id, theme, language, timezone, email_notifications, 
		push_notifications, sms_notifications, whatsapp_notifications, event_reminders, 
		weekly_newsletter, profile_visibility, show_email, show_phone, created_at, updated_at 
		FROM user_preferences WHERE user_id = $1`

	var prefs models.UserPreferences
	err := db.DB.QueryRow(query, userID).Scan(
		&prefs.ID, &prefs.UserID, &prefs.Theme, &prefs.Language, &prefs.Timezone,
		&prefs.EmailNotifications, &prefs.PushNotifications, &prefs.SMSNotifications,
		&prefs.WhatsAppNotifications, &prefs.EventReminders, &prefs.WeeklyNewsletter,
		&prefs.ProfileVisibility, &prefs.ShowEmail, &prefs.ShowPhone,
		&prefs.CreatedAt, &prefs.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// Si no existe, crear preferencias por defecto
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found",
			})
		}
		c.Logger().Error("Error fetching user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user preferences",
			"message": err.Error(),
		})
	}

	c.Logger().Info(fmt.Sprintf("User preferences: %v", prefs))
	return c.JSON(http.StatusOK, prefs)
}

// UpdateUserPreferences actualiza preferencias
func (h *PreferencesHandler) UpdateUserPreferences(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
			"message": "User ID not found in context",
		})
	}

	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	db := config.GetDB()

	// Verificar si existen preferencias, si no, crearlas
	var exists bool
	err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM user_preferences WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		c.Logger().Error("Error checking user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to check user preferences",
		})
	}

	if !exists {
		// Crear preferencias por defecto
		insertQuery := `INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING id`
		var newID string
		err = db.DB.QueryRow(insertQuery, userID).Scan(&newID)
		if err != nil {
			c.Logger().Error("Error creating user preferences: ", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to create user preferences",
			})
		}
	}

	// UPDATE dinámico
	query, args, err := database.BuildUpdateQueryFromMap(req, "user_preferences", "user_id", userID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Failed to build update query",
			"message": err.Error(),
		})
	}

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating user preferences: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update user preferences",
			"message": err.Error(),
		})
	}

	// Retornar las preferencias actualizadas
	return h.GetUserPreferences(c)
}
