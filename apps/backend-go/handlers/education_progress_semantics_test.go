// education_progress_semantics_test.go — completion-semantics regression
// guard (PR-A, design-handoff expansion).
//
// Spec ref: education-assignments DELTA "ADDED Requirement: Completion-
// semantics regression guard". Before this migration, row-presence in
// education_lesson_progress WAS completion (completed_at NOT NULL DEFAULT
// now()). After PR-A's migration, completed_at is nullable — a row can exist
// for a lesson the student merely STARTED (current_step_id set,
// completed_at NULL). Every query that used to treat "row exists" as
// "completed" MUST now additionally require `completed_at IS NOT NULL`, or
// it silently over-counts.
//
// This test seeds exactly that shape (2 lessons, 1 fully completed, 1
// started-but-not-completed) and asserts the PRODUCTION assignmentSelectSQL
// constant reports 1/2 completed and status "in_progress" — never 2/2
// "completed". It also runs a deliberately UN-GUARDED variant of the same
// query inline (no `AND elp.completed_at IS NOT NULL` on the join) and
// asserts THAT one is wrong (reports 2/2) — proving the guard is what makes
// the difference, not incidental test data shape. If the guard is ever
// removed from assignmentSelectSQL/deriveAssignmentStatusSQL, the first
// assertion in this file starts failing.
//
// Same superuserSeedDB (fixture setup, bypasses RLS) + integrationDB (actual
// assertions, jetro_app / RLS-enforced) + setTenantContext pattern as
// education_isolation_test.go — see that file's header for the
// INTEGRATION_TEST_DSN / INTEGRATION_TEST_SUPERUSER_DSN setup.
package handlers

import (
	"database/sql"
	"testing"
)

func TestCompletionSemanticsRegressionGuard(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "dddddddd-0000-0000-0000-00000000000d"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Progress Semantics Church', 'edu-progress-semantics-church', NOW(), NOW())
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
		 VALUES ($1, 'edu-progress-semantics-curriculum', 'published') RETURNING id`,
		church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lesson1ID, lesson2ID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'Lección 1') RETURNING id`,
		church, curriculumID,
	).Scan(&lesson1ID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson 1: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 2, 'Lección 2') RETURNING id`,
		church, curriculumID,
	).Scan(&lesson2ID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson 2: %v", err)
	}
	var userID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-progress-semantics-user', 'Edu', 'ProgressSemantics', '000', 'n/a', 'edu-progress-semantics@example.test', 'member', $1)
		 RETURNING id`,
		church,
	).Scan(&userID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed user: %v", err)
	}
	var assignmentID string
	err = setup.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to)
		 VALUES ($1, $2, $3) RETURNING id`,
		church, curriculumID, userID,
	).Scan(&assignmentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed assignment: %v", err)
	}
	// Lesson 1: fully completed.
	_, err = setup.Exec(
		`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, completed_at)
		 VALUES ($1, $2, $3, now())`,
		church, assignmentID, lesson1ID,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed completed progress: %v", err)
	}
	// Lesson 2: STARTED but not completed — row exists, completed_at NULL.
	// This is exactly the new shape that did not exist before PR-A's
	// migration relaxed completed_at to nullable.
	_, err = setup.Exec(
		`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, completed_at)
		 VALUES ($1, $2, $3, NULL)`,
		church, assignmentID, lesson2ID,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed started-not-completed progress: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_progress WHERE assignment_id = $1`, assignmentID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE id = $1`, assignmentID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE curriculum_id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = $1`, userID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, church)

	// ── The guarded, PRODUCTION query — the one that MUST get this right ──
	row := tx.QueryRow(assignmentSelectSQL+`
		WHERE ea.id = $1 AND ea.church_id = $2
		GROUP BY ea.id, ec.name, ec.track, u.first_name, u.last_name
	`, assignmentID, church)
	a, err := scanAssignmentRow(row)
	if err != nil {
		t.Fatalf("assignmentSelectSQL query failed: %v", err)
	}
	if a.CompletedLessons != 1 {
		t.Errorf("completion-semantics regression: assignmentSelectSQL reported %d completed lessons, want 1 "+
			"(lesson 2's progress row has completed_at IS NULL — a merely-started lesson must not count as completed)",
			a.CompletedLessons)
	}
	if a.Status != "in_progress" {
		t.Errorf("completion-semantics regression: derived status = %q, want \"in_progress\" "+
			"(1 of 2 lessons completed must never read as fully \"completed\")", a.Status)
	}

	// ── recomputeAssignmentCompletion must agree: completed_at stays NULL ──
	if err := recomputeAssignmentCompletion(tx, assignmentID); err != nil {
		t.Fatalf("recomputeAssignmentCompletion: %v", err)
	}
	var completedAt sql.NullString
	if err := tx.QueryRow(`SELECT to_char(completed_at, 'YYYY-MM-DD') FROM education_assignments WHERE id = $1`, assignmentID).
		Scan(&completedAt); err != nil {
		t.Fatalf("re-read assignment: %v", err)
	}
	if completedAt.Valid {
		t.Errorf("completion-semantics regression: recomputeAssignmentCompletion set completed_at with only 1/2 "+
			"lessons actually completed (got %q, want NULL)", completedAt.String)
	}

	// ── Negative control: the UN-GUARDED variant of the same query IS wrong.
	// Proves the `AND elp.completed_at IS NOT NULL` join guard is what makes
	// the production query correct, not an accident of this fixture's shape.
	const unguardedSelectSQL = `
		SELECT COUNT(elp.id) AS completed_lessons
		FROM education_assignments ea
		LEFT JOIN education_lesson_progress elp ON elp.assignment_id = ea.id
		WHERE ea.id = $1 AND ea.church_id = $2
		GROUP BY ea.id
	`
	var unguardedCompleted int
	if err := tx.QueryRow(unguardedSelectSQL, assignmentID, church).Scan(&unguardedCompleted); err != nil {
		t.Fatalf("unguarded control query failed: %v", err)
	}
	if unguardedCompleted != 2 {
		t.Fatalf("test fixture invariant broken: expected the UN-GUARDED variant to (wrongly) count both progress "+
			"rows as completed (got %d, want 2) — if this fires, the test itself needs re-checking, not the guard",
			unguardedCompleted)
	}
	if unguardedCompleted == a.CompletedLessons {
		t.Errorf("completion-semantics guard is a no-op: guarded and unguarded queries agree (%d == %d) — "+
			"expected the guard to exclude the started-but-not-completed row", a.CompletedLessons, unguardedCompleted)
	}
}
