// Package handlers — SionERP Provider API (I1), consumida por BonDev
// (control plane del proveedor) para listar/crear/administrar tenants.
// Todo el grupo /provider/* corre detrás de middleware.ProviderKeyAuth()
// (X-Provider-Key), NUNCA JWT de usuario ni TenantTx — no hay church_id
// de sesión, cada operación recibe el tenant por :id en la URL.
//
// Contrato de wire fijado por bondev (apps/api/internal/providers/sionerp/
// wire.go, repo bondev) — no renombrar campos sin actualizar ese adapter.
// Ver SDD completo en Engram, proyecto "sionerp",
// sdd/provider-api/{proposal,spec,design,tasks}.
package handlers

import (
	"backend-sion/config"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ProviderHandler handles GET/POST /provider/tenants* requests.
type ProviderHandler struct{}

// NewProviderHandler returns a new ProviderHandler.
func NewProviderHandler() *ProviderHandler {
	return &ProviderHandler{}
}

// tenantWire mirrors bondev's tenantWire struct exactly — field names/types
// are the contract, not a local convenience shape.
type tenantWire struct {
	TenantID string `json:"tenant_id"`
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	Plan     string `json:"plan"`
	Region   string `json:"region"`
	Status   string `json:"status"`
}

// tenantHealthWire mirrors bondev's tenantHealthWire struct.
type tenantHealthWire struct {
	ContractVersion   string          `json:"contract_version"`
	TenantID          string          `json:"tenant_id"`
	Status            string          `json:"status"`
	Plan              string          `json:"plan"`
	Region            string          `json:"region"`
	ActiveUsers30d    *int            `json:"active_users_30d"`
	ModuleFlags       map[string]bool `json:"module_flags"`
	LastActivityAt    *string         `json:"last_activity_at"`
	UnavailableFields []string        `json:"unavailable_fields"`
	Meta              map[string]any  `json:"meta"`
}

const providerContractVersion = "1.0"

// ListTenants handles GET /provider/tenants.
func (h *ProviderHandler) ListTenants(c echo.Context) error {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	rows, err := db.DB.Query(`
		SELECT id, slug, name, COALESCE(plan, ''), COALESCE(region, ''), status
		FROM public.churches
		ORDER BY created_at`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to list tenants"})
	}
	defer rows.Close()

	tenants := []tenantWire{}
	for rows.Next() {
		var t tenantWire
		var slug sql.NullString
		if err := rows.Scan(&t.TenantID, &slug, &t.Name, &t.Plan, &t.Region, &t.Status); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read tenant row"})
		}
		t.Slug = slug.String
		tenants = append(tenants, t)
	}

	return c.JSON(http.StatusOK, tenants)
}

// GetTenant handles GET /provider/tenants/:id.
func (h *ProviderHandler) GetTenant(c echo.Context) error {
	tenantID := c.Param("id")
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	var t tenantWire
	var slug sql.NullString
	err := db.DB.QueryRow(`
		SELECT id, slug, name, COALESCE(plan, ''), COALESCE(region, ''), status
		FROM public.churches WHERE id = $1`, tenantID,
	).Scan(&t.TenantID, &slug, &t.Name, &t.Plan, &t.Region, &t.Status)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "tenant not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch tenant"})
	}
	t.Slug = slug.String

	return c.JSON(http.StatusOK, t)
}

