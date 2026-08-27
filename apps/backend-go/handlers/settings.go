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
		ChurchName            string  `json:"church_name"`
		DefaultTheme          string  `json:"default_theme"`
		DefaultLanguage       string  `json:"default_language"`
		Timezone              string  `json:"timezone"`
		AnimationsEnabled     bool    `json:"animations_enabled"`
		MaintenanceMode       bool    `json:"maintenance_mode"`
		SessionTimeoutMinutes int     `json:"session_timeout_minutes"`
		LogoURL               *string `json:"logo_url"`
	}{
		// Defaults si la iglesia aún no tiene fila de settings/church_info
		DefaultTheme: "light", DefaultLanguage: "es",
		Timezone: "UTC", AnimationsEnabled: true,
	}

	// church_name/logo_url vienen de church_info (identidad del TENANT).
	// JETRO — la marca del PRODUCTO — nunca sale de la base: es constante en el frontend.
	err = q.QueryRow(`
		SELECT COALESCE(ci.name, ''), s.default_theme, s.default_language, s.timezone,
		       s.animations_enabled, s.maintenance_mode, COALESCE(s.session_timeout_minutes, 0),
		       ci.logo_url
		FROM system_settings s
		LEFT JOIN church_info ci ON ci.church_id = s.church_id
		WHERE s.church_id = $1 LIMIT 1
	`, churchID).Scan(
		&out.ChurchName, &out.DefaultTheme, &out.DefaultLanguage, &out.Timezone,
		&out.AnimationsEnabled, &out.MaintenanceMode, &out.SessionTimeoutMinutes, &out.LogoURL,
	)
	if err != nil && err != sql.ErrNoRows {
		c.Logger().Error("Error fetching public settings: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get settings"})
	}

	return c.JSON(http.StatusOK, out)
}

// GetPublicBranding — endpoint PÚBLICO (sin auth) para la pantalla de login,
// que corre antes de que exista contexto de iglesia. Igual que
// GetRegistrationStatus, asume la iglesia por defecto (deploy single-domain).
func (h *SettingsHandler) GetPublicBranding(c echo.Context) error {
	const defaultChurch = "00000000-0000-0000-0000-00000000515e"

	out := struct {
		ChurchName string  `json:"church_name"`
		LogoURL    *string `json:"logo_url"`
	}{}

	if db := config.GetDB(); db != nil && db.DB != nil {
		_ = db.DB.QueryRow(`
			SELECT COALESCE(name, ''), logo_url FROM church_info WHERE church_id = $1 LIMIT 1
		`, defaultChurch).Scan(&out.ChurchName, &out.LogoURL)
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

// ─── Seguridad ──────────────────────────────────────────────────────────────

// GetSecuritySettings obtiene la política de seguridad de la iglesia,
// creándola con valores por defecto si todavía no existe.
func (h *SettingsHandler) GetSecuritySettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	var s models.SecuritySettings
	scanErr := q.QueryRow(`
		SELECT id, min_password_length, require_uppercase, require_number, require_special_char,
			password_expiry_days, max_login_attempts, lockout_duration_minutes, created_at, updated_at
		FROM security_settings WHERE church_id = $1
	`, churchID).Scan(
		&s.ID, &s.MinPasswordLength, &s.RequireUppercase, &s.RequireNumber, &s.RequireSpecialChar,
		&s.PasswordExpiryDays, &s.MaxLoginAttempts, &s.LockoutDurationMinutes, &s.CreatedAt, &s.UpdatedAt,
	)
	if scanErr == sql.ErrNoRows {
		_, err = q.Exec("INSERT INTO security_settings (church_id) VALUES ($1)", churchID)
		if err != nil {
			c.Logger().Error("Error creating default security settings:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get security settings"})
		}
		return h.GetSecuritySettings(c)
	} else if scanErr != nil {
		c.Logger().Error("Error fetching security settings:", scanErr)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get security settings"})
	}

	return c.JSON(http.StatusOK, s)
}

