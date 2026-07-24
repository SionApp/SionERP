// Package handlers — GET /federated/redeem: canje del token de acceso
// federado que emite BonDev (control plane / back-office del proveedor).
// Ruta PÚBLICA (fuera de SupabaseAuth/TenantTx, no hay sesión previa que
// canjear). Ver SDD completo en Engram (proyecto "sionerp",
// sdd/federated-access-verify/{proposal,spec,design,tasks}).
package handlers

import (
	"net/http"
	"os"
	"strings"

	"backend-sion/config"
	"backend-sion/middleware"

	"github.com/labstack/echo/v4"
)

// FederatedHandler expone el canje de acceso federado.
type FederatedHandler struct{}

// NewFederatedHandler construye el handler.
func NewFederatedHandler() *FederatedHandler {
	return &FederatedHandler{}
}

// Redeem GET /federated/redeem?token=<jwt> — verifica el token EdDSA de
// BonDev, registra el canje (anti-replay real vía UNIQUE(jti) + FK a
// churches, no un chequeo a mano con condición de carrera) y emite una
// sesión efímera de sólo lectura como cookie httpOnly.
func (h *FederatedHandler) Redeem(c echo.Context) error {
	tokenString := c.QueryParam("token")
	if tokenString == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "token is required"})
	}

	pubKeyPEM := os.Getenv("FEDERATED_PUBLIC_KEY_PEM")
	if pubKeyPEM == "" {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "federated access is not configured"})
	}
	pubKey, err := middleware.ParseFederatedPublicKeyPEM(pubKeyPEM)
	if err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "federated access is not configured"})
	}

	claims, err := middleware.VerifyFederatedToken(tokenString, pubKey)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid or expired token"})
	}

	if claims.Issuer != "bondev" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid or expired token"})
	}

	// R6 (spec): edit NO se trata como read silenciosamente — I2 fase 2, sin
	// implementar todavía. Rechazo explícito, no un 401 genérico: no es que
	// el token sea inválido, es que el modo no está soportado.
	if claims.Mode != "read" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "federated mode not supported yet: " + claims.Mode})
	}

	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "database connection not available"})
	}

	ctx := c.Request().Context()
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to begin transaction"})
	}
	rollback := func() { _ = tx.Rollback() }

	// Mismo mecanismo que TenantTx (middleware/tenant.go): downgrade a
	// jetro_app (sin BYPASSRLS) + set_config del tenant ANTES de escribir —
	// federated_sessions_log no es un caso especial, respeta RLS real como
	// las demás 30+ tablas tenant.
	if _, err := tx.ExecContext(ctx, "SET LOCAL ROLE jetro_app"); err != nil {
		rollback()
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to set tenant role"})
	}
	if _, err := tx.ExecContext(ctx,
		"SELECT set_config('app.current_church_id', $1, true)", claims.Tenant); err != nil {
		rollback()
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid tenant"})
	}

	// Anti-replay real (R2): confiamos en la restricción de la DB, no en un
	// SELECT-luego-INSERT a mano (esa secuencia tiene condición de carrera
	// si el mismo token se canjea dos veces en simultáneo). El FK a
	// churches(id) también rechaza acá cualquier `tenant` que no exista —
	// no hace falta un SELECT previo para eso tampoco.
	_, err = tx.ExecContext(ctx, `
		INSERT INTO public.federated_sessions_log
			(jti, operator_id, operator_name, church_id, mode, origin_ip, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, claims.ID, claims.Subject, claims.OperatorName, claims.Tenant, claims.Mode,
		c.RealIP(), claims.ExpiresAt.Time)

	if err != nil {
		rollback()
		msg := err.Error()
		switch {
		case strings.Contains(msg, "duplicate") || strings.Contains(msg, "unique"):
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "token already used"})
		case strings.Contains(msg, "foreign key"):
			return c.JSON(http.StatusForbidden, map[string]string{"error": "unknown tenant"})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to redeem token"})
		}
	}

	if err := tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to commit"})
	}

	sessionToken, err := middleware.SignFederatedSession(
		claims.Subject, claims.OperatorName, claims.Tenant, claims.ExpiresAt.Time,
	)
	if err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "federated access is not configured"})
	}

	c.SetCookie(&http.Cookie{
		Name:     middleware.FederatedCookieName,
		Value:    sessionToken,
		Path:     "/",
		Expires:  claims.ExpiresAt.Time,
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteStrictMode,
	})

	return c.Redirect(http.StatusFound, "/")
}
