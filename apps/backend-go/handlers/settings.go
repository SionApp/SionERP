package handlers

import (
	"backend-sion/cache"
	"backend-sion/config"
	"backend-sion/database"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type SettingsHandler struct{}

func NewSettingsHandler() *SettingsHandler {
    return &SettingsHandler{}
}

// GetSystemSettings obtiene configuraciones del sistema
func (h *SettingsHandler) GetSystemSettings(c echo.Context) error {
	db := config.GetDB()
	cacheInstance := cache.GetCache()

	if cached, found := cacheInstance.Get("system_settings"); found {
		c.Logger().Info(fmt.Sprintf("System settings cached: %v", cached))
		return c.JSON(http.StatusOK, cached)
	}
	c.Logger().Info("System settings not cached, getting from database")

	query := `SELECT id, site_name, site_version, maintenance_mode, allow_registrations, 
		max_users_per_group, session_timeout_minutes, default_theme, default_language, 
		timezone, animations_enabled, sidebar_collapsed, created_at, updated_at 
		FROM system_settings LIMIT 1`

	var settings models.SystemSettings
	err := db.DB.QueryRow(query).Scan(
		&settings.ID, &settings.SiteName, &settings.SiteVersion, &settings.MaintenanceMode,
		&settings.AllowRegistrations, &settings.MaxUsersPerGroup, &settings.SessionTimeoutMinutes,
		&settings.DefaultTheme, &settings.DefaultLanguage, &settings.Timezone,
		&settings.AnimationsEnabled, &settings.SidebarCollapsed, &settings.CreatedAt, &settings.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "System settings not found",
			})
		}
		c.Logger().Error("Error fetching system settings: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get system settings",
		})
	}

	cacheInstance.Set("system_settings", settings, 5*time.Minute)
	c.Logger().Info(fmt.Sprintf("System settings cached: %v", settings))
	return c.JSON(http.StatusOK, settings)
}

// UpdateSystemSettings actualiza configuraciones
func (h *SettingsHandler) UpdateSystemSettings(c echo.Context) error {
	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	db := config.GetDB()
	cacheInstance := cache.GetCache()

	// Construir UPDATE dinámico
	query, args, err := database.BuildUpdateQueryFromMap(req, "system_settings", "id", "00000000-0000-0000-0000-000000000001")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Failed to build update query",
			"message": err.Error(),
		})
	}

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating system settings: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update settings",
			"message": err.Error(),
		})
	}

	// Invalidar cache
	cacheInstance.Delete("system_settings")

	// Retornar los settings actualizados
	return h.GetSystemSettings(c)
}

// GetChurchInfo obtiene información de la iglesia
func (h *SettingsHandler) GetChurchInfo(c echo.Context) error {
	db := config.GetDB()

	query := `SELECT id, name, pastor_name, description, mission, vision, address, phone, email, 
		website, logo_url, banner_url, primary_color, secondary_color, social_facebook, 
		social_instagram, social_youtube, social_twitter, service_times, created_at, updated_at 
		FROM church_info LIMIT 1`

	var info models.ChurchInfo
	err := db.DB.QueryRow(query).Scan(
		&info.ID, &info.Name, &info.PastorName, &info.Description, &info.Mission, &info.Vision,
		&info.Address, &info.Phone, &info.Email, &info.Website, &info.LogoURL, &info.BannerURL,
		&info.PrimaryColor, &info.SecondaryColor, &info.SocialFacebook, &info.SocialInstagram,
		&info.SocialYoutube, &info.SocialTwitter, &info.ServiceTimes, &info.CreatedAt, &info.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Church info not found",
			})
		}
		c.Logger().Error("Error fetching church info: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get church info",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, info)
}

// UpdateChurchInfo actualiza información de la iglesia
func (h *SettingsHandler) UpdateChurchInfo(c echo.Context) error {
	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	db := config.GetDB()

	query, args, err := database.BuildUpdateQueryFromMap(req, "church_info", "id", "00000000-0000-0000-0000-000000000002")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Failed to build update query",
			"message": err.Error(),
		})
	}

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating church info: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update church info",
			"message": err.Error(),
		})
	}

	// Retornar la info actualizada
	return h.GetChurchInfo(c)
}

// GetNotificationConfig obtiene configuración de notificaciones
func (h *SettingsHandler) GetNotificationConfig(c echo.Context) error {
	db := config.GetDB()

	query := `SELECT id, email_enabled, sms_enabled, push_enabled, new_user_notifications, 
		role_change_notifications, weekly_reports, event_reminders, important_messages, 
		smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, 
		created_at, updated_at FROM notification_config LIMIT 1`

	var config models.NotificationConfig
	err := db.DB.QueryRow(query).Scan(
		&config.ID, &config.EmailEnabled, &config.SMSEnabled, &config.PushEnabled,
		&config.NewUserNotifications, &config.RoleChangeNotifications, &config.WeeklyReports,
		&config.EventReminders, &config.ImportantMessages, &config.SMTPHost, &config.SMTPPort,
		&config.SMTPUser, &config.SMTPPassword, &config.SMTPFromEmail, &config.SMTPFromName,
		&config.CreatedAt, &config.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Notification config not found",
			})
		}
		c.Logger().Error("Error fetching notification config: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get notification config",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, config)
}

// UpdateNotificationConfig actualiza configuración de notificaciones
func (h *SettingsHandler) UpdateNotificationConfig(c echo.Context) error {
	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	db := config.GetDB()
	query, args, err := database.BuildUpdateQueryFromMap(req, "notification_config", "id", "00000000-0000-0000-0000-000000000003")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Failed to build update query",
			"message": err.Error(),
		})
	}
	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating notification config: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update notification config",
			"message": err.Error(),
		})
	}

	// Retornar la config actualizada
	return h.GetNotificationConfig(c)
}
