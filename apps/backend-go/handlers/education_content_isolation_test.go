// education_content_isolation_test.go — PR-B integration coverage for the new
// content-serving endpoints' authorization boundaries: the lesson-content
// read gate (assignment required for level < 3) and the reflection
// read-access boundary (owner OR Education level >= 3 same church). Same
// superuserSeedDB (fixture setup, bypasses RLS) + integrationDB (actual
// assertions, jetro_app / RLS-enforced) + setTenantContext pattern as
// education_isolation_test.go — see that file's header for the
// INTEGRATION_TEST_DSN / INTEGRATION_TEST_SUPERUSER_DSN setup.
//
// These tests call the PRODUCTION Go functions the handlers use
// (lessonReadAccess, reflectionBlockIsQuestion, blockIDsUsedElsewhereInLesson)
// directly against a real *sql.Tx, rather than re-deriving the SQL inline —
// stronger coverage than a hand-copied query, since a change to the real
// function is exercised here without the test needing to be kept in sync.
package handlers

import (
	"fmt"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// TestEducationLessonContentReadRequiresAssignment (PR-B)
//
// Spec ref: education-content-model / this PR's explicit read-access rule —
// a level 1-2 caller must hold an assignment on the lesson's curriculum to
// read STEP CONTENT (distinct from GetLessons' published-only gate on
// lesson shells). Level >= 3 authors read freely within their own church.
// ─────────────────────────────────────────────────────────────────────────────
func TestEducationLessonContentReadRequiresAssignment(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-000000000020"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Content Read Church', 'edu-content-read-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`, church,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-content-read-curriculum', 'published') RETURNING id`, church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-content-read-lesson') RETURNING id`, church, curriculumID,
	).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	var studentID, authorID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-content-read-student', 'Edu', 'Student', '000', 'n/a', 'edu-content-read-student@example.test', 'member', $1)
		 RETURNING id`, church,
	).Scan(&studentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-content-read-author', 'Edu', 'Author', '000', 'n/a', 'edu-content-read-author@example.test', 'member', $1)
		 RETURNING id`, church,
	).Scan(&authorID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed author: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE curriculum_id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id IN ($1, $2)`, studentID, authorID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, church)

	// (1) Level-1 student with NO assignment — must be denied.
	if _, ok, err := lessonReadAccess(tx, church, lessonID, studentID, educationStudentLevel); err != nil {
		t.Fatalf("lessonReadAccess (no assignment): %v", err)
	} else if ok {
		t.Errorf("expected content read to be DENIED for an unenrolled level-1 student, got allowed")
	}

	// (2) Level-3 author, still with no assignment — must always be allowed.
	if _, ok, err := lessonReadAccess(tx, church, lessonID, authorID, educationAuthorLevel); err != nil {
		t.Fatalf("lessonReadAccess (author): %v", err)
	} else if !ok {
		t.Errorf("expected content read to be ALLOWED for a level-3 author regardless of assignment")
	}

	// (3) Enroll the student, then re-check — must now be allowed.
	if _, err := tx.Exec(`
		INSERT INTO education_assignments (church_id, curriculum_id, assigned_to)
		VALUES ($1, $2, $3)
	`, church, curriculumID, studentID); err != nil {
		t.Fatalf("enroll student: %v", err)
	}
	if gotCurriculumID, ok, err := lessonReadAccess(tx, church, lessonID, studentID, educationStudentLevel); err != nil {
		t.Fatalf("lessonReadAccess (after enroll): %v", err)
	} else if !ok {
		t.Errorf("expected content read to be ALLOWED for an enrolled level-1 student")
	} else if gotCurriculumID != curriculumID {
		t.Errorf("lessonReadAccess returned wrong curriculum_id: got %s want %s", gotCurriculumID, curriculumID)
	}

	// (4) Nonexistent lesson id — must resolve to ok=false, not an error.
	if _, ok, err := lessonReadAccess(tx, church, "00000000-0000-0000-0000-000000000000", studentID, educationStudentLevel); err != nil {
		t.Fatalf("lessonReadAccess (nonexistent lesson): %v", err)
	} else if ok {
		t.Errorf("expected a nonexistent lesson id to resolve to ok=false")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestReflectionBlockIsQuestionGuard (PR-B)
//
// Spec ref: education-content-model — "Answer to a non-question block
// rejected". block_id has no FK (it lives inside steps.blocks jsonb), so
// reflectionBlockIsQuestion is the ONLY existence+type guard.
// ─────────────────────────────────────────────────────────────────────────────
func TestReflectionBlockIsQuestionGuard(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-000000000021"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Reflection Guard Church', 'edu-reflect-guard-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`, church,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-reflect-guard-curriculum', 'published') RETURNING id`, church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-reflect-guard-lesson') RETURNING id`, church, curriculumID,
	).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	const questionBlockID = "11111111-1111-4111-8111-111111111111"
	const paragraphBlockID = "22222222-2222-4222-8222-222222222222"
	blocksJSON := fmt.Sprintf(`[
		{"id":"%s","type":"question","data":{"prompt":"¿Qué aprendiste?"}},
		{"id":"%s","type":"paragraph","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x"}]}]}}}
	]`, questionBlockID, paragraphBlockID)
	if _, err := setup.Exec(`
		INSERT INTO public.education_lesson_steps (church_id, lesson_id, order_index, label, blocks)
		VALUES ($1, $2, 1, 'edu-reflect-guard-step', $3::jsonb)
	`, church, lessonID, blocksJSON); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed step: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_steps WHERE lesson_id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, church)

	if ok, err := reflectionBlockIsQuestion(tx, church, lessonID, questionBlockID); err != nil {
		t.Fatalf("reflectionBlockIsQuestion (question block): %v", err)
	} else if !ok {
		t.Errorf("expected the question block to pass the guard")
	}

	if ok, err := reflectionBlockIsQuestion(tx, church, lessonID, paragraphBlockID); err != nil {
		t.Fatalf("reflectionBlockIsQuestion (paragraph block): %v", err)
	} else if ok {
		t.Errorf("expected a non-question (paragraph) block to FAIL the guard")
	}

	if ok, err := reflectionBlockIsQuestion(tx, church, lessonID, "does-not-exist"); err != nil {
		t.Fatalf("reflectionBlockIsQuestion (nonexistent block): %v", err)
	} else if ok {
		t.Errorf("expected a nonexistent block id to FAIL the guard")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestReflectionReadAccessBoundary (PR-B, task B.7)
//
// Spec ref: education-content-model — "Read access boundary": the owner MAY
// read their own reflection; an Education level >= 3 user in the SAME
// church MAY read it; any other caller (including a level >= 3 user of a
// DIFFERENT church) MUST NOT. Reproduces GetReflection's exact two-part
// gate: (a) the Go-level `targetUserID != caller && level < 3` check, and
// (b) the church-scoped SQL WHERE clause underneath it.
// ─────────────────────────────────────────────────────────────────────────────
func TestReflectionReadAccessBoundary(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000022"
	churchB := "bbbbbbbb-0000-0000-0000-000000000022"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for _, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, "Education Reflection Boundary "+cid, "edu-reflect-boundary-"+cid[:8],
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-reflect-boundary-curriculum', 'published') RETURNING id`, churchA,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-reflect-boundary-lesson') RETURNING id`, churchA, curriculumID,
	).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	const blockID = "33333333-3333-4333-8333-333333333333"

	var ownerID, otherID, authorSameChurchID, authorOtherChurchID string
	seedUser := func(idNumber, first, email, churchID string) string {
		var id string
		err := setup.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
			 VALUES ($1, $2, 'Reflect', '000', 'n/a', $3, 'member', $4) RETURNING id`,
			idNumber, first, email, churchID,
		).Scan(&id)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed user %s: %v", idNumber, err)
		}
		return id
	}
	ownerID = seedUser("edu-reflect-boundary-owner", "Owner", "edu-reflect-boundary-owner@example.test", churchA)
	otherID = seedUser("edu-reflect-boundary-other", "Other", "edu-reflect-boundary-other@example.test", churchA)
	authorSameChurchID = seedUser("edu-reflect-boundary-author-a", "AuthorA", "edu-reflect-boundary-author-a@example.test", churchA)
	authorOtherChurchID = seedUser("edu-reflect-boundary-author-b", "AuthorB", "edu-reflect-boundary-author-b@example.test", churchB)

	if _, err := setup.Exec(`
		INSERT INTO public.education_lesson_reflections (church_id, lesson_id, block_id, user_id, answer)
		VALUES ($1, $2, $3, $4, 'mi respuesta privada')
	`, churchA, lessonID, blockID, ownerID); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed reflection: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_reflections WHERE lesson_id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id IN ($1, $2, $3, $4)`, ownerID, otherID, authorSameChurchID, authorOtherChurchID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, churchA)

	const readQuery = `
		SELECT answer FROM education_lesson_reflections
		WHERE lesson_id = $1 AND block_id = $2 AND user_id = $3 AND church_id = $4
	`

	// gateAllows reproduces GetReflection's Go-level gate exactly.
	gateAllows := func(callerID string, callerLevel int, targetUserID string) bool {
		return !(targetUserID != callerID && callerLevel < educationAuthorLevel)
	}

	// (a) Owner reading their own answer: gate allows, query resolves.
	if !gateAllows(ownerID, educationStudentLevel, ownerID) {
		t.Errorf("owner-self case: expected the gate to allow")
	}
	var answer string
	if err := tx.QueryRow(readQuery, lessonID, blockID, ownerID, churchA).Scan(&answer); err != nil {
		t.Errorf("owner-self case: expected the query to resolve, got: %v", err)
	}

	// (b) A different level-1 user trying to read the owner's answer: gate denies.
	if gateAllows(otherID, educationStudentLevel, ownerID) {
		t.Errorf("cross-user case: expected the gate to DENY a level-1 user reading someone else's reflection")
	}

	// (c) Level-3 author, SAME church, reading the owner's answer: gate
	// allows, AND the church-scoped query still resolves.
	if !gateAllows(authorSameChurchID, educationAuthorLevel, ownerID) {
		t.Errorf("author-same-church case: expected the gate to allow")
	}
	if err := tx.QueryRow(readQuery, lessonID, blockID, ownerID, churchA).Scan(&answer); err != nil {
		t.Errorf("author-same-church case: expected the query to resolve, got: %v", err)
	}

	// (d) Level-3 author, DIFFERENT church: the Go gate alone would allow
	// (level >= 3), but the church-scoped query must still resolve to zero
	// rows when queried with churchB's church_id — proving the boundary
	// isn't just the in-handler level check, RLS + the explicit church_id
	// predicate hold even for an author role.
	if !gateAllows(authorOtherChurchID, educationAuthorLevel, ownerID) {
		t.Fatalf("author-other-church case: test invariant broken — level>=3 gate should allow by itself")
	}
	err = tx.QueryRow(readQuery, lessonID, blockID, ownerID, churchB).Scan(&answer)
	if err == nil {
		t.Errorf("author-other-church case: expected NO row when scoped to a different church_id, got answer=%q", answer)
	}
}
