package middleware

import (
	"backend-sion/utils"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func newTestCtx(t *testing.T) (echo.Context, *httptest.ResponseRecorder) {
	t.Helper()
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	// LogAccessDeniedSimple does a type assertion on these — set safe defaults
	c.Set("user_id", "test-user-id")
	c.Set("email", "test@test.com")
	return c, rec
}

var okHandler = func(c echo.Context) error {
	return c.JSON(http.StatusOK, "ok")
}

func TestRequireRole(t *testing.T) {
	cases := []struct {
		name           string
		dbRole         any
		hasAdminAccess any
		minLevel       int
		wantStatus     int
	}{
		{"no role → 401", nil, nil, utils.LevelServer, http.StatusUnauthorized},
		{"empty role → 403", "", nil, utils.LevelServer, http.StatusForbidden},
		{"admin bypass skips level check → 200", "server", true, utils.LevelAdmin, http.StatusOK},
		{"pastor meets staff level → 200", "pastor", nil, utils.LevelStaff, http.StatusOK},
		{"pastor meets own level → 200", "pastor", nil, utils.LevelPastor, http.StatusOK},
		{"staff below pastor level → 403", "staff", nil, utils.LevelPastor, http.StatusForbidden},
		{"supervisor meets supervisor level → 200", "supervisor", nil, utils.LevelSupervisor, http.StatusOK},
		{"server below supervisor level → 403", "server", nil, utils.LevelSupervisor, http.StatusForbidden},
		{"server meets server level → 200", "server", nil, utils.LevelServer, http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, rec := newTestCtx(t)

			if tc.dbRole != nil {
				c.Set("db_role", tc.dbRole)
			}
			if tc.hasAdminAccess != nil {
				c.Set("has_admin_access", tc.hasAdminAccess)
			}

			handler := RequireRole(tc.minLevel)(okHandler)
			_ = handler(c)

			if rec.Code != tc.wantStatus {
				t.Errorf("status = %d; want %d", rec.Code, tc.wantStatus)
			}
		})
	}
}

func TestHasAdminAccessHelper(t *testing.T) {
	cases := []struct {
		role string
		want bool
	}{
		{utils.RolePastor, true},
		{utils.RoleStaff, true},
		{utils.RoleAdmin, true},
		{utils.RoleSupervisor, false},
		{utils.RoleServer, false},
		{"member", false},
		{"", false},
	}
	for _, tc := range cases {
		t.Run(tc.role, func(t *testing.T) {
			got := hasAdminAccessHelper("", tc.role)
			if got != tc.want {
				t.Errorf("hasAdminAccessHelper(%q) = %v; want %v", tc.role, got, tc.want)
			}
		})
	}
}
