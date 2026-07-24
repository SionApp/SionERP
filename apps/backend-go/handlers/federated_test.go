// Redeem del acceso federado (I2 fase 1, modo read) — integración real
// contra Postgres (RLS, jetro_app, FK/UNIQUE de federated_sessions_log).
//
// Guardado por SUPABASE_DB_URL: si no está seteada (CI sin DB todavía), el
// test se saltea limpio — mismo criterio que isolation_test.go
// (INTEGRATION_TEST_DSN). Para correrlo local contra el Supabase local
// (`supabase start`):
//
//	SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
//	  go test ./handlers/ -run TestFederatedRedeem -v
//
// Verificado en vivo end-to-end (server real + curl) antes de escribir este
// test — ver sesión del 2026-07-24, SDD en Engram
// sdd/federated-access-verify/*: replay, tenant desconocido, expirado,
// mode=edit, GET permitido con datos reales scoped por RLS, PUT bloqueado
// por FederatedReadOnly antes de llegar al handler real.
package handlers

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend-sion/middleware"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

const sionChurchID = "00000000-0000-0000-0000-00000000515e" // Iglesia Sion, seed fijo (create_churches.sql)

func skipWithoutDB(t *testing.T) {
	t.Helper()
	if os.Getenv("SUPABASE_DB_URL") == "" {
		t.Skip("SUPABASE_DB_URL not set — skipping federated redeem integration test")
	}
}

func federatedTestKeys(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey, string) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate ed25519 keypair: %v", err)
	}
	pkixBytes, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		t.Fatalf("failed to marshal public key: %v", err)
	}
	pubPEM := string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pkixBytes}))
	return pub, priv, pubPEM
}

// signBondevStyleToken firma un token EXACTAMENTE como lo hace bondev (ver
// apps/api/internal/auth/federated.go del lado emisor) — usa
// middleware.FederatedClaims directamente (exportado) en vez de reimplementar
// el shape a mano.
func signBondevStyleToken(t *testing.T, priv ed25519.PrivateKey, tenant, mode string, ttl time.Duration) string {
	t.Helper()
	now := time.Now()
	claims := middleware.FederatedClaims{
		OperatorName: "Admin Preview (test)",
		Tenant:       tenant,
		Mode:         mode,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "bondev",
			Subject:   "operator-test-1",
			ID:        "jti-" + time.Now().Format("20060102150405.000000000"),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	signed, err := token.SignedString(priv)
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return signed
}

func redeemRequest(token string) (*http.Request, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/federated/redeem?token="+token, nil)
	rec := httptest.NewRecorder()
	return req, rec
}

func TestFederatedRedeem_ValidToken_SetsCookieAndAudits(t *testing.T) {
	skipWithoutDB(t)
	_, priv, pubPEM := federatedTestKeys(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", pubPEM)
	t.Setenv("FEDERATED_SESSION_SECRET", "test-federated-session-secret-for-this-test")

	h := NewFederatedHandler()
	e := echo.New()
	token := signBondevStyleToken(t, priv, sionChurchID, "read", 5*time.Minute)
	req, rec := redeemRequest(token)
	c := e.NewContext(req, rec)

	if err := h.Redeem(c); err != nil {
		t.Fatalf("Redeem returned error: %v", err)
	}
	if rec.Code != http.StatusFound {
		t.Fatalf("expected 302, got %d: %s", rec.Code, rec.Body.String())
	}

	cookies := rec.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, ck := range cookies {
		if ck.Name == middleware.FederatedCookieName {
			sessionCookie = ck
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected the federated session cookie to be set")
	}
	if !sessionCookie.HttpOnly {
		t.Fatal("expected the federated session cookie to be HttpOnly")
	}
}

func TestFederatedRedeem_ReplayedToken_Rejected(t *testing.T) {
	skipWithoutDB(t)
	_, priv, pubPEM := federatedTestKeys(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", pubPEM)
	t.Setenv("FEDERATED_SESSION_SECRET", "test-federated-session-secret-for-this-test")

	h := NewFederatedHandler()
	e := echo.New()
	token := signBondevStyleToken(t, priv, sionChurchID, "read", 5*time.Minute)

	req1, rec1 := redeemRequest(token)
	if err := h.Redeem(e.NewContext(req1, rec1)); err != nil {
		t.Fatalf("first Redeem returned error: %v", err)
	}
	if rec1.Code != http.StatusFound {
		t.Fatalf("expected first redeem to succeed (302), got %d: %s", rec1.Code, rec1.Body.String())
	}

	req2, rec2 := redeemRequest(token) // MISMO token, MISMO jti
	if err := h.Redeem(e.NewContext(req2, rec2)); err != nil {
		t.Fatalf("second Redeem returned error: %v", err)
	}
	if rec2.Code != http.StatusUnauthorized {
		t.Fatalf("expected replay to be rejected with 401, got %d: %s", rec2.Code, rec2.Body.String())
	}
}

func TestFederatedRedeem_UnknownTenant_Rejected(t *testing.T) {
	skipWithoutDB(t)
	_, priv, pubPEM := federatedTestKeys(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", pubPEM)
	t.Setenv("FEDERATED_SESSION_SECRET", "test-federated-session-secret-for-this-test")

	h := NewFederatedHandler()
	e := echo.New()
	token := signBondevStyleToken(t, priv, "11111111-1111-1111-1111-111111111111", "read", 5*time.Minute)
	req, rec := redeemRequest(token)

	if err := h.Redeem(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Redeem returned error: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for an unknown tenant, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestFederatedRedeem_ExpiredToken_Rejected(t *testing.T) {
	skipWithoutDB(t)
	_, priv, pubPEM := federatedTestKeys(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", pubPEM)
	t.Setenv("FEDERATED_SESSION_SECRET", "test-federated-session-secret-for-this-test")

	h := NewFederatedHandler()
	e := echo.New()
	token := signBondevStyleToken(t, priv, sionChurchID, "read", -5*time.Minute) // ya vencido
	req, rec := redeemRequest(token)

	if err := h.Redeem(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Redeem returned error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for an expired token, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestFederatedRedeem_EditMode_ExplicitlyRejected_NotTreatedAsRead(t *testing.T) {
	skipWithoutDB(t)
	_, priv, pubPEM := federatedTestKeys(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", pubPEM)
	t.Setenv("FEDERATED_SESSION_SECRET", "test-federated-session-secret-for-this-test")

	h := NewFederatedHandler()
	e := echo.New()
	token := signBondevStyleToken(t, priv, sionChurchID, "edit", 5*time.Minute)
	req, rec := redeemRequest(token)

	if err := h.Redeem(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Redeem returned error: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for mode=edit (not yet supported), got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestFederatedRedeem_NotConfigured_Returns503(t *testing.T) {
	skipWithoutDB(t)
	t.Setenv("FEDERATED_PUBLIC_KEY_PEM", "") // deshabilitado a propósito

	h := NewFederatedHandler()
	e := echo.New()
	req, rec := redeemRequest("any-token-value")

	if err := h.Redeem(e.NewContext(req, rec)); err != nil {
		t.Fatalf("Redeem returned error: %v", err)
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when federated access is not configured, got %d: %s", rec.Code, rec.Body.String())
	}
}
