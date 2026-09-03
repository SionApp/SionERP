// education_isolation_test.go — church-scoping regression coverage for the
// PR2a curriculum/lesson CRUD tables and PR3a assignment/progress tables,
// following the same pattern as isolation_test.go's
// TestIsolationCrossTenantReadBlocked / TestIsolationModuleGateChurchScoped
// (see that file's header for the INTEGRATION_TEST_DSN setup instructions).
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
	"strings"
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
			`INSERT INTO public.education_curricula (id, church_id, name, status)
			 VALUES (gen_random_uuid(), $1, $2, 'published')
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
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, $2, 'published') RETURNING id`,
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
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'cross-church lesson')`,
		churchB, curriculumBID,
	)
	if err == nil {
		t.Errorf("cross-tenant write NOT blocked: insert with church_id=Church B succeeded while tenant context = Church A")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationAssignmentsCrossChurchReadBlocked (PR3a)
//
// Spec ref: education-assignment-progress "Cross-church isolation" scenario.
// Same shape as TestIsolationEducationCurriculaCrossChurchReadBlocked, applied
// to education_assignments: seeds one assignment per church, sets tenant
// context to A, and asserts a deliberately unscoped SELECT never returns
// Church B's row — proves RLS enforces isolation on the new PR3a table
// independently of any WHERE church_id clause a handler might omit.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationAssignmentsCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-00000000000b"
	churchB := "bbbbbbbb-0000-0000-0000-00000000000b"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	curriculumIDs := map[string]string{}
	userIDs := map[string]string{}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Assignment Isolation Church %d", i), fmt.Sprintf("edu-isolation-assign-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		var curriculumID string
		err = setup.QueryRow(
			`INSERT INTO public.education_curricula (church_id, name, status)
			 VALUES ($1, $2, 'published') RETURNING id`,
			cid, fmt.Sprintf("edu-isolation-assign-curriculum-%s", cid[:8]),
		).Scan(&curriculumID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
		curriculumIDs[cid] = curriculumID

		var userID string
		err = setup.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
			 VALUES ($1, 'Edu', 'IsolationAssign', '000', 'n/a', $2, 'member', $3) RETURNING id`,
			fmt.Sprintf("edu-isolation-assign-%s", cid[:8]), fmt.Sprintf("edu-isolation-assign-%s@example.test", cid[:8]), cid,
		).Scan(&userID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed user for %s: %v", cid, err)
		}
		userIDs[cid] = userID

		_, err = setup.Exec(
			`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to)
			 VALUES ($1, $2, $3)`,
			cid, curriculumID, userID,
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed assignment for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE curriculum_id = ANY($1)`,
			pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = ANY($1)`,
			pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = ANY($1)`,
			pqStringArray(userIDs[churchA], userIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	setTenantContext(t, tx, churchA)

	// Deliberately NO WHERE church_id — RLS must filter for us.
	rows, err := tx.Query(`SELECT church_id FROM public.education_assignments WHERE curriculum_id = ANY($1)`,
		pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
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
		t.Errorf("cross-tenant read NOT blocked: saw %d Church B education_assignments rows while tenant context = Church A", seenB)
	}
	if seenA == 0 {
		t.Errorf("own-tenant read unexpectedly empty: expected to see Church A's own assignment row")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationProgressSelfOnlyConstraint (PR3a)
//
// Spec ref: education-assignment-progress "self-only" scenario (an
// authorization boundary, not a tenant-isolation one — both users below are
// in the SAME church, so RLS's tenant_isolation policy alone would let this
// through). Seeds two users in one church and one assignment belonging to
// user A. Runs the EXACT ownership-check query MarkLessonComplete/
// MarkLessonIncomplete execute before touching education_lesson_progress
// (`WHERE id = $1 AND church_id = $2 AND assigned_to = $3`) once as the
// owner (must resolve) and once as a different user in the same church
// (must resolve to zero rows) — proving the handler's guard, not just RLS,
// is what stops a user from touching another user's progress.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationProgressSelfOnlyConstraint(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "cccccccc-0000-0000-0000-00000000000c"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Progress Self-Only Church', 'edu-isolation-self-only-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		church,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-isolation-self-only-curriculum', 'published') RETURNING id`,
		church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var ownerID, otherID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-isolation-self-only-owner', 'Edu', 'Owner', '000', 'n/a', 'edu-isolation-self-only-owner@example.test', 'member', $1)
		 RETURNING id`,
		church,
	).Scan(&ownerID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed owner user: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-isolation-self-only-other', 'Edu', 'Other', '000', 'n/a', 'edu-isolation-self-only-other@example.test', 'member', $1)
		 RETURNING id`,
		church,
	).Scan(&otherID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed other user: %v", err)
	}
	var assignmentID string
	err = setup.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to)
		 VALUES ($1, $2, $3) RETURNING id`,
		church, curriculumID, ownerID,
	).Scan(&assignmentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed assignment: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE id = $1`, assignmentID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id IN ($1, $2)`, ownerID, otherID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	setTenantContext(t, tx, church)

	const ownershipQuery = `
		SELECT curriculum_id FROM public.education_assignments
		WHERE id = $1 AND church_id = $2 AND assigned_to = $3
	`

	// Positive control: the owner's own lookup must resolve.
	var gotCurriculumID string
	if err := tx.QueryRow(ownershipQuery, assignmentID, church, ownerID).Scan(&gotCurriculumID); err != nil {
		t.Fatalf("owner ownership check unexpectedly failed: %v", err)
	}
	if gotCurriculumID != curriculumID {
		t.Errorf("owner ownership check returned wrong curriculum_id: got %s want %s", gotCurriculumID, curriculumID)
	}

	// The actual boundary: a different user in the SAME church must NOT be
	// able to resolve someone else's assignment via this query.
	var leaked string
	err = tx.QueryRow(ownershipQuery, assignmentID, church, otherID).Scan(&leaked)
	if err != sql.ErrNoRows {
		t.Errorf("self-only constraint NOT enforced: a different same-church user resolved another user's assignment (err=%v)", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationCourseModulesCrossChurchReadBlocked (PR-A)
//
// Spec ref: education-catalog "Course modules group lessons" + the tenant
// isolation carried unchanged from rev 2 for every education_* table. Same
// shape as TestIsolationEducationCurriculaCrossChurchReadBlocked, applied to
// the new education_course_modules table.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationCourseModulesCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-00000000000e"
	churchB := "bbbbbbbb-0000-0000-0000-00000000000e"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	curriculumIDs := map[string]string{}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Modules Isolation Church %d", i), fmt.Sprintf("edu-isolation-modules-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		var curriculumID string
		err = setup.QueryRow(
			`INSERT INTO public.education_curricula (church_id, name, status)
			 VALUES ($1, $2, 'published') RETURNING id`,
			cid, fmt.Sprintf("edu-isolation-modules-curriculum-%s", cid[:8]),
		).Scan(&curriculumID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
		curriculumIDs[cid] = curriculumID

		_, err = setup.Exec(
			`INSERT INTO public.education_course_modules (church_id, curriculum_id, order_index, title)
			 VALUES ($1, $2, 1, $3)`,
			cid, curriculumID, fmt.Sprintf("edu-isolation-modules-module-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed module for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_course_modules WHERE title LIKE 'edu-isolation-modules-module-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = ANY($1)`,
			pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, churchA)

	rows, err := tx.Query(`SELECT church_id FROM public.education_course_modules WHERE title LIKE 'edu-isolation-modules-module-%'`)
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
		t.Errorf("cross-tenant read NOT blocked: saw %d Church B education_course_modules rows while tenant context = Church A", seenB)
	}
	if seenA == 0 {
		t.Errorf("own-tenant read unexpectedly empty: expected to see Church A's own module row")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationLessonStepsCrossChurchReadBlocked (PR-A)
//
// Spec ref: education-content-model "Lessons are composed of ordered steps".
// Same shape, applied to the new education_lesson_steps table (the table
// that now carries all lesson content, replacing the dropped
// content/attachment_* columns).
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationLessonStepsCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-00000000000f"
	churchB := "bbbbbbbb-0000-0000-0000-00000000000f"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	lessonIDs := map[string]string{}
	curriculumIDs := map[string]string{}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Steps Isolation Church %d", i), fmt.Sprintf("edu-isolation-steps-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		var curriculumID string
		err = setup.QueryRow(
			`INSERT INTO public.education_curricula (church_id, name, status)
			 VALUES ($1, $2, 'published') RETURNING id`,
			cid, fmt.Sprintf("edu-isolation-steps-curriculum-%s", cid[:8]),
		).Scan(&curriculumID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
		curriculumIDs[cid] = curriculumID

		var lessonID string
		err = setup.QueryRow(
			`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
			 VALUES ($1, $2, 1, $3) RETURNING id`,
			cid, curriculumID, fmt.Sprintf("edu-isolation-steps-lesson-%s", cid[:8]),
		).Scan(&lessonID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed lesson for %s: %v", cid, err)
		}
		lessonIDs[cid] = lessonID

		_, err = setup.Exec(
			`INSERT INTO public.education_lesson_steps (church_id, lesson_id, order_index, label)
			 VALUES ($1, $2, 1, $3)`,
			cid, lessonID, fmt.Sprintf("edu-isolation-steps-step-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed step for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_steps WHERE label LIKE 'edu-isolation-steps-step-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = ANY($1)`,
			pqStringArray(lessonIDs[churchA], lessonIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = ANY($1)`,
			pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, churchA)

	rows, err := tx.Query(`SELECT church_id FROM public.education_lesson_steps WHERE label LIKE 'edu-isolation-steps-step-%'`)
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
		t.Errorf("cross-tenant read NOT blocked: saw %d Church B education_lesson_steps rows while tenant context = Church A", seenB)
	}
	if seenA == 0 {
		t.Errorf("own-tenant read unexpectedly empty: expected to see Church A's own step row")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestIsolationEducationLessonReflectionsCrossChurchReadBlocked (PR-A)
//
// Spec ref: education-content-model "Reflection answers are private, ungraded
// journal entries" — the tenant-isolation half of that requirement (the
// owner/level-3 read-access boundary itself is PR-B's
// TestReflectionReadAccessBoundary, once the reflections handler exists).
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationEducationLessonReflectionsCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000010"
	churchB := "bbbbbbbb-0000-0000-0000-000000000010"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	lessonIDs := map[string]string{}
	curriculumIDs := map[string]string{}
	userIDs := map[string]string{}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Reflections Isolation Church %d", i), fmt.Sprintf("edu-isolation-reflect-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		var curriculumID string
		err = setup.QueryRow(
			`INSERT INTO public.education_curricula (church_id, name, status)
			 VALUES ($1, $2, 'published') RETURNING id`,
			cid, fmt.Sprintf("edu-isolation-reflect-curriculum-%s", cid[:8]),
		).Scan(&curriculumID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
		curriculumIDs[cid] = curriculumID

		var lessonID string
		err = setup.QueryRow(
			`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
			 VALUES ($1, $2, 1, $3) RETURNING id`,
			cid, curriculumID, fmt.Sprintf("edu-isolation-reflect-lesson-%s", cid[:8]),
		).Scan(&lessonID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed lesson for %s: %v", cid, err)
		}
		lessonIDs[cid] = lessonID

		var userID string
		err = setup.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
			 VALUES ($1, 'Edu', 'IsolationReflect', '000', 'n/a', $2, 'member', $3) RETURNING id`,
			fmt.Sprintf("edu-isolation-reflect-%s", cid[:8]), fmt.Sprintf("edu-isolation-reflect-%s@example.test", cid[:8]), cid,
		).Scan(&userID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed user for %s: %v", cid, err)
		}
		userIDs[cid] = userID

		_, err = setup.Exec(
			`INSERT INTO public.education_lesson_reflections (church_id, lesson_id, block_id, user_id, answer)
			 VALUES ($1, $2, 'edu-isolation-reflect-block', $3, $4)`,
			cid, lessonID, userID, fmt.Sprintf("edu-isolation-reflect-answer-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed reflection for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_reflections WHERE answer LIKE 'edu-isolation-reflect-answer-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = ANY($1)`,
			pqStringArray(lessonIDs[churchA], lessonIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = ANY($1)`,
			pqStringArray(curriculumIDs[churchA], curriculumIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = ANY($1)`,
			pqStringArray(userIDs[churchA], userIDs[churchB]))
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, churchA)

	rows, err := tx.Query(`SELECT church_id FROM public.education_lesson_reflections WHERE answer LIKE 'edu-isolation-reflect-answer-%'`)
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
		t.Errorf("cross-tenant read NOT blocked: saw %d Church B education_lesson_reflections rows while tenant context = Church A", seenB)
	}
	if seenA == 0 {
		t.Errorf("own-tenant read unexpectedly empty: expected to see Church A's own reflection row")
	}
}

// pqStringArray formats a Go string slice as a Postgres text[] literal for use
// with = ANY($1) — avoids pulling in github.com/lib/pq's pq.Array helper just
// for two fixed-size test fixtures.
func pqStringArray(values ...string) string {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = `"` + v + `"`
	}
	return "{" + strings.Join(quoted, ",") + "}"
}
