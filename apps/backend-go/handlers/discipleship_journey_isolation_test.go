// discipleship_journey_isolation_test.go — church-scoping + stage-derivation
// regression coverage for Slice 1's read backbone (discipleship_settings,
// discipleship_journey, journeyStageSQL). Same superuserSeedDB (fixture
// setup, bypasses RLS) + integrationDB (assertions, jetro_app / RLS-enforced)
// + setTenantContext pattern as education_isolation_test.go — see
// isolation_test.go's header for INTEGRATION_TEST_DSN /
// INTEGRATION_TEST_SUPERUSER_DSN setup.
//
// PR-1 has no write door yet (PR-2 adds conversion + the manual door), so
// every fixture here is seeded directly through superuserSeedDB — these
// tests prove the schema + journeyStageSQL, not the not-yet-existent write
// path.
package handlers

import (
	"database/sql"
	"fmt"
	"hash/fnv"
	"testing"

	"github.com/lib/pq"
)

// journeyFixture bundles the church/curriculum/user/journey ids a scenario
// needs, plus its own cleanup.
type journeyFixture struct {
	church      string
	curriculumA string // "old" curriculum — what the pointer used to point to
	curriculumB string // "new" curriculum — what the pointer swaps to
	userID      string
	journeyID   string
}

// churchIDForTag derives a deterministic, valid UUID from a short tag
// (fnv64a, masked to 48 bits so it fits the UUID's last hex group exactly) —
// avoids hand-picking a literal UUID per scenario.
func churchIDForTag(tag string) string {
	h := fnv.New64a()
	_, _ = h.Write([]byte(tag))
	v := h.Sum64() & 0xFFFFFFFFFFFF // 48 bits → exactly 12 hex chars
	return fmt.Sprintf("10000000-0000-0000-0000-%012x", v)
}

// seedJourneyFixture creates a church, two published curricula, one user,
// and one discipleship_journey anchor (origin='conversion'). Callers add
// discipleship_settings / education_assignments rows per scenario. Returns a
// cleanup func the caller must defer.
func seedJourneyFixture(t *testing.T, seedDB *sql.DB, tag string) (journeyFixture, func()) {
	t.Helper()
	f := journeyFixture{church: churchIDForTag(tag)}

	tx, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("seed tx begin: %v", err)
	}
	_, err = tx.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		f.church, "Journey Isolation Church "+tag, "journey-isolation-church-"+tag,
	)
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, $2, 'published') RETURNING id`,
		f.church, "journey-isolation-curriculum-a-"+tag,
	).Scan(&f.curriculumA); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed curriculum A: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, $2, 'published') RETURNING id`,
		f.church, "journey-isolation-curriculum-b-"+tag,
	).Scan(&f.curriculumB); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed curriculum B: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ($1, 'Journey', 'Isolation', '000', 'n/a', $2, 'member', $3)
		 RETURNING id`,
		"journey-isolation-user-"+tag, "journey-isolation-"+tag+"@example.test", f.church,
	).Scan(&f.userID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed user: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.discipleship_journey (church_id, user_id, origin)
		 VALUES ($1, $2, 'conversion') RETURNING id`,
		f.church, f.userID,
	).Scan(&f.journeyID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed journey anchor: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}

	cleanup := func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_journey WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_settings WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, f.church)
	}
	return f, cleanup
}

// queryJourneyStage runs the production journeyStageSQL constant scoped to
// one journey and scans it with the production scanJourneyEntry helper —
// every scenario below asserts against this, never a re-derived query.
func queryJourneyStage(t *testing.T, tx *sql.Tx, f journeyFixture) JourneyEntry {
	t.Helper()
	row := tx.QueryRow(journeyStageSQL+" AND j.id = $3", f.church, pq.Array([]string{f.userID}), f.journeyID)
	entry, err := scanJourneyEntry(row)
	if err != nil {
		t.Fatalf("journeyStageSQL: %v", err)
	}
	return entry
}