// GetTenantHealth handles GET /provider/tenants/:id/health.
// active_users_30d y last_activity_at se calculan en vivo sobre
// users.last_seen_at (ver design, Decisión 3) — sin cache.
func (h *ProviderHandler) GetTenantHealth(c echo.Context) error {
	tenantID := c.Param("id")
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	var status, plan, region string
	err := db.DB.QueryRow(`
		SELECT status, COALESCE(plan, ''), COALESCE(region, '')
		FROM public.churches WHERE id = $1`, tenantID,
	).Scan(&status, &plan, &region)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "tenant not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch tenant"})
	}

	var activeUsers30d int
	if err := db.DB.QueryRow(`
		SELECT count(*) FROM public.users
		WHERE church_id = $1 AND last_seen_at > now() - interval '30 days'`, tenantID,
	).Scan(&activeUsers30d); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to compute active users"})
	}

	var lastActivity sql.NullTime
	if err := db.DB.QueryRow(`
		SELECT max(last_seen_at) FROM public.users WHERE church_id = $1`, tenantID,
	).Scan(&lastActivity); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to compute last activity"})
	}

	moduleFlags := map[string]bool{}
	rows, err := db.DB.Query(`SELECT key, is_installed FROM public.modules WHERE church_id = $1`, tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch modules"})
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var installed bool
		if err := rows.Scan(&key, &installed); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to read module row"})
		}
		moduleFlags[key] = installed
	}

	health := tenantHealthWire{
		ContractVersion:   providerContractVersion,
		TenantID:          tenantID,
		Status:            status,
		Plan:              plan,
		Region:            region,
		ActiveUsers30d:    &activeUsers30d,
		ModuleFlags:       moduleFlags,
		UnavailableFields: []string{},
		Meta:              map[string]any{},
	}
	if lastActivity.Valid {
		s := lastActivity.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
		health.LastActivityAt = &s
	}

	return c.JSON(http.StatusOK, health)
}

// createTenantRequest is the body for POST /provider/tenants.
// Nota: NO tiene campo de password — BonDev nunca la elige (ver design,
// Decisión 4). El admin recibe un magic link de Supabase Auth.
type createTenantRequest struct {
	ChurchName string   `json:"church_name"`
	AdminEmail string   `json:"admin_email"`
	AdminName  string   `json:"admin_name"`
	Region     string   `json:"region"`
	Plan       string   `json:"plan"`
	Modules    []string `json:"modules"`
}

// randomThrowawayPassword genera un password aleatorio que nunca se
// devuelve ni persiste en texto plano — Supabase Auth exige uno al crear
// el usuario, pero el acceso real es vía magic link.
func randomThrowawayPassword() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// splitName parte "Nombre Apellido" en (first, last). Sin espacio, todo va a first.
func splitName(full string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(full), " ", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return parts[0], ""
}

// CreateTenant handles POST /provider/tenants — provisioning real de una
// iglesia nueva. Corre en la conexión superusuario (bypassa RLS a
// propósito, igual que onboarding.go) — no hay church_id de sesión, se
// está creando la iglesia.
func (h *ProviderHandler) CreateTenant(c echo.Context) error {
	var req createTenantRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if strings.TrimSpace(req.ChurchName) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "church_name is required"})
	}
	if strings.TrimSpace(req.AdminEmail) == "" || !onboardingEmailRegex.MatchString(req.AdminEmail) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "valid admin_email is required"})
	}
	if strings.TrimSpace(req.AdminName) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "admin_name is required"})
	}

	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	churchID := uuid.New().String()
	slug := slugify(req.ChurchName)

	tx, err := db.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to begin transaction"})
	}
	authUserID := ""
	rollback := func() {
		_ = tx.Rollback()
		if authUserID != "" {
			supabase := config.NewSupabaseClient()
			if delErr := supabase.DeleteAuthUser(authUserID); delErr != nil {
				c.Logger().Errorf("CreateTenant rollback: failed to delete auth user %s: %v", authUserID, delErr)
			}
		}
	}

	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.churches (id, name, slug, plan, region, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
		churchID, req.ChurchName, slug, req.Plan, req.Region,
	)
	if err != nil {
		rollback()
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "a church with that slug already exists"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create church"})
	}

	// 'base' siempre instalado; el resto según lo pedido en modules[].
	requestedModules := map[string]bool{"base": true}
	for _, m := range req.Modules {
		requestedModules[m] = true
	}
	for key := range requestedModules {
		_, err = tx.ExecContext(c.Request().Context(),
			`INSERT INTO public.modules (key, name, description, is_installed, installed_at, church_id)
			 VALUES ($1, $1, '', true, NOW(), $2)
			 ON CONFLICT (church_id, key) DO UPDATE SET is_installed = true, installed_at = NOW()`,
			key, churchID,
		)
		if err != nil {
			rollback()
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to install module " + key})
		}
	}

	password, err := randomThrowawayPassword()
	if err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to generate credentials"})
	}
	firstName, lastName := splitName(req.AdminName)

	supabase := config.NewSupabaseClient()
	authUser, err := supabase.CreateUserWithEmailPassword(
		req.AdminEmail,
		password,
		map[string]interface{}{
			"first_name": firstName,
			"last_name":  lastName,
			"role":       "admin",
		},
		map[string]interface{}{
			"church_id": churchID,
		},
	)
	if err != nil {
		rollback()
		errMsg := err.Error()
		if strings.Contains(errMsg, "already been registered") || strings.Contains(errMsg, "email_exists") || strings.Contains(errMsg, "duplicate") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "an account with this email already exists"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to create admin user"})
	}
	authUserID = authUser.ID

	if err := tx.Commit(); err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to commit tenant provisioning"})
	}

	// Magic link — mismo mecanismo que handlers/invite.go usa para invitar
	// usuarios sin password. Si falla, el tenant YA quedó creado (no hay
	// rollback acá — el admin puede pedir un link nuevo via "olvidé mi
	// contraseña" con el mismo mecanismo); se informa igual en la response.
	// Mismo patrón que invite.go: FRONTEND_URL del entorno, con fallback a
	// localhost sólo para dev local — nunca hardcodeado a un dominio fijo.
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // Puerto por defecto de Vite
	}
	actionLink := ""
	magicLink, mlErr := supabase.GenerateMagicLink(req.AdminEmail, frontendURL, map[string]interface{}{
		"first_name": firstName,
		"last_name":  lastName,
	})
	if mlErr != nil {
		c.Logger().Errorf("CreateTenant: failed to generate magic link for %s: %v", req.AdminEmail, mlErr)
	} else {
		actionLink = magicLink.ActionLink
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"tenant_id":      churchID,
		"slug":           slug,
		"name":           req.ChurchName,
		"plan":           req.Plan,
		"region":         req.Region,
		"status":         "active",
		"activation_url": actionLink,
	})
}

