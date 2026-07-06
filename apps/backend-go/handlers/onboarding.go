// Package handlers — POST /api/v1/onboarding/church
// Unauthenticated endpoint. Provisions a new church + first admin user.
// Registered OUTSIDE the protected group (no TenantTx).
// NEVER accepts a caller-supplied church_id — always generates a fresh UUID.
package handlers

import (
	"backend-sion/config"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// OnboardingHandler handles church provisioning requests.
type OnboardingHandler struct{}

// NewOnboardingHandler returns a new OnboardingHandler.
func NewOnboardingHandler() *OnboardingHandler {
	return &OnboardingHandler{}
}

// provisionChurchRequest is the request body for POST /api/v1/onboarding/church.
// Note: any church_id field in the body is intentionally ignored — the server always
// generates a fresh UUID.
type provisionChurchRequest struct {
	Name          string `json:"name"`
	AdminEmail    string `json:"admin_email"`
	AdminPassword string `json:"admin_password"`
	AdminFirstName string `json:"admin_first_name"`
	AdminLastName  string `json:"admin_last_name"`
}

var onboardingEmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// slugify converts a church name into a URL-safe slug.
// E.g. "Iglesia Sión Córdoba" → "iglesia-sion-cordoba"
func slugify(name string) string {
	// Normalize: lowercase, remove accents, replace non-alphanumeric with "-"
	var sb strings.Builder
	for _, r := range strings.ToLower(name) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			sb.WriteRune(r)
		case unicode.IsSpace(r) || r == '-' || r == '_':
			sb.WriteRune('-')
		// Common Spanish/accented characters → ASCII equivalent
		case r == 'á' || r == 'à' || r == 'ä' || r == 'â':
			sb.WriteRune('a')
		case r == 'é' || r == 'è' || r == 'ë' || r == 'ê':
			sb.WriteRune('e')
		case r == 'í' || r == 'ì' || r == 'ï' || r == 'î':
			sb.WriteRune('i')
		case r == 'ó' || r == 'ò' || r == 'ö' || r == 'ô':
			sb.WriteRune('o')
		case r == 'ú' || r == 'ù' || r == 'ü' || r == 'û':
			sb.WriteRune('u')
		case r == 'ñ':
			sb.WriteRune('n')
		case r == 'ç':
			sb.WriteRune('c')
		// Everything else is dropped
		}
	}
	// Collapse consecutive dashes
	slug := regexp.MustCompile(`-{2,}`).ReplaceAllString(sb.String(), "-")
	return strings.Trim(slug, "-")
}