// Test 1 — cross-church reads return zero rows on both new tables.
// Spec ref: Multi-Tenancy / Church Scoping "Cross-tenant read blocked".
func TestDiscipleshipJourneyIsolationCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	fA, cleanupA := seedJourneyFixture(t, seedDB, "crosscha")
	defer cleanupA()
	fB, cleanupB := seedJourneyFixture(t, seedDB, "crosschb")
	defer cleanupB()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, fA.church)

	// Deliberately unscoped — RLS must filter, not the WHERE clause.
	rows, err := tx.Query(`SELECT church_id FROM public.discipleship_journey WHERE church_id IN ($1, $2)`, fA.church, fB.church)
	if err != nil {
		t.Fatalf("query discipleship_journey: %v", err)
	}
	seenA, seenB := 0, 0
	for rows.Next() {
		var got string
		if err := rows.Scan(&got); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if got == fA.church {
			seenA++
		} else if got == fB.church {
			seenB++
		}
	}
	rows.Close()
	if seenA == 0 {
		t.Errorf("discipleship_journey: expected church A's own row visible, got none")
	}
	if seenB > 0 {
		t.Errorf("discipleship_journey: cross-tenant read NOT blocked — saw %d church B rows while context is church A", seenB)
	}

	// discipleship_settings: same assertion shape.
	if _, err := seedDB.Exec(`INSERT INTO public.discipleship_settings (church_id) VALUES ($1), ($2) ON CONFLICT DO NOTHING`, fA.church, fB.church); err != nil {
		t.Fatalf("seed settings: %v", err)
	}
	rows2, err := tx.Query(`SELECT church_id FROM public.discipleship_settings WHERE church_id IN ($1, $2)`, fA.church, fB.church)
	if err != nil {
		t.Fatalf("query discipleship_settings: %v", err)
	}
	defer rows2.Close()
	seenB = 0
	for rows2.Next() {
		var got string
		if err := rows2.Scan(&got); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if got == fB.church {
			seenB++
		}
	}
	if seenB > 0 {
		t.Errorf("discipleship_settings: cross-tenant read NOT blocked — saw %d church B rows while context is church A", seenB)
	}
}

// Test 2 — stage derivation: new_convert → disciple on completed_at.
// Spec ref: Derived Stage "New convert" / "Disciple" scenarios.
func TestDiscipleshipJourneyIsolationStageDerivation(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	f, cleanup := seedJourneyFixture(t, seedDB, "stagederiv")
	defer cleanup()

	var assignmentID string
	if err := seedDB.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, source_module, source_ref_id)
		 VALUES ($1, $2, $3, 'discipleship', $4) RETURNING id`,
		f.church, f.curriculumA, f.userID, f.journeyID,
	).Scan(&assignmentID); err != nil {
		t.Fatalf("seed tagged assignment: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	if entry := queryJourneyStage(t, tx, f); entry.Stage != "new_convert" {
		t.Errorf("stage before completion = %q, want \"new_convert\"", entry.Stage)
	}

	// Mirrors what EducationHandler.recomputeAssignmentCompletion does once
	// every lesson is done — Education-side behaviour, not re-implemented here.
	if _, err := seedDB.Exec(`UPDATE public.education_assignments SET completed_at = now() WHERE id = $1`, assignmentID); err != nil {
		t.Fatalf("mark completed: %v", err)
	}

	if entry := queryJourneyStage(t, tx, f); entry.Stage != "disciple" {
		t.Errorf("stage after completion = %q, want \"disciple\"", entry.Stage)
	}
}

// Test 3 — pointer swap does not demote an already-tagged convert.
// Spec ref: Church-Level Path Curriculum Pointer "Pointer swap does not
// retroact" — the tagged arm of journeyStageSQL's LATERAL join is
// pointer-independent by construction; proven here end-to-end, not just by
// code inspection.
func TestDiscipleshipJourneyIsolationPointerSwapDoesNotDemote(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	f, cleanup := seedJourneyFixture(t, seedDB, "ptrswap")
	defer cleanup()

	// Pointer starts at curriculum A; convert is tagged + completed under A.
	if _, err := seedDB.Exec(
		`INSERT INTO public.discipleship_settings (church_id, conversion_path_curriculum_id) VALUES ($1, $2)`,
		f.church, f.curriculumA,
	); err != nil {
		t.Fatalf("seed settings: %v", err)
	}
	if _, err := seedDB.Exec(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, source_module, source_ref_id, completed_at)
		 VALUES ($1, $2, $3, 'discipleship', $4, now())`,
		f.church, f.curriculumA, f.userID, f.journeyID,
	); err != nil {
		t.Fatalf("seed tagged completed assignment: %v", err)
	}
	// Pastor swaps the pointer to curriculum B.
	if _, err := seedDB.Exec(
		`UPDATE public.discipleship_settings SET conversion_path_curriculum_id = $2 WHERE church_id = $1`,
		f.church, f.curriculumB,
	); err != nil {
		t.Fatalf("swap pointer: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	entry := queryJourneyStage(t, tx, f)
	if entry.Stage != "disciple" {
		t.Errorf("pointer swap demoted an already-tagged convert: stage = %q, want \"disciple\"", entry.Stage)
	}
	if entry.AssignmentCurricID == nil || *entry.AssignmentCurricID != f.curriculumA {
		t.Errorf("pointer swap changed which curriculum the convert's own assignment reports: got %v, want curriculum A (%s)",
			entry.AssignmentCurricID, f.curriculumA)
	}
}

// Test 4 — a merely-started lesson does not count as completed.
// Regression guard for the design's corrected finding: the completion-
// semantics predicate (education_lesson_progress.completed_at nullable since
// 20260902000001_education_content_model.sql) must never be silently
// bypassed. This proves journeyStageSQL's read of the already-aggregated
// ea.completed_at stays "new_convert" when only 1 lesson is merely started.
func TestDiscipleshipJourneyIsolationMerelyStartedLessonNotCompleted(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	f, cleanup := seedJourneyFixture(t, seedDB, "startednc")
	defer cleanup()

	var assignmentID string
	if err := seedDB.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, source_module, source_ref_id)
		 VALUES ($1, $2, $3, 'discipleship', $4) RETURNING id`,
		f.church, f.curriculumA, f.userID, f.journeyID,
	).Scan(&assignmentID); err != nil {
		t.Fatalf("seed tagged assignment: %v", err)
	}
	var lessonID string
	if err := seedDB.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'Lección 1') RETURNING id`,
		f.church, f.curriculumA,
	).Scan(&lessonID); err != nil {
		t.Fatalf("seed lesson: %v", err)
	}
	// Row exists (started) but completed_at IS NULL — the exact shape the
	// nullable-column migration introduced. education_assignments.completed_at
	// has no default, so the assignment's own aggregate is already NULL —
	// nothing else to set for this fixture to be valid.
	if _, err := seedDB.Exec(
		`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, completed_at)
		 VALUES ($1, $2, $3, NULL)`,
		f.church, assignmentID, lessonID,
	); err != nil {
		t.Fatalf("seed started-not-completed progress: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	if entry := queryJourneyStage(t, tx, f); entry.Stage != "new_convert" {
		t.Errorf("a merely-started lesson was counted as completed: stage = %q, want \"new_convert\"", entry.Stage)
	}
}

