// provider_test.go — regression coverage for the CreateTenant seeding SQL
// fixed in this branch (church_info and system_settings, Fix 1/Fix 2 of the
// whole-branch review).
//
// Task 2 (feat/provider-bulk-import-and-seeding) added a seeding block to
// CreateTenant — 5 discipleship_levels rows, one church_info row, one
// system_settings row — with no test, per the plan's own stated reasoning
// ("no harness exists for CreateTenant"). That gap is exactly what let two
// broken INSERT statements through: church_info referenced a nonexistent
// "church_name" column and an ON CONFLICT target with no matching unique
// constraint, and system_settings had the same ON CONFLICT defect — both
// only caught by a live database, never by the Go compiler.
//
// Driving the full HTTP handler here would additionally require live
// Supabase Auth for the admin-user-creation step (CreateUserWithEmailPassword
// + GenerateMagicLink), which cannot run in this test environment. Per the
// review's own guidance, this test instead seeds a church directly (the part
// CreateTenant does with no external dependency) and then runs the exact
// three seeding statements copied verbatim from CreateTenant's fixed
// discipleship_levels/church_info/system_settings block, against the same
// superuser connection CreateTenant itself uses (db.DB — no request-scoped
// role, no TenantTx, RLS bypassed by the connection itself, same as
// ProvisionChurch in onboarding.go). This is the smallest test that would
// have caught Fix 1 and Fix 2: it proves the SQL is valid against the real
// schema, without needing to exercise auth-provisioning plumbing that adds
// no coverage of the bug that shipped.
//
// Follows the same INTEGRATION_TEST_DSN / superuserSeedDB conventions as
// users_import_test.go and isolation_test.go; t.Skip when unset.
package handlers

import (
	"testing"
)

func TestCreateTenant_SeedsChurchInfoDiscipleshipLevelsAndSystemSettings(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()

	churchID := "aaaaaaaa-0000-0000-0000-000000000030"
	const churchName = "Provider Seed Test Church"

	_, err := seedDB.Exec(
		`INSERT INTO public.churches (id, name, slug, plan, region, status, created_at, updated_at)
		 VALUES ($1, $2, 'provider-seed-test-church', 'free', 'us', 'active', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		churchID, churchName,
	)
	if err != nil {
		t.Fatalf("seed church: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_levels WHERE church_id = $1`, churchID)
		_, _ = seedDB.Exec(`DELETE FROM public.church_info WHERE church_id = $1`, churchID)
		_, _ = seedDB.Exec(`DELETE FROM public.system_settings WHERE church_id = $1`, churchID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, churchID)
	}()

	// ── The exact seeding statements from CreateTenant (handlers/provider.go),
	// after Fix 1/Fix 2 ─────────────────────────────────────────────────────

	type seedLevel struct {
		name        string
		description string
		icon        string
		color       string
		orderIndex  int
	}
	for _, l := range []seedLevel{
		{"Pastoral", "Nivel Pastoral", "crown", "#8b5cf6", 1},
		{"Coordinador General", "Coordinador General", "shield", "#06b6d4", 2},
		{"Coordinador", "Coordinador de zona", "shield", "#10b981", 3},
		{"Supervisor Auxiliar", "Supervisor Auxiliar", "users", "#f59e0b", 4},
		{"Líder", "Líder de célula", "user", "#6b7280", 5},
	} {
		_, err = seedDB.Exec(
			`INSERT INTO public.discipleship_levels
			   (id, name, description, icon, color, order_index, is_active, church_id, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
			 ON CONFLICT DO NOTHING`,
			l.name, l.description, l.icon, l.color, l.orderIndex, churchID,
		)
		if err != nil {
			t.Fatalf("seed discipleship level %q: %v", l.name, err)
		}
	}

	_, err = seedDB.Exec(
		`INSERT INTO public.church_info (id, church_id, name, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
		churchID, churchName,
	)
	if err != nil {
		t.Fatalf("seed church_info: %v", err)
	}

	_, err = seedDB.Exec(
		`INSERT INTO public.system_settings (id, church_id, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, NOW(), NOW())`,
		churchID,
	)
	if err != nil {
		t.Fatalf("seed system_settings: %v", err)
	}

	// ── Assertions ──────────────────────────────────────────────────────────

	var levelCount int
	if err := seedDB.QueryRow(
		`SELECT count(*) FROM public.discipleship_levels WHERE church_id = $1`, churchID,
	).Scan(&levelCount); err != nil {
		t.Fatalf("count discipleship_levels: %v", err)
	}
	if levelCount != 5 {
		t.Errorf("discipleship_levels count = %d, want 5", levelCount)
	}

	var infoCount int
	var infoName string
	if err := seedDB.QueryRow(
		`SELECT count(*), max(name) FROM public.church_info WHERE church_id = $1`, churchID,
	).Scan(&infoCount, &infoName); err != nil {
		t.Fatalf("count church_info: %v", err)
	}
	if infoCount != 1 {
		t.Errorf("church_info count = %d, want 1", infoCount)
	}
	if infoName != churchName {
		t.Errorf("church_info.name = %q, want %q", infoName, churchName)
	}

	var settingsCount int
	if err := seedDB.QueryRow(
		`SELECT count(*) FROM public.system_settings WHERE church_id = $1`, churchID,
	).Scan(&settingsCount); err != nil {
		t.Fatalf("count system_settings: %v", err)
	}
	if settingsCount != 1 {
		t.Errorf("system_settings count = %d, want 1", settingsCount)
	}
}
