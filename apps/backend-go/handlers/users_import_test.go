// users_import_test.go — regression coverage for the Phase 3f church_id fix
// in insertUserChunk (handlers/users_import.go), following the same
// INTEGRATION_TEST_DSN / superuserSeedDB / setTenantContext conventions as
// isolation_test.go and education_isolation_test.go.
package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// TestInsertUserChunkChurchIDMatchesCaller
//
// Regression target: before Phase 3f, insertUserChunk's INSERT into `users`
// carried no church_id column at all, so every bulk-imported user silently
// landed in the hardcoded default church (00000000-0000-0000-0000-00000000515e,
// set by a migration's column DEFAULT) regardless of which church's admin ran
// the import. The fix added church_id to the INSERT, bound to the caller's
// own churchID parameter — this test is the regression proof that shipped
// with zero coverage.
//
// Seeds one non-default church, runs a real chunk insert scoped to it, then
// reads the row back through a SEPARATE superuser connection (bypassing RLS)
// so the assertion checks the actual stored column value — not just what
// jetro_app's own RLS-filtered view of it would show, which would already be
// scoped to the tenant context regardless of what the INSERT itself wrote.
// ─────────────────────────────────────────────────────────────────────────────
func TestInsertUserChunkChurchIDMatchesCaller(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-000000000020"
	// The hardcoded default church a bare column DEFAULT used to silently
	// backfill onto every bulk-imported user before Phase 3f (see
	// handlers/settings.go's defaultChurch / handlers/federated_test.go's
	// sionChurchID) — must NEVER be what this test's row ends up with.
	const legacyDefaultChurch = "00000000-0000-0000-0000-00000000515e"
	const testEmail = "bulk-import-churchid-test@example.test"
	const testIDNumber = "bulk-import-churchid-test"

	_, err := seedDB.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Bulk Import ChurchID Test Church', 'bulk-import-churchid-test-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		church,
	)
	if err != nil {
		t.Fatalf("seed church: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE email = $1`, testEmail)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	setTenantContext(t, tx, church)

	row := UserImportRow{
		FirstName: "Bulk",
		LastName:  "ImportChurchIDTest",
		Email:     testEmail,
		IdNumber:  testIDNumber,
		Role:      "member",
	}
	inserted, errs := insertUserChunk(tx, []UserImportRow{row}, []int{1}, church)
	if inserted != 1 || len(errs) != 0 {
		_ = tx.Rollback()
		t.Fatalf("insertUserChunk: expected 1 row inserted with no errors, got inserted=%d errs=%+v", inserted, errs)
	}

	if err := tx.Commit(); err != nil {
		t.Fatalf("test tx commit: %v", err)
	}

	var gotChurchID string
	err = seedDB.QueryRow(`SELECT church_id FROM public.users WHERE email = $1`, testEmail).Scan(&gotChurchID)
	if err != nil {
		t.Fatalf("read back inserted row: %v", err)
	}
	if gotChurchID != church {
		t.Errorf("church_id = %q, want caller's own church %q", gotChurchID, church)
	}
	if gotChurchID == legacyDefaultChurch {
		t.Errorf("church_id fell back to the hardcoded legacy default church %q — the Phase 3f regression is back", legacyDefaultChurch)
	}
}

func TestValidateImportRows_SkipsInvalidAndDedups(t *testing.T) {
	rows := []UserImportRow{
		{FirstName: "Ana", LastName: "Pérez", Email: "ana@iglesia.org"},
		{FirstName: "", LastName: "Sin Nombre", Email: "sin@iglesia.org"},
		{FirstName: "Mal", LastName: "Email", Email: "no-es-un-email"},
		{FirstName: "Ana", LastName: "Duplicada", Email: "ANA@iglesia.org"},
		{FirstName: "Rol", LastName: "Inválido", Email: "rol@iglesia.org", Role: "arcangel"},
	}

	valid, validIdx, result := validateImportRows(rows, 0)

	if len(valid) != 1 || valid[0].Email != "ana@iglesia.org" {
		t.Fatalf("expected only the first row to survive, got %+v", valid)
	}
	if len(validIdx) != 1 || validIdx[0] != 1 {
		t.Fatalf("expected 1-based row number 1, got %v", validIdx)
	}
	if valid[0].Role != utils.RoleServer {
		t.Fatalf("expected the default role %q, got %q", utils.RoleServer, valid[0].Role)
	}
	if result.Skipped != 4 {
		t.Fatalf("expected 4 skipped, got %d", result.Skipped)
	}

	reasons := map[string]bool{}
	for _, e := range result.Errors {
		reasons[e.Reason] = true
	}
	for _, want := range []string{"missing_required", "invalid_email", "duplicate_in_batch", "invalid_role"} {
		if !reasons[want] {
			t.Fatalf("expected a %q error, got %+v", want, result.Errors)
		}
	}
}

func TestValidateImportRows_RoleCapOnlyWhenCallerLevelSet(t *testing.T) {
	rows := []UserImportRow{{FirstName: "Pastor", LastName: "Nuevo", Email: "pastor@iglesia.org", Role: utils.RolePastor}}

	// callerLevel 0 = no cap (provider path): the pastor row survives.
	valid, _, result := validateImportRows(rows, 0)
	if len(valid) != 1 {
		t.Fatalf("expected no role cap with callerLevel 0, got %+v", result.Errors)
	}

	// A caller below pastor level cannot import a pastor.
	valid, _, result = validateImportRows(rows, utils.GetRoleLevel(utils.RoleServer))
	if len(valid) != 0 {
		t.Fatal("expected the pastor row to be capped for a server-level caller")
	}
	if len(result.Errors) != 1 || result.Errors[0].Reason != "role_above_caller" {
		t.Fatalf("expected role_above_caller, got %+v", result.Errors)
	}
}

func TestProviderBulkImportUsers_RejectsEmptyAndOversizedBatches(t *testing.T) {
	h := &UserHandler{}
	e := echo.New()

	cases := []struct {
		name string
		body string
	}{
		{"empty", `{"users":[]}`},
		{"oversized", `{"users":[` + strings.Repeat(`{"first_name":"A","last_name":"B","email":"a@b.org"},`, 1000) + `{"first_name":"A","last_name":"B","email":"z@b.org"}]}`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/provider/tenants/abc/users/bulk", strings.NewReader(tc.body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues("abc")

			if err := h.ProviderBulkImportUsers(c); err != nil {
				t.Fatalf("handler returned error: %v", err)
			}
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestProviderBulkImportUsers_RejectsMissingTenantID(t *testing.T) {
	h := &UserHandler{}
	e := echo.New()

	req := httptest.NewRequest(http.MethodPost, "/provider/tenants//users/bulk", strings.NewReader(`{"users":[{"first_name":"A","last_name":"B","email":"a@b.org"}]}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("")

	if err := h.ProviderBulkImportUsers(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for a missing tenant id, got %d: %s", rec.Code, rec.Body.String())
	}
}