// Test 5 — fallback arm resolves a self-enrollment, and a tagged row
// outranks it. Spec/design ref: G3 — the untagged fallback arm only ever
// applies when no tagged row exists; a tagged row always wins regardless of
// curriculum.
func TestDiscipleshipJourneyIsolationFallbackArmPrecedence(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	f, cleanup := seedJourneyFixture(t, seedDB, "fallback")
	defer cleanup()

	// Pointer set to curriculum A; user self-enrolled in A BEFORE conversion
	// (source_module/source_ref_id both NULL — Education's own EnrollSelf shape).
	if _, err := seedDB.Exec(
		`INSERT INTO public.discipleship_settings (church_id, conversion_path_curriculum_id) VALUES ($1, $2)`,
		f.church, f.curriculumA,
	); err != nil {
		t.Fatalf("seed settings: %v", err)
	}
	if _, err := seedDB.Exec(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to) VALUES ($1, $2, $3)`,
		f.church, f.curriculumA, f.userID,
	); err != nil {
		t.Fatalf("seed self-enrollment: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	// With only the untagged self-enrollment present, the fallback arm must
	// resolve it (curriculum A).
	entry := queryJourneyStage(t, tx, f)
	if entry.AssignmentCurricID == nil || *entry.AssignmentCurricID != f.curriculumA {
		t.Fatalf("fallback arm did not resolve the self-enrollment: got %s, want curriculum A (%s)", derefOrNil(entry.AssignmentCurricID), f.curriculumA)
	}

	// Tag a SEPARATE assignment (curriculum B) directly to the journey —
	// mirrors a manual-door ADOPT landing on a different course. The tagged
	// row must outrank the fallback even though it targets a different
	// curriculum than the pointer/fallback arm would have picked.
	if _, err := seedDB.Exec(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, source_module, source_ref_id)
		 VALUES ($1, $2, $3, 'discipleship', $4)`,
		f.church, f.curriculumB, f.userID, f.journeyID,
	); err != nil {
		t.Fatalf("seed tagged assignment: %v", err)
	}

	entry2 := queryJourneyStage(t, tx, f)
	if entry2.AssignmentCurricID == nil || *entry2.AssignmentCurricID != f.curriculumB {
		t.Errorf("tagged row did not outrank the fallback arm: got %s, want curriculum B (%s) — precedence broken",
			derefOrNil(entry2.AssignmentCurricID), f.curriculumB)
	}
}

// derefOrNil renders a *string for failure messages: the value, or "<nil>".
// Printing the pointer with %v yields a memory address, which is useless in
// an assertion message.
func derefOrNil(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}
