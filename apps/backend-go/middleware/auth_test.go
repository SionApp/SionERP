package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

// TestSupabaseAuth_SkipsValidation_WhenAlreadyFederated cubre el guard
// aditivo para el acceso federado (ver federated.go): si
// FederatedSessionAuth ya autenticó la request, SupabaseAuth no debe
// intentar validarla como un JWT de Supabase — no hay Authorization header
// real en ese camino, así que sin el guard esto devolvería 401.
func TestSupabaseAuth_SkipsValidation_WhenAlreadyFederated(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("is_federated", true)
	c.Set("role", FederatedRole) // ya seteado por FederatedSessionAuth

	called := false
	handler := SupabaseAuth()(func(c echo.Context) error {
		called = true
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !called {
		t.Fatal("expected SupabaseAuth to call next(c) directly, skipping its own validation")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if role, _ := c.Get("role").(string); role != FederatedRole {
		t.Fatalf("expected the federated role to survive untouched, got %v", c.Get("role"))
	}
}

// TestSupabaseAuth_NormalRequest_StillRequiresAuthHeader confirma que el
// guard es puramente aditivo: sin is_federated, el comportamiento normal
// (401 sin Authorization header) no cambió.
func TestSupabaseAuth_NormalRequest_StillRequiresAuthHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := SupabaseAuth()(okHandler)
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for a normal request with no Authorization header, got %d", rec.Code)
	}
}
