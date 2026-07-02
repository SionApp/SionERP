package handlers

import (
	"backend-sion/cache"
	"backend-sion/config"
	"backend-sion/database"
	"backend-sion/middleware"
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
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	cacheInstance := cache.GetCache()
	cacheKey := "system_settings_" + churchID

	if cached, found := cacheInstance.Get(cacheKey); found {
		c.Logger().Info(fmt.Sprintf("System settings cached: %v", cached))
		return c.JSON(http.StatusOK, cached)
	}
	c.Logger().Info("System settings not cached, getting from database")

	query := `SELECT id, site_name, site_version, maintenance_mode, allow_registrations,
		max_users_per_group, session_timeout_minutes, default_theme, default_language,
		timezone, animations_enabled, sidebar_collapsed, created_at, updated_at
		FROM system_settings WHERE church_id = $1 LIMIT 1`

	var settings models.SystemSettings
	err = q.QueryRow(query, churchID).Scan(
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

	cacheInstance.Set(cacheKey, settings, 5*time.Minute)
	c.Logger().Info(fmt.Sprintf("System settings cached: %v", settings))
	return c.JSON(http.StatusOK, settings)
}

// UpdateSystemSettings actualiza configuraciones
func (h *SettingsHandler) UpdateSystemSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	cacheInstance := cache.GetCache()

	// Resolve the settings row id for this church
	var settingsID string
	if err := q.QueryRow("SELECT id FROM system_settings WHERE church_id = $1 LIMIT 1", churchID).Scan(&settingsID); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "System settings not found for this church"})
	}

	// Construir UPDATE dinámico by id
	updateQuery, args, err := database.BuildUpdateQueryFromMap(req, "system_settings", "id", settingsID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "Failed to build update query",
			"message": err.Error(),
		})
	}

	_, err = q.Exec(updateQuery, args...)
	if err != nil {
		c.Logger().Error("Error updating system settings: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to update settings",
			"message": err.Error(),
		})
	}

	// Invalidar caches (settings + gate de mantenimiento, para que aplique al instante)
	cacheInstance.Delete("system_settings_" + churchID)
	middleware.InvalidateMaintenanceCache(churchID)

	// Retornar los settings actualizados
	return h.GetSystemSettings(c)
}

// GetPublicSettings devuelve el subconjunto SEGURO de system_settings que
// cualquier usuario autenticado necesita para que la UI respete la
// configuración (tema/idioma por defecto, animaciones, mantenimiento, timeout).
// Sin gate de rol — el gate Pastor+ queda solo para el CRUD completo.
func (h *SettingsHandler) GetPublicSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	out := struct {
		SiteName              string `json:"site_name"`
		DefaultTheme          string `json:"default_theme"`
		DefaultLanguage       string `json:"default_language"`
		Timezone              string `json:"timezone"`
		AnimationsEnabled     bool   `json:"animations_enabled"`
		MaintenanceMode       bool   `json:"maintenance_mode"`
		SessionTimeoutMinutes int    `json:"session_timeout_minutes"`
	}{
		// Defaults si la iglesia aún no tiene fila de settings
		SiteName: "SionERP", DefaultTheme: "light", DefaultLanguage: "es",
		Timezone: "UTC", AnimationsEnabled: true,
	}

	err = q.QueryRow(`
		SELECT site_name, default_theme, default_language, timezone,
		       animations_enabled, maintenance_mode, COALESCE(session_timeout_minutes, 0)
		FROM system_settings WHERE church_id = $1 LIMIT 1
	`, churchID).Scan(
		&out.SiteName, &out.DefaultTheme, &out.DefaultLanguage, &out.Timezone,
		&out.AnimationsEnabled, &out.MaintenanceMode, &out.SessionTimeoutMinutes,
	)
	if err != nil && err != sql.ErrNoRows {
		c.Logger().Error("Error fetching public settings: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get settings"})
	}

	return c.JSON(http.StatusOK, out)
}

