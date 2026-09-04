// education_bookmarks_test.go — integration coverage for the personal lesson
// bookmark endpoints (small follow-up closing the design-handoff's undefined
// "Guardar" pill, README.md line 247). Same superuserSeedDB (fixture setup,
// bypasses RLS) + integrationDB (actual assertions, jetro_app / RLS-enforced)
// + setTenantContext pattern as education_isolation_test.go/
// education_content_isolation_test.go — see those files' headers for the
// INTEGRATION_TEST_DSN / INTEGRATION_TEST_SUPERUSER_DSN setup.
package handlers

import (
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// TestEducationLessonBookmarkIsolation
//
// A student must only ever see/manage their OWN bookmarks, even for another
// student in the SAME church (no admin/author visibility carve-out for this
// feature — spec: "keep it simple").
// ─────────────────────────────────────────────────────────────────────────────
func TestEducationLessonBookmarkIsolation(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-000000000030"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Bookmark Isolation Church', 'edu-bookmark-iso-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`, church,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-bookmark-iso-curriculum', 'published') RETURNING id`, church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-bookmark-iso-lesson') RETURNING id`, church, curriculumID,
	).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	var studentAID, studentBID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-bookmark-iso-a', 'Bookmark', 'StudentA', '000', 'n/a', 'edu-bookmark-iso-a@example.test', 'member', $1)
		 RETURNING id`, church,
	).Scan(&studentAID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student A: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-bookmark-iso-b', 'Bookmark', 'StudentB', '000', 'n/a', 'edu-bookmark-iso-b@example.test', 'member', $1)
		 RETURNING id`, church,
	).Scan(&studentBID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student B: %v", err)
	}
	if _, err := setup.Exec(`
		INSERT INTO public.education_lesson_bookmarks (church_id, user_id, lesson_id)
		VALUES ($1, $2, $3)
	`, church, studentAID, lessonID); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed bookmark for student A: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_bookmarks WHERE lesson_id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id IN ($1, $2)`, studentAID, studentBID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, church)

	const listQuery = `
		SELECT lesson_id FROM education_lesson_bookmarks
		WHERE church_id = $1 AND user_id = $2
	`

	// Student A sees their own bookmark.
	var gotLessonID string
	if err := tx.QueryRow(listQuery, church, studentAID).Scan(&gotLessonID); err != nil {
		t.Fatalf("expected student A to see their own bookmark, got: %v", err)
	}
	if gotLessonID != lessonID {
		t.Errorf("student A's bookmark returned wrong lesson_id: got %s want %s", gotLessonID, lessonID)
	}

	// Student B, same church, has NO bookmarks of their own — scoping by
	// user_id (not just church_id) must exclude student A's row entirely.
	var count int
	if err := tx.QueryRow(`
		SELECT COUNT(*) FROM education_lesson_bookmarks WHERE church_id = $1 AND user_id = $2
	`, church, studentBID).Scan(&count); err != nil {
		t.Fatalf("count query for student B: %v", err)
	}
	if count != 0 {
		t.Errorf("expected student B to see ZERO bookmarks (isolation from student A), got %d", count)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestEducationLessonBookmarkIdempotent
//
// Bookmarking an already-bookmarked lesson twice, and unbookmarking an
// already-removed (or never-created) bookmark twice, must both succeed
// cleanly — no unique-constraint error, no "not found" error. Reproduces the
// exact SQL BookmarkLesson/UnbookmarkLesson run (ON CONFLICT DO NOTHING /
// zero-row DELETE), not a hand-copied approximation.
// ─────────────────────────────────────────────────────────────────────────────
func TestEducationLessonBookmarkIdempotent(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-000000000031"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Bookmark Idempotent Church', 'edu-bookmark-idem-church', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`, church,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, 'edu-bookmark-idem-curriculum', 'published') RETURNING id`, church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-bookmark-idem-lesson') RETURNING id`, church, curriculumID,
	).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	var studentID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-bookmark-idem-student', 'Bookmark', 'Idempotent', '000', 'n/a', 'edu-bookmark-idem-student@example.test', 'member', $1)
		 RETURNING id`, church,
	).Scan(&studentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_lesson_bookmarks WHERE lesson_id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = $1`, studentID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, church)

	const bookmarkSQL = `
		INSERT INTO education_lesson_bookmarks (church_id, user_id, lesson_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (church_id, user_id, lesson_id) DO NOTHING
	`
	const unbookmarkSQL = `
		DELETE FROM education_lesson_bookmarks WHERE church_id = $1 AND user_id = $2 AND lesson_id = $3
	`
	const countSQL = `
		SELECT COUNT(*) FROM education_lesson_bookmarks WHERE church_id = $1 AND user_id = $2 AND lesson_id = $3
	`

	// Bookmark once, then again — must not error, and must still be exactly one row.
	if _, err := tx.Exec(bookmarkSQL, church, studentID, lessonID); err != nil {
		t.Fatalf("first bookmark: %v", err)
	}
	if _, err := tx.Exec(bookmarkSQL, church, studentID, lessonID); err != nil {
		t.Fatalf("second (duplicate) bookmark must succeed cleanly, got: %v", err)
	}
	var count int
	if err := tx.QueryRow(countSQL, church, studentID, lessonID).Scan(&count); err != nil {
		t.Fatalf("count after double bookmark: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 row after bookmarking twice, got %d", count)
	}

	// Unbookmark once, then again — must not error, and must resolve to zero rows.
	if _, err := tx.Exec(unbookmarkSQL, church, studentID, lessonID); err != nil {
		t.Fatalf("first unbookmark: %v", err)
	}
	if _, err := tx.Exec(unbookmarkSQL, church, studentID, lessonID); err != nil {
		t.Fatalf("second (already-removed) unbookmark must succeed cleanly, got: %v", err)
	}
	if err := tx.QueryRow(countSQL, church, studentID, lessonID).Scan(&count); err != nil {
		t.Fatalf("count after double unbookmark: %v", err)
	}
	if count != 0 {
		t.Errorf("expected exactly 0 rows after unbookmarking twice, got %d", count)
	}
}
