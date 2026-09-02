// education_isolation_test.go — church-scoping regression coverage for the
// PR2a curriculum/lesson CRUD tables, following the same pattern as
// isolation_test.go's TestIsolationCrossTenantReadBlocked /
// TestIsolationModuleGateChurchScoped (see that file's header for the
// INTEGRATION_TEST_DSN setup instructions).
//
// Fixture seeding note: `churches` carries an explicit `deny_write` RLS
// policy (`USING (false)`) and every tenant table's `tenant_isolation` policy
// rejects INSERTs before any GUC is set (church_id = NULL never matches).
// jetro_app is deliberately NOBYPASSRLS (20260624000002_create_jetro_app_role.sql),
// so it cannot seed cross-tenant fixtures itself — same gap already flagged
// in TestIsolationCrossTenantReadBlocked's own header comment ("Use
// set_config as postgres (superuser) to bypass RLS during setup"). These
// tests open a SEPARATE superuser connection for fixture setup only; the
// actual isolation assertions still run through the jetro_app-authenticated
// connection from integrationDB(t), matching every other test in this file.
package handlers

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
)

// superuserSeedDB opens a Postgres superuser connection used ONLY to seed
// cross-tenant fixture rows before RLS is exercised as jetro_app. Skips the
// test (not fail) when unreachable — this is a local/CI fixture DB, not
// production.
func superuserSeedDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("INTEGRATION_TEST_SUPERUSER_DSN")
	if dsn == "" {
		// Local Supabase always provisions this superuser on the same host.
		dsn = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("superuserSeedDB: sql.Open: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("superuserSeedDB: ping failed (%v) — set INTEGRATION_TEST_SUPERUSER_DSN to run this test", err)
	}
	return db
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationCurriculaCrossChurchReadBlocked
//
// Spec ref: education-curriculum "Cross-church isolation" scenario.
// Seeds a curriculum for Church A and one for Church B, sets tenant context
// to A, and asserts a deliberately unscoped `SELECT * FROM education_curricula`
// returns zero Church B rows — proves RLS enforces isolation independently of
// any application-level WHERE church_id clause the handler might omit.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationCurriculaCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000009"
	churchB := "bbbbbbbb-0000-0000-0000-000000000009"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Isolation Church %d", i), fmt.Sprintf("edu-isolation-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		_, err = setup.Exec(
			`INSERT INTO public.education_curricula (id, church_id, name, cadence, status)
			 VALUES (gen_random_uuid(), $1, $2, 'weekly', 'published')
			 ON CONFLICT DO NOTHING`,
			cid, fmt.Sprintf("edu-isolation-curriculum-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE name LIKE 'edu-isolation-curriculum-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	setTenantContext(t, tx, churchA)

	// Deliberately NO WHERE church_id — RLS must filter for us.
	rows, err := tx.Query(`SELECT church_id FROM public.education_curricula WHERE name LIKE 'edu-isolation-curriculum-%'`)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()

	seenA, seenB := 0, 0
	for rows.Next() {
		var gotChurchID string
		if err := rows.Scan(&gotChurchID); err != nil {
			t.Fatalf("scan: %v", err)
		}
		switch gotChurchID {
		case churchA:
			seenA++
		case churchB:
			seenB++
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows iteration: %v", err)
	}
	if seenB > 0 {
		t.Errorf("cross-tenant read NOT blocked: saw %d Church B education_curricula rows while tenant context = Church A", seenB)
	}
	if seenA == 0 {
		t.Errorf("own-tenant read unexpectedly empty: expected to see Church A's own curriculum row")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationLessonCrossChurchWriteBlocked
//
// Spec ref: education-curriculum "Cross-church isolation" scenario (write
// side). With tenant context set to Church A, attempts to INSERT a lesson
// carrying Church B's church_id — RLS's WITH CHECK on education_lessons must
// reject it, proving a compromised/buggy handler cannot smuggle a write into
// another tenant's data even if it forgot to scope the INSERT itself.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationLessonCrossChurchWriteBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-00000000000a"
	churchB := "bbbbbbbb-0000-0000-0000-00000000000a"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Isolation Write Church %d", i), fmt.Sprintf("edu-isolation-write-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
	}
	var curriculumBID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, cadence, status)
		 VALUES ($1, $2, 'weekly', 'published') RETURNING id`,
		churchB, "edu-isolation-write-curriculum-b",
	).Scan(&curriculumBID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum for church B: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE name = 'edu-isolation-write-curriculum-b'`)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	setTenantContext(t, tx, churchA)

	// Attempt to write a lesson tagged with Church B's church_id while the
	// tenant context is Church A. RLS's tenant_isolation WITH CHECK must
	// reject this regardless of what the application layer intended.
	_, err = tx.Exec(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title, content)
		 VALUES ($1, $2, 1, 'cross-church lesson', 'should never land')`,
		churchB, curriculumBID,
	)
	if err == nil {
		t.Errorf("cross-tenant write NOT blocked: insert with church_id=Church B succeeded while tenant context = Church A")
	}
}