// ProvisionChurch handles POST /api/v1/onboarding/church.
// It creates a new church, seeds per-church defaults, and creates the first admin user.
// On ANY error it rolls back — no partial state is left behind.
func (h *OnboardingHandler) ProvisionChurch(c echo.Context) error {
	var req provisionChurchRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	// --- Input validation ---
	if strings.TrimSpace(req.Name) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name is required"})
	}
	if strings.TrimSpace(req.AdminEmail) == "" || !onboardingEmailRegex.MatchString(req.AdminEmail) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "valid admin_email is required"})
	}
	if len(req.AdminPassword) < 8 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "admin_password must be at least 8 characters"})
	}
	if strings.TrimSpace(req.AdminFirstName) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "admin_first_name is required"})
	}
	if strings.TrimSpace(req.AdminLastName) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "admin_last_name is required"})
	}

	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	// --- Generate a fresh church UUID (NEVER from request body) ---
	churchID := uuid.New().String()
	slug := slugify(req.Name)

	// --- Step 1: Begin DB transaction ---
	tx, err := db.DB.BeginTx(c.Request().Context(), nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to begin transaction"})
	}
	// Track whether we need to rollback the auth user separately.
	authUserID := ""
	rollback := func() {
		_ = tx.Rollback()
		if authUserID != "" {
			supabase := config.NewSupabaseClient()
			if delErr := supabase.DeleteAuthUser(authUserID); delErr != nil {
				c.Logger().Errorf("onboarding rollback: failed to delete auth user %s: %v", authUserID, delErr)
			}
		}
	}

	// --- Step 2: Insert the church row ---
	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW())`,
		churchID, req.Name, slug,
	)
	if err != nil {
		rollback()
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "a church with that slug already exists"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "failed to create church",
			"message": err.Error(),
		})
	}

	// --- Step 3: Seed per-church defaults ---

	// 3a. Seed base module (installed = true)
	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.modules (key, name, description, is_installed, installed_at, church_id)
		 VALUES ('base', 'Sistema Base', 'Funcionalidades principales: Usuarios, Configuración', true, NOW(), $1)
		 ON CONFLICT (church_id, key) DO NOTHING`,
		churchID,
	)
	if err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "failed to seed base module",
			"message": err.Error(),
		})
	}

	// 3b. Seed discipleship module (not installed — admin can activate later)
	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.modules (key, name, description, is_installed, church_id)
		 VALUES ('discipleship', 'Discipulado', 'Gestión de grupos, jerarquías y reportes', false, $1)
		 ON CONFLICT (church_id, key) DO NOTHING`,
		churchID,
	)
	if err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to seed discipleship module",
		})
	}

	// 3c. Seed 5 standard discipleship levels for this church.
	// Use fresh UUIDs (NOT the hardcoded Sion-era UUIDs from 001_create_discipleship_levels.sql).
	type level struct {
		name        string
		description string
		icon        string
		color       string
		orderIndex  int
	}
	levels := []level{
		{"Pastoral", "Nivel Pastoral", "crown", "#8b5cf6", 1},
		{"Coordinador General", "Coordinador General", "shield", "#06b6d4", 2},
		{"Coordinador", "Coordinador de zona", "shield", "#10b981", 3},
		{"Supervisor Auxiliar", "Supervisor Auxiliar", "users", "#f59e0b", 4},
		{"Líder", "Líder de célula", "user", "#6b7280", 5},
	}
	for _, l := range levels {
		_, err = tx.ExecContext(c.Request().Context(),
			`INSERT INTO public.discipleship_levels
			   (id, name, description, icon, color, order_index, is_active, church_id, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
			 ON CONFLICT DO NOTHING`,
			l.name, l.description, l.icon, l.color, l.orderIndex, churchID,
		)
		if err != nil {
			rollback()
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error":   fmt.Sprintf("failed to seed discipleship level '%s'", l.name),
				"message": err.Error(),
			})
		}
	}

	// 3d. Seed church_info singleton for this church.
	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.church_info (church_id, church_name, created_at, updated_at)
		 VALUES ($1, $2, NOW(), NOW())
		 ON CONFLICT (church_id) DO NOTHING`,
		churchID, req.Name,
	)
	if err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to seed church_info",
		})
	}

	// 3e. Seed system_settings singleton for this church.
	_, err = tx.ExecContext(c.Request().Context(),
		`INSERT INTO public.system_settings (church_id, created_at, updated_at)
		 VALUES ($1, NOW(), NOW())
		 ON CONFLICT (church_id) DO NOTHING`,
		churchID,
	)
	if err != nil {
		// system_settings may not exist or may have different columns — non-fatal warning.
		c.Logger().Warnf("onboarding: could not seed system_settings for church %s: %v", churchID, err)
	}

	// --- Step 4: Create admin user in Supabase Auth ---
	// This runs OUTSIDE the DB tx (Supabase Auth is a separate system).
	// We create the auth user AFTER the DB tx is built up, so if auth creation
	// fails we only rollback the DB tx (no orphaned auth user).
	// If auth creation succeeds but DB commit fails, we delete the auth user.
	supabase := config.NewSupabaseClient()
	authUser, err := supabase.CreateUserWithEmailPassword(
		req.AdminEmail,
		req.AdminPassword,
		map[string]interface{}{
			"first_name": req.AdminFirstName,
			"last_name":  req.AdminLastName,
			"role":       "admin",
		},
		map[string]interface{}{
			"church_id": churchID,
		},
		// No explicit UUID — Supabase generates one; handle_new_user trigger will
		// insert into public.users with the same id.
	)
	if err != nil {
		rollback()
		errMsg := err.Error()
		if strings.Contains(errMsg, "already been registered") ||
			strings.Contains(errMsg, "email_exists") ||
			strings.Contains(errMsg, "duplicate") {
			return c.JSON(http.StatusConflict, map[string]string{
				"error":   "email already registered",
				"message": "An account with this email already exists in the system.",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "failed to create admin user in auth",
			"message": errMsg,
		})
	}
	// Record the auth user ID so we can delete it on DB commit failure.
	authUserID = authUser.ID

	// --- Step 5: Commit the DB transaction ---
	if err := tx.Commit(); err != nil {
		rollback() // This will also try to delete the auth user.
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "failed to commit church provisioning",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"church_id":    churchID,
		"church_name":  req.Name,
		"church_slug":  slug,
		"admin_email":  req.AdminEmail,
		"admin_user_id": authUser.ID,
		"message":      "Church provisioned successfully. Sign in with your admin credentials.",
	})
}