// GetRegistrationStatus — endpoint PÚBLICO (sin auth) para que la página de
// registro sepa si el auto-registro está habilitado. La página pública aplica
// a la iglesia por defecto (deploy single-domain); el enforcement real vive
// en el trigger handle_new_user.
func (h *SettingsHandler) GetRegistrationStatus(c echo.Context) error {
	const defaultChurch = "00000000-0000-0000-0000-00000000515e"
	allow := true
	if db := config.GetDB(); db != nil && db.DB != nil {
		_ = db.DB.QueryRow(
			`SELECT allow_registrations FROM system_settings WHERE church_id = $1 LIMIT 1`,
			defaultChurch,
		).Scan(&allow)
	}
	return c.JSON(http.StatusOK, map[string]bool{"allow_registrations": allow})
}

// GetChurchInfo obtiene información de la iglesia
func (h *SettingsHandler) GetChurchInfo(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	query := `SELECT id, name, pastor_name, description, mission, vision, address, phone, email,
		website, logo_url, banner_url, primary_color, secondary_color, social_facebook,
		social_instagram, social_youtube, social_twitter, service_times, created_at, updated_at
		FROM church_info WHERE church_id = $1 LIMIT 1`

	var info models.ChurchInfo
	err = q.QueryRow(query, churchID).Scan(
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
			"error":   "Failed to get church info",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, info)
}

// UpdateChurchInfo actualiza información de la iglesia
func (h *SettingsHandler) UpdateChurchInfo(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Resolve the church_info row id for this church
	var infoID string
	if err := q.QueryRow("SELECT id FROM church_info WHERE church_id = $1 LIMIT 1", churchID).Scan(&infoID); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Church info not found for this church"})
	}

	// WithNulls: church_info permite LIMPIAR campos opcionales (logo/banner/redes/etc.)
	// enviando null explícito — necesario para el botón de eliminar logo.
	updateQuery, args, err := database.BuildUpdateQueryFromMapWithNulls(req, "church_info", "id", infoID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "Failed to build update query",
			"message": err.Error(),
		})
	}

	_, err = q.Exec(updateQuery, args...)
	if err != nil {
		c.Logger().Error("Error updating church info: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to update church info",
			"message": err.Error(),
		})
	}

	// Retornar la info actualizada
	return h.GetChurchInfo(c)
}

// GetNotificationConfig obtiene configuración de notificaciones
func (h *SettingsHandler) GetNotificationConfig(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	query := `SELECT id, email_enabled, sms_enabled, push_enabled, new_user_notifications,
		role_change_notifications, weekly_reports, event_reminders, important_messages,
		smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name,
		created_at, updated_at FROM notification_config WHERE church_id = $1 LIMIT 1`

	var notifConfig models.NotificationConfig
	err = q.QueryRow(query, churchID).Scan(
		&notifConfig.ID, &notifConfig.EmailEnabled, &notifConfig.SMSEnabled, &notifConfig.PushEnabled,
		&notifConfig.NewUserNotifications, &notifConfig.RoleChangeNotifications, &notifConfig.WeeklyReports,
		&notifConfig.EventReminders, &notifConfig.ImportantMessages, &notifConfig.SMTPHost, &notifConfig.SMTPPort,
		&notifConfig.SMTPUser, &notifConfig.SMTPPassword, &notifConfig.SMTPFromEmail, &notifConfig.SMTPFromName,
		&notifConfig.CreatedAt, &notifConfig.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Notification config not found",
			})
		}
		c.Logger().Error("Error fetching notification config: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to get notification config",
			"message": err.Error(),
		})
	}

	// Nunca devolver el secreto SMTP al cliente (write-only).
	notifConfig.SMTPPassword = models.NullString{}

	return c.JSON(http.StatusOK, notifConfig)
}

// UpdateNotificationConfig actualiza configuración de notificaciones
func (h *SettingsHandler) UpdateNotificationConfig(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var req map[string]interface{}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Resolve the notification_config row id for this church
	var configID string
	if err := q.QueryRow("SELECT id FROM notification_config WHERE church_id = $1 LIMIT 1", churchID).Scan(&configID); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Notification config not found for this church"})
	}

	updateQuery, args, err := database.BuildUpdateQueryFromMap(req, "notification_config", "id", configID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "Failed to build update query",
			"message": err.Error(),
		})
	}
	_, err = q.Exec(updateQuery, args...)
	if err != nil {
		c.Logger().Error("Error updating notification config: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to update notification config",
			"message": err.Error(),
		})
	}

	// Retornar la config actualizada
	return h.GetNotificationConfig(c)
}

// ensure config is used (imported for GetDB usage in goroutines elsewhere)
var _ = config.GetDB
