package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func TestFederatedReadOnly_BlocksWritesForFederatedSession(t *testing.T) {
	methods := []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(method, "/test", nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.Set("is_federated", true)

			handler := FederatedReadOnly()(okHandler)
			if err := handler(c); err != nil {
				t.Fatalf("handler returned error: %v", err)
			}
			if rec.Code != http.StatusForbidden {
				t.Fatalf("expected 403 for federated %s, got %d", method, rec.Code)
			}
		})
	}
}

func TestFederatedReadOnly_AllowsGetForFederatedSession(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("is_federated", true)

	handler := FederatedReadOnly()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for federated GET, got %d", rec.Code)
	}
}

func TestFederatedReadOnly_AllowsWritesInEditMode(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("is_federated", true)
	c.Set("federated_mode", "edit")

	handler := FederatedReadOnly()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for a federated POST in edit mode, got %d", rec.Code)
	}
}

func TestFederatedReadOnly_NonFederatedSession_AllowsWrites(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	// is_federated ausente — sesión normal, no debe tocarla.

	handler := FederatedReadOnly()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for a normal (non-federated) POST, got %d", rec.Code)
	}
}

func TestFederatedSessionAuth_NoCookieOrHeader_PassesThroughUntouched(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handler := FederatedSessionAuth()(func(c echo.Context) error {
		called = true
		if _, ok := c.Get("is_federated").(bool); ok {
			t.Fatal("is_federated should not be set for a request with no token at all")
		}
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !called {
		t.Fatal("expected the next handler to run for a request with no federated session")
	}
}

func TestFederatedSessionAuth_GarbageBearerToken_PassesThroughUntouched(t *testing.T) {
	t.Setenv("FEDERATED_SESSION_SECRET", "test-secret-for-this-test-only")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer this-is-not-a-jwt")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := FederatedSessionAuth()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected the request to pass through to the next handler (200), got %d", rec.Code)
	}
	if _, ok := c.Get("is_federated").(bool); ok {
		t.Fatal("is_federated should not be set for a garbage token")
	}
}

func TestFederatedSessionAuth_ValidSessionToken_SetsContextAndBypassesRest(t *testing.T) {
	t.Setenv("FEDERATED_SESSION_SECRET", "test-secret-for-this-test-only")

	signed, err := SignFederatedSession("op-1", "Admin Preview", "00000000-0000-0000-0000-00000000515e", "read", "", "", time.Now().Add(5*time.Minute))
	if err != nil {
		t.Fatalf("SignFederatedSession returned error: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := FederatedSessionAuth()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if role, _ := c.Get("role").(string); role != FederatedRole {
		t.Fatalf("expected role=%s, got %v", FederatedRole, c.Get("role"))
	}
	if churchID, _ := c.Get("church_id").(string); churchID != "00000000-0000-0000-0000-00000000515e" {
		t.Fatalf("expected church_id to match the session claim, got %v", c.Get("church_id"))
	}
	if isFederated, _ := c.Get("is_federated").(bool); !isFederated {
		t.Fatal("expected is_federated=true")
	}
	if hasAdmin, _ := c.Get("has_admin_access").(bool); hasAdmin {
		t.Fatal("a read-mode federated session must never have admin access")
	}
}

func TestFederatedSessionAuth_EditMode_UsesRealRole(t *testing.T) {
	t.Setenv("FEDERATED_SESSION_SECRET", "test-secret-for-this-test-only")

	shadowUserID := "11111111-1111-1111-1111-111111111111"
	signed, err := SignFederatedSession("op-1", "Support Operator", "00000000-0000-0000-0000-00000000515e", "edit", "staff", shadowUserID, time.Now().Add(5*time.Minute))
	if err != nil {
		t.Fatalf("SignFederatedSession returned error: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := FederatedSessionAuth()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if role, _ := c.Get("role").(string); role != "staff" {
		t.Fatalf("expected role=staff in edit mode, got %v", c.Get("role"))
	}
	if mode, _ := c.Get("federated_mode").(string); mode != "edit" {
		t.Fatalf("expected federated_mode=edit, got %v", c.Get("federated_mode"))
	}
	if hasAdmin, _ := c.Get("has_admin_access").(bool); !hasAdmin {
		t.Fatal("expected has_admin_access=true for role=staff in edit mode")
	}
	if userID, _ := c.Get("user_id").(string); userID != shadowUserID {
		t.Fatalf("expected user_id to be the shadow row's real UUID (%s), got %v", shadowUserID, c.Get("user_id"))
	}
}