// setModuleRequest is the body for POST /provider/tenants/:id/modules.
type setModuleRequest struct {
	Module  string `json:"module"`
	Enabled bool   `json:"enabled"`
}

// SetModule handles POST /provider/tenants/:id/modules.
func (h *ProviderHandler) SetModule(c echo.Context) error {
	tenantID := c.Param("id")
	var req setModuleRequest
	if err := c.Bind(&req); err != nil || strings.TrimSpace(req.Module) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "module is required"})
	}

	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	var exists bool
	if err := db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM public.churches WHERE id = $1)`, tenantID).Scan(&exists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to verify tenant"})
	}
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "tenant not found"})
	}

	_, err := db.DB.Exec(`
		INSERT INTO public.modules (key, name, description, is_installed, installed_at, church_id)
		VALUES ($1, $1, '', $2, CASE WHEN $2 THEN NOW() ELSE NULL END, $3)
		ON CONFLICT (church_id, key) DO UPDATE SET
			is_installed = $2,
			installed_at = CASE WHEN $2 THEN COALESCE(public.modules.installed_at, NOW()) ELSE NULL END`,
		req.Module, req.Enabled, tenantID,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to set module"})
	}

	return c.NoContent(http.StatusNoContent)
}

// setTenantStatus is the shared implementation for Suspend/Reactivate.
func (h *ProviderHandler) setTenantStatus(c echo.Context, status string) error {
	tenantID := c.Param("id")
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	res, err := db.DB.Exec(`UPDATE public.churches SET status = $1, updated_at = NOW() WHERE id = $2`, status, tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update tenant status"})
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to confirm update"})
	}
	if rows == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "tenant not found"})
	}

	return c.NoContent(http.StatusNoContent)
}

// Suspend handles POST /provider/tenants/:id/suspend.
func (h *ProviderHandler) Suspend(c echo.Context) error {
	return h.setTenantStatus(c, "suspended")
}

// Reactivate handles POST /provider/tenants/:id/reactivate.
func (h *ProviderHandler) Reactivate(c echo.Context) error {
	return h.setTenantStatus(c, "active")
}
