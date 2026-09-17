// users_import_test.go — regression coverage for the Phase 3f church_id fix
// in insertUserChunk (handlers/users_import.go), following the same
// INTEGRATION_TEST_DSN / superuserSeedDB / setTenantContext conventions as
// isolation_test.go and education_isolation_test.go.
package handlers

import (
	"testing"
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