type UpdateSecuritySettingsRequest struct {
	MinPasswordLength      int  `json:"min_password_length" validate:"required,min=6,max=64"`
	RequireUppercase       bool `json:"require_uppercase"`
	RequireNumber          bool `json:"require_number"`
	RequireSpecialChar     bool `json:"require_special_char"`
	PasswordExpiryDays     *int `json:"password_expiry_days"`
	MaxLoginAttempts       int  `json:"max_login_attempts" validate:"required,min=3,max=20"`
	LockoutDurationMinutes int  `json:"lockout_duration_minutes" validate:"required,min=1,max=1440"`
}

// UpdateSecuritySettings actualiza la política de seguridad.
func (h *SettingsHandler) UpdateSecuritySettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req UpdateSecuritySettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}
	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Validación fallida: " + err.Error()})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	_, err = q.Exec(`
		INSERT INTO security_settings (
			church_id, min_password_length, require_uppercase, require_number, require_special_char,
			password_expiry_days, max_login_attempts, lockout_duration_minutes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (church_id) DO UPDATE SET
			min_password_length = EXCLUDED.min_password_length,
			require_uppercase = EXCLUDED.require_uppercase,
			require_number = EXCLUDED.require_number,
			require_special_char = EXCLUDED.require_special_char,
			password_expiry_days = EXCLUDED.password_expiry_days,
			max_login_attempts = EXCLUDED.max_login_attempts,
			lockout_duration_minutes = EXCLUDED.lockout_duration_minutes
	`, churchID, req.MinPasswordLength, req.RequireUppercase, req.RequireNumber, req.RequireSpecialChar,
		req.PasswordExpiryDays, req.MaxLoginAttempts, req.LockoutDurationMinutes)
	if err != nil {
		c.Logger().Error("Error updating security settings:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update security settings"})
	}

	return h.GetSecuritySettings(c)
}

// ─── Integraciones ──────────────────────────────────────────────────────────

// GetIntegrationSettings obtiene la config de integraciones, sin exponer
// nunca las API keys guardadas (write-only) — solo si están seteadas o no.
func (h *SettingsHandler) GetIntegrationSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	var s models.IntegrationSettings
	scanErr := q.QueryRow(`
		SELECT id, whatsapp_enabled, whatsapp_phone_number_id, whatsapp_api_key,
			payment_provider, payment_api_key, email_provider, email_api_key,
			crm_webhook_url, created_at, updated_at
		FROM integration_settings WHERE church_id = $1
	`, churchID).Scan(
		&s.ID, &s.WhatsappEnabled, &s.WhatsappPhoneNumberID, &s.WhatsappAPIKey,
		&s.PaymentProvider, &s.PaymentAPIKey, &s.EmailProvider, &s.EmailAPIKey,
		&s.CRMWebhookURL, &s.CreatedAt, &s.UpdatedAt,
	)
	if scanErr == sql.ErrNoRows {
		_, err = q.Exec("INSERT INTO integration_settings (church_id) VALUES ($1)", churchID)
		if err != nil {
			c.Logger().Error("Error creating default integration settings:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get integration settings"})
		}
		return h.GetIntegrationSettings(c)
	} else if scanErr != nil {
		c.Logger().Error("Error fetching integration settings:", scanErr)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get integration settings"})
	}

	// Write-only: nunca devolver las keys guardadas, solo si hay una seteada.
	s.WhatsappAPIKey = models.NullString{}
	s.PaymentAPIKey = models.NullString{}
	s.EmailAPIKey = models.NullString{}

	return c.JSON(http.StatusOK, s)
}

type UpdateIntegrationSettingsRequest struct {
	WhatsappEnabled       bool   `json:"whatsapp_enabled"`
	WhatsappPhoneNumberID string `json:"whatsapp_phone_number_id"`
	WhatsappAPIKey        string `json:"whatsapp_api_key"`
	PaymentProvider       string `json:"payment_provider" validate:"required,oneof=none stripe mercadopago"`
	PaymentAPIKey         string `json:"payment_api_key"`
	EmailProvider         string `json:"email_provider" validate:"required,oneof=none resend sendgrid"`
	EmailAPIKey           string `json:"email_api_key"`
	CRMWebhookURL         string `json:"crm_webhook_url"`
}

// UpdateIntegrationSettings actualiza la config de integraciones. Los campos
// *_api_key solo se sobreescriben si vienen no vacíos — mandar "" preserva
// la key ya guardada en vez de borrarla (el cliente nunca la ve para poder
// reenviarla intacta).
func (h *SettingsHandler) UpdateIntegrationSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req UpdateIntegrationSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}
	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Validación fallida: " + err.Error()})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	_, err = q.Exec(`
		INSERT INTO integration_settings (
			church_id, whatsapp_enabled, whatsapp_phone_number_id, whatsapp_api_key,
			payment_provider, payment_api_key, email_provider, email_api_key, crm_webhook_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (church_id) DO UPDATE SET
			whatsapp_enabled = EXCLUDED.whatsapp_enabled,
			whatsapp_phone_number_id = COALESCE(NULLIF(EXCLUDED.whatsapp_phone_number_id, ''), integration_settings.whatsapp_phone_number_id),
			whatsapp_api_key = COALESCE(NULLIF(EXCLUDED.whatsapp_api_key, ''), integration_settings.whatsapp_api_key),
			payment_provider = EXCLUDED.payment_provider,
			payment_api_key = COALESCE(NULLIF(EXCLUDED.payment_api_key, ''), integration_settings.payment_api_key),
			email_provider = EXCLUDED.email_provider,
			email_api_key = COALESCE(NULLIF(EXCLUDED.email_api_key, ''), integration_settings.email_api_key),
			crm_webhook_url = COALESCE(NULLIF(EXCLUDED.crm_webhook_url, ''), integration_settings.crm_webhook_url)
	`, churchID, req.WhatsappEnabled, nullIfEmpty(req.WhatsappPhoneNumberID), nullIfEmpty(req.WhatsappAPIKey),
		req.PaymentProvider, nullIfEmpty(req.PaymentAPIKey), req.EmailProvider, nullIfEmpty(req.EmailAPIKey),
		nullIfEmpty(req.CRMWebhookURL))
	if err != nil {
		c.Logger().Error("Error updating integration settings:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update integration settings"})
	}

	return h.GetIntegrationSettings(c)
}

// ─── Respaldos ──────────────────────────────────────────────────────────────

// GetBackupSettings obtiene la política de respaldo declarada por la iglesia.
func (h *SettingsHandler) GetBackupSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	var s models.BackupSettings
	scanErr := q.QueryRow(`
		SELECT id, retention_days, notify_email, created_at, updated_at
		FROM backup_settings WHERE church_id = $1
	`, churchID).Scan(&s.ID, &s.RetentionDays, &s.NotifyEmail, &s.CreatedAt, &s.UpdatedAt)
	if scanErr == sql.ErrNoRows {
		_, err = q.Exec("INSERT INTO backup_settings (church_id) VALUES ($1)", churchID)
		if err != nil {
			c.Logger().Error("Error creating default backup settings:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get backup settings"})
		}
		return h.GetBackupSettings(c)
	} else if scanErr != nil {
		c.Logger().Error("Error fetching backup settings:", scanErr)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get backup settings"})
	}

	return c.JSON(http.StatusOK, s)
}

type UpdateBackupSettingsRequest struct {
	RetentionDays int    `json:"retention_days" validate:"required,min=1,max=3650"`
	NotifyEmail   string `json:"notify_email"`
}

// UpdateBackupSettings actualiza la política de respaldo declarada.
func (h *SettingsHandler) UpdateBackupSettings(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req UpdateBackupSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}
	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Validación fallida: " + err.Error()})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	_, err = q.Exec(`
		INSERT INTO backup_settings (church_id, retention_days, notify_email)
		VALUES ($1, $2, $3)
		ON CONFLICT (church_id) DO UPDATE SET
			retention_days = EXCLUDED.retention_days,
			notify_email = EXCLUDED.notify_email
	`, churchID, req.RetentionDays, nullIfEmpty(req.NotifyEmail))
	if err != nil {
		c.Logger().Error("Error updating backup settings:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update backup settings"})
	}

	return h.GetBackupSettings(c)
}

// ensure config is used (imported for GetDB usage in goroutines elsewhere)
var _ = config.GetDB
