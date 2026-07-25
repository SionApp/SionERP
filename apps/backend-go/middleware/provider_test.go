package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestProviderKeyAuth_MissingHeader_Returns401(t *testing.T) {
	os.Setenv("PROVIDER_API_KEY", "secret-key")
	defer os.Unsetenv("PROVIDER_API_KEY")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/provider/tenants", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handler := ProviderKeyAuth()(func(c echo.Context) error {
		called = true
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if called {
		t.Fatal("expected ProviderKeyAuth to block the request, but next(c) was called")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestProviderKeyAuth_WrongKey_Returns401(t *testing.T) {
	os.Setenv("PROVIDER_API_KEY", "secret-key")
	defer os.Unsetenv("PROVIDER_API_KEY")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/provider/tenants", nil)
	req.Header.Set("X-Provider-Key", "wrong-key")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := ProviderKeyAuth()(func(c echo.Context) error {
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestProviderKeyAuth_CorrectKey_PassesThrough(t *testing.T) {
	os.Setenv("PROVIDER_API_KEY", "secret-key")
	defer os.Unsetenv("PROVIDER_API_KEY")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/provider/tenants", nil)
	req.Header.Set("X-Provider-Key", "secret-key")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handler := ProviderKeyAuth()(func(c echo.Context) error {
		called = true
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !called {
		t.Fatal("expected ProviderKeyAuth to call next(c) with the correct key")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestProviderKeyAuth_NoServerKeyConfigured_Returns401(t *testing.T) {
	os.Unsetenv("PROVIDER_API_KEY")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/provider/tenants", nil)
	req.Header.Set("X-Provider-Key", "anything")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := ProviderKeyAuth()(func(c echo.Context) error {
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 when PROVIDER_API_KEY is unset, got %d", rec.Code)
	}
}
