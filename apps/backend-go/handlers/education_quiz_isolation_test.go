// education_quiz_isolation_test.go — PR-F's F.9 isolation/behavior suite (5
// tests): cross-church read blocked per table; the retry ceiling; a passed
// result surviving unassignment; a cross-church reviewer refused with no
// row modified; and the guarded question-delete path both ways. Same
// superuserSeedDB (fixture setup, bypasses RLS) + integrationDB (actual
// assertions, jetro_app / RLS-enforced) + setTenantContext pattern as
// education_isolation_test.go.
package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — TestQuizIsolationCrossChurchReadBlocked
//
// Seeds one row per quiz table for Church A and Church B, sets tenant
// context to A, and asserts a deliberately unscoped SELECT never returns
// Church B's row — one subtest per table, matching the codebase's existing
// per-table isolation test shape.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizIsolationCrossChurchReadBlocked(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000f10"
	churchB := "bbbbbbbb-0000-0000-0000-000000000f10"

	type seeded struct {
		lessonID, quizID, questionID, optionID, attemptID, answerID string
	}
	byChurch := map[string]seeded{}

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		var s seeded
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Education Quiz Isolation Church %d", i), fmt.Sprintf("edu-quiz-isolation-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		var curriculumID string
		err = setup.QueryRow(
			`INSERT INTO public.education_curricula (church_id, name, status) VALUES ($1, $2, 'published') RETURNING id`,
			cid, fmt.Sprintf("edu-quiz-isolation-curriculum-%s", cid[:8]),
		).Scan(&curriculumID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed curriculum for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1, $2, 1, $3) RETURNING id`,
			cid, curriculumID, fmt.Sprintf("edu-quiz-isolation-lesson-%s", cid[:8]),
		).Scan(&s.lessonID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed lesson for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_quizzes (church_id, lesson_id) VALUES ($1, $2) RETURNING id`,
			cid, s.lessonID,
		).Scan(&s.quizID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed quiz for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points)
			 VALUES ($1, $2, 1, 'multiple', $3, 10) RETURNING id`,
			cid, s.quizID, fmt.Sprintf("edu-quiz-isolation-prompt-%s", cid[:8]),
		).Scan(&s.questionID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed question for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_quiz_options (church_id, question_id, order_index, text, is_correct)
			 VALUES ($1, $2, 1, $3, true) RETURNING id`,
			cid, s.questionID, fmt.Sprintf("edu-quiz-isolation-option-%s", cid[:8]),
		).Scan(&s.optionID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed option for %s: %v", cid, err)
		}
		var userID string
		err = setup.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
			 VALUES ($1, 'Edu', 'QuizIsolation', '000', 'n/a', $2, 'member', $3) RETURNING id`,
			fmt.Sprintf("edu-quiz-isolation-%s", cid[:8]), fmt.Sprintf("edu-quiz-isolation-%s@example.test", cid[:8]), cid,
		).Scan(&userID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed user for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_quiz_attempts (church_id, quiz_id, user_id, attempt_number, max_score)
			 VALUES ($1, $2, $3, 1, 10) RETURNING id`,
			cid, s.quizID, userID,
		).Scan(&s.attemptID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed attempt for %s: %v", cid, err)
		}
		err = setup.QueryRow(
			`INSERT INTO public.education_quiz_answers (church_id, attempt_id, question_id, selected_option_id)
			 VALUES ($1, $2, $3, $4) RETURNING id`,
			cid, s.attemptID, s.questionID, s.optionID,
		).Scan(&s.answerID)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed answer for %s: %v", cid, err)
		}
		byChurch[cid] = s
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		for _, cid := range []string{churchA, churchB} {
			_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_answers WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_attempts WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_options WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_questions WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.education_quizzes WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.users WHERE email LIKE 'edu-quiz-isolation-%'`)
			_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE church_id = $1`, cid)
			_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, cid)
		}
	})

	tables := []struct {
		name      string
		table     string
		filterCol string
		filterVal func(seeded) string
	}{
		{"education_quizzes", "education_quizzes", "id", func(s seeded) string { return s.quizID }},
		{"education_quiz_questions", "education_quiz_questions", "id", func(s seeded) string { return s.questionID }},
		{"education_quiz_options", "education_quiz_options", "id", func(s seeded) string { return s.optionID }},
		{"education_quiz_attempts", "education_quiz_attempts", "id", func(s seeded) string { return s.attemptID }},
		{"education_quiz_answers", "education_quiz_answers", "id", func(s seeded) string { return s.answerID }},
	}

	for _, tc := range tables {
		t.Run(tc.name, func(t *testing.T) {
			tx, err := db.Begin()
			if err != nil {
				t.Fatalf("test tx begin: %v", err)
			}
			defer tx.Rollback() //nolint:errcheck
			setTenantContext(t, tx, churchA)

			idA := tc.filterVal(byChurch[churchA])
			idB := tc.filterVal(byChurch[churchB])

			// Deliberately NO WHERE church_id — RLS must filter for us.
			rows, err := tx.Query(fmt.Sprintf(`SELECT church_id FROM public.%s WHERE %s IN ($1, $2)`, tc.table, tc.filterCol), idA, idB)
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
			if seenB > 0 {
				t.Errorf("cross-tenant read NOT blocked: saw %d Church B rows in %s while tenant context = Church A", seenB, tc.table)
			}
			if seenA == 0 {
				t.Errorf("own-tenant read unexpectedly empty in %s: expected to see Church A's own row", tc.table)
			}
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// quizAttemptFixture — a single-church quiz + one auto-gradable multiple
// question, used by the remaining 4 tests below. Reuses the SAME church-id
// pattern as education_quiz_leak_test.go's fixture but with a distinct id
// per test to avoid cross-test collisions.
// ─────────────────────────────────────────────────────────────────────────────
type quizAttemptFixture struct {
	churchID, curriculumID, lessonID, quizID, questionID, correctOptID, wrongOptID, studentID string
}

func seedQuizAttemptFixture(t *testing.T, seedDB *sql.DB, church, suffix string, allowRetry bool) quizAttemptFixture {
	t.Helper()
	fx := quizAttemptFixture{churchID: church}

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		church, "Education Quiz Attempt Church "+suffix, "edu-quiz-attempt-church-"+suffix,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status) VALUES ($1, $2, 'published') RETURNING id`,
		church, "edu-quiz-attempt-curriculum-"+suffix,
	).Scan(&fx.curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1, $2, 1, $3) RETURNING id`,
		church, fx.curriculumID, "edu-quiz-attempt-lesson-"+suffix,
	).Scan(&fx.lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quizzes (church_id, lesson_id, pass_score, allow_retry) VALUES ($1, $2, 60, $3) RETURNING id`,
		church, fx.lessonID, allowRetry,
	).Scan(&fx.quizID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed quiz: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points)
		 VALUES ($1, $2, 1, 'multiple', $3, 10) RETURNING id`,
		church, fx.quizID, "edu-quiz-attempt-prompt-"+suffix,
	).Scan(&fx.questionID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed question: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_options (church_id, question_id, order_index, text, is_correct)
		 VALUES ($1, $2, 1, 'edu-quiz-attempt-correct', true) RETURNING id`,
		church, fx.questionID,
	).Scan(&fx.correctOptID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed correct option: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_options (church_id, question_id, order_index, text, is_correct)
		 VALUES ($1, $2, 2, 'edu-quiz-attempt-wrong', false) RETURNING id`,
		church, fx.questionID,
	).Scan(&fx.wrongOptID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed wrong option: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ($1, 'Edu', 'QuizAttempt', '000', 'n/a', $2, 'member', $3) RETURNING id`,
		"edu-quiz-attempt-student-"+suffix, "edu-quiz-attempt-student-"+suffix+"@example.test", church,
	).Scan(&fx.studentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.module_user_roles (church_id, user_id, module_key, role_level)
		 VALUES ($1, $2, 'education', 1) ON CONFLICT (church_id, user_id, module_key) DO UPDATE SET role_level = 1`,
		church, fx.studentID,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student module role: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_answers WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_attempts WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_options WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_questions WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quizzes WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.module_user_roles WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE church_id = $1`, church)
	})
	return fx
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — TestQuizIsolationRetryCeilingEnforced
//
// allow_retry=false → the 2nd StartAttempt call is rejected once the 1st is
// submitted. allow_retry=true → a 3rd is rejected once 2 are used.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizIsolationRetryCeilingEnforced(t *testing.T) {
	ensureGlobalDBPool(t)
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	fx := seedQuizAttemptFixture(t, seedDB, "aaaaaaaa-0000-0000-0000-000000000f11", "noretry", false)
	h := NewEducationHandler()

	// Attempt 1: starts fine.
	c1, rec1, tx1 := newQuizTestContext(t, db, http.MethodPost, "/education/me/lessons/"+fx.lessonID+"/quiz/attempts", fx.churchID, fx.studentID, nil)
	c1.SetParamNames("id")
	c1.SetParamValues(fx.lessonID)
	if err := h.StartAttempt(c1); err != nil {
		t.Fatalf("StartAttempt #1: %v", err)
	}
	if rec1.Code != http.StatusCreated {
		t.Fatalf("StartAttempt #1: expected 201, got %d: %s", rec1.Code, rec1.Body.String())
	}
	var view1 struct {
		AttemptID string `json:"attempt_id"`
	}
	_ = jsonUnmarshalBody(t, rec1, &view1)

	// Submit attempt 1 so a fresh StartAttempt call is a genuinely NEW
	// attempt request, not an idempotent "reuse the open one" no-op.
	c1s, rec1s, _ := newQuizTestContextOnTx(tx1, http.MethodPost, "/education/me/lessons/"+fx.lessonID+"/quiz/attempts/"+view1.AttemptID+"/submit", fx.churchID, fx.studentID)
	c1s.SetParamNames("id", "attemptId")
	c1s.SetParamValues(fx.lessonID, view1.AttemptID)
	if err := h.SubmitAttempt(c1s); err != nil {
		t.Fatalf("SubmitAttempt #1: %v", err)
	}
	if rec1s.Code != http.StatusOK {
		t.Fatalf("SubmitAttempt #1: expected 200, got %d: %s", rec1s.Code, rec1s.Body.String())
	}

	// Attempt 2: must be rejected (ceiling = 1 since allow_retry=false).
	c2, rec2, _ := newQuizTestContextOnTx(tx1, http.MethodPost, "/education/me/lessons/"+fx.lessonID+"/quiz/attempts", fx.churchID, fx.studentID)
	c2.SetParamNames("id")
	c2.SetParamValues(fx.lessonID)
	if err := h.StartAttempt(c2); err != nil {
		t.Fatalf("StartAttempt #2: %v", err)
	}
	if rec2.Code != http.StatusConflict {
		t.Errorf("retry ceiling NOT enforced: expected 409 on the 2nd attempt (allow_retry=false), got %d: %s",
			rec2.Code, rec2.Body.String())
	}
	tx1.Rollback() //nolint:errcheck

	// ── allow_retry=true: the 3rd attempt must be rejected, not the 2nd. ──
	fx2 := seedQuizAttemptFixture(t, seedDB, "aaaaaaaa-0000-0000-0000-000000000f12", "retry", true)
	txr, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer txr.Rollback() //nolint:errcheck
	setTenantContext(t, txr, fx2.churchID)

	for i := 1; i <= 2; i++ {
		c, rec, _ := newQuizTestContextOnTx(txr, http.MethodPost, "/education/me/lessons/"+fx2.lessonID+"/quiz/attempts", fx2.churchID, fx2.studentID)
		c.SetParamNames("id")
		c.SetParamValues(fx2.lessonID)
		if err := h.StartAttempt(c); err != nil {
			t.Fatalf("StartAttempt (retry-allowed) #%d: %v", i, err)
		}
		if rec.Code != http.StatusCreated {
			t.Fatalf("StartAttempt (retry-allowed) #%d: expected 201, got %d: %s", i, rec.Code, rec.Body.String())
		}
		var v struct {
			AttemptID string `json:"attempt_id"`
		}
		_ = jsonUnmarshalBody(t, rec, &v)
		cs, recs, _ := newQuizTestContextOnTx(txr, http.MethodPost, "/education/me/lessons/"+fx2.lessonID+"/quiz/attempts/"+v.AttemptID+"/submit", fx2.churchID, fx2.studentID)
		cs.SetParamNames("id", "attemptId")
		cs.SetParamValues(fx2.lessonID, v.AttemptID)
		if err := h.SubmitAttempt(cs); err != nil {
			t.Fatalf("SubmitAttempt (retry-allowed) #%d: %v", i, err)
		}
		if recs.Code != http.StatusOK {
			t.Fatalf("SubmitAttempt (retry-allowed) #%d: expected 200, got %d: %s", i, recs.Code, recs.Body.String())
		}
	}
	c3, rec3, _ := newQuizTestContextOnTx(txr, http.MethodPost, "/education/me/lessons/"+fx2.lessonID+"/quiz/attempts", fx2.churchID, fx2.studentID)
	c3.SetParamNames("id")
	c3.SetParamValues(fx2.lessonID)
	if err := h.StartAttempt(c3); err != nil {
		t.Fatalf("StartAttempt #3: %v", err)
	}
	if rec3.Code != http.StatusConflict {
		t.Errorf("retry ceiling NOT enforced: expected 409 on the 3rd attempt (allow_retry=true, ceiling=2), got %d: %s",
			rec3.Code, rec3.Body.String())
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — TestQuizIsolationPassSurvivesUnassignment
//
// A student passes a quiz, is then unassigned from the course (their
// education_assignments row deleted — ON DELETE SET NULL on
// attempts.assignment_id), and the attempt's `passed=true` must remain
// intact: a grade is a historical fact about what the student did, not a
// property of their current enrollment.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizIsolationPassSurvivesUnassignment(t *testing.T) {
	ensureGlobalDBPool(t)
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	fx := seedQuizAttemptFixture(t, seedDB, "aaaaaaaa-0000-0000-0000-000000000f13", "unassign", false)
	h := NewEducationHandler()

	// Enroll the student so StartAttempt links assignment_id.
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("assign setup: %v", err)
	}
	var assignmentID string
	if err := setup.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to) VALUES ($1, $2, $3) RETURNING id`,
		fx.churchID, fx.curriculumID, fx.studentID,
	).Scan(&assignmentID); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed assignment: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("assign commit: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, fx.churchID)

	c, rec, _ := newQuizTestContextOnTx(tx, http.MethodPost, "/education/me/lessons/"+fx.lessonID+"/quiz/attempts", fx.churchID, fx.studentID)
	c.SetParamNames("id")
	c.SetParamValues(fx.lessonID)
	if err := h.StartAttempt(c); err != nil {
		t.Fatalf("StartAttempt: %v", err)
	}
	var view struct {
		AttemptID string `json:"attempt_id"`
	}
	_ = jsonUnmarshalBody(t, rec, &view)

	// Save the correct answer, then submit — must pass (pass_score=60,
	// 1/1 question correct = 100%).
	cSave, recSave, _ := newQuizTestContextOnTx(tx, http.MethodPut,
		"/education/me/lessons/"+fx.lessonID+"/quiz/attempts/"+view.AttemptID+"/answers", fx.churchID, fx.studentID)
	cSave.SetParamNames("id", "attemptId")
	cSave.SetParamValues(fx.lessonID, view.AttemptID)
	setJSONBody(t, cSave, map[string]interface{}{"question_id": fx.questionID, "selected_option_id": fx.correctOptID})
	if err := h.SaveAnswer(cSave); err != nil {
		t.Fatalf("SaveAnswer: %v", err)
	}
	if recSave.Code != http.StatusOK {
		t.Fatalf("SaveAnswer: expected 200, got %d: %s", recSave.Code, recSave.Body.String())
	}

	cSub, recSub, _ := newQuizTestContextOnTx(tx, http.MethodPost,
		"/education/me/lessons/"+fx.lessonID+"/quiz/attempts/"+view.AttemptID+"/submit", fx.churchID, fx.studentID)
	cSub.SetParamNames("id", "attemptId")
	cSub.SetParamValues(fx.lessonID, view.AttemptID)
	if err := h.SubmitAttempt(cSub); err != nil {
		t.Fatalf("SubmitAttempt: %v", err)
	}
	if recSub.Code != http.StatusOK {
		t.Fatalf("SubmitAttempt: expected 200, got %d: %s", recSub.Code, recSub.Body.String())
	}

	var passedBefore sql.NullBool
	if err := tx.QueryRow(`SELECT passed FROM education_quiz_attempts WHERE id = $1`, view.AttemptID).Scan(&passedBefore); err != nil {
		t.Fatalf("read passed (before unassign): %v", err)
	}
	if !passedBefore.Valid || !passedBefore.Bool {
		t.Fatalf("test fixture invariant broken: expected the attempt to have passed before unassignment (got %v)", passedBefore)
	}

	// Unassign: delete the education_assignments row.
	if _, err := tx.Exec(`DELETE FROM education_assignments WHERE id = $1 AND church_id = $2`, assignmentID, fx.churchID); err != nil {
		t.Fatalf("delete assignment: %v", err)
	}

	var passedAfter sql.NullBool
	var assignmentAfter sql.NullString
	if err := tx.QueryRow(`SELECT passed, assignment_id::text FROM education_quiz_attempts WHERE id = $1`, view.AttemptID).
		Scan(&passedAfter, &assignmentAfter); err != nil {
		t.Fatalf("read passed (after unassign): %v", err)
	}
	if !passedAfter.Valid || !passedAfter.Bool {
		t.Errorf("pass did NOT survive unassignment: passed = %v after deleting the assignment, want true", passedAfter)
	}
	if assignmentAfter.Valid {
		t.Errorf("test fixture invariant broken: assignment_id still set after deleting the assignment row (FK ON DELETE SET NULL not applied) — got %q", assignmentAfter.String)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — TestQuizIsolationCrossChurchReviewerRefused
//
// A level-3 reviewer from Church B must be refused when grading a short
// answer that belongs to Church A — AND a follow-up read must confirm no
// row was actually modified (not just that the handler returned an error
// code while silently mutating the row anyway).
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizIsolationCrossChurchReviewerRefused(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000f14"
	churchB := "bbbbbbbb-0000-0000-0000-000000000f14"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for _, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, "Education Quiz Reviewer Church "+cid[:8], "edu-quiz-reviewer-church-"+cid[:8],
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
	}
	var curriculumID, lessonID, quizID, questionID, attemptID, answerID, studentID, reviewerBID string
	err = setup.QueryRow(`INSERT INTO public.education_curricula (church_id, name, status) VALUES ($1,'edu-quiz-reviewer-curriculum','published') RETURNING id`, churchA).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1,$2,1,'edu-quiz-reviewer-lesson') RETURNING id`, churchA, curriculumID).Scan(&lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.education_quizzes (church_id, lesson_id, pass_score) VALUES ($1,$2,60) RETURNING id`, churchA, lessonID).Scan(&quizID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed quiz: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points) VALUES ($1,$2,1,'short','edu-quiz-reviewer-prompt',10) RETURNING id`, churchA, quizID).Scan(&questionID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed question: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id) VALUES ('edu-quiz-reviewer-student','Edu','ReviewerStudent','000','n/a','edu-quiz-reviewer-student@example.test','member',$1) RETURNING id`, churchA).Scan(&studentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.education_quiz_attempts (church_id, quiz_id, user_id, attempt_number, max_score, submitted_at, review_pending) VALUES ($1,$2,$3,1,10,now(),true) RETURNING id`, churchA, quizID, studentID).Scan(&attemptID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed attempt: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.education_quiz_answers (church_id, attempt_id, question_id, text_answer) VALUES ($1,$2,$3,'edu-quiz-reviewer-answer-text') RETURNING id`, churchA, attemptID, questionID).Scan(&answerID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed answer: %v", err)
	}
	err = setup.QueryRow(`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id) VALUES ('edu-quiz-reviewer-b','Edu','ReviewerB','000','n/a','edu-quiz-reviewer-b@example.test','member',$1) RETURNING id`, churchB).Scan(&reviewerBID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed reviewer B: %v", err)
	}
	_, err = setup.Exec(`INSERT INTO public.module_user_roles (church_id, user_id, module_key, role_level) VALUES ($1,$2,'education',3) ON CONFLICT (church_id,user_id,module_key) DO UPDATE SET role_level=3`, churchB, reviewerBID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed reviewer B module role: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_answers WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_attempts WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_questions WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quizzes WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.module_user_roles WHERE user_id = $1`, reviewerBID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id IN ($1, $2)`, studentID, reviewerBID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, churchA)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, churchB)
	})

	h := NewEducationHandler()
	// Reviewer B, tenant context = Church B (their OWN church) — the exact
	// shape a real cross-church request would carry: JWT/tenant say B, the
	// answer id belongs to A.
	c, rec, tx := newQuizTestContext(t, db, http.MethodPut, "/education/reviews/answers/"+answerID, churchB, reviewerBID,
		mustJSON(t, map[string]interface{}{"is_correct": true, "awarded_points": 10}))
	c.SetParamNames("answerId")
	c.SetParamValues(answerID)
	if err := h.ReviewAnswer(c); err != nil {
		t.Fatalf("ReviewAnswer returned Go error: %v", err)
	}
	if rec.Code != http.StatusNotFound && rec.Code != http.StatusForbidden {
		t.Errorf("expected 404 or 403 for a cross-church reviewer, got %d: %s", rec.Code, rec.Body.String())
	}

	// Follow-up read (as superuser, bypassing RLS entirely) confirms no row
	// was actually modified — the refusal is real, not cosmetic.
	var isCorrect sql.NullBool
	var reviewedBy sql.NullString
	if err := seedDB.QueryRow(`SELECT is_correct, reviewed_by::text FROM education_quiz_answers WHERE id = $1`, answerID).
		Scan(&isCorrect, &reviewedBy); err != nil {
		t.Fatalf("follow-up read: %v", err)
	}
	if isCorrect.Valid {
		t.Errorf("cross-church reviewer refusal was cosmetic: is_correct was set to %v despite the 403/404", isCorrect.Bool)
	}
	if reviewedBy.Valid {
		t.Errorf("cross-church reviewer refusal was cosmetic: reviewed_by was set to %q despite the 403/404", reviewedBy.String)
	}
	tx.Rollback() //nolint:errcheck
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — TestQuizIsolationGuardedDeleteBothWays
//
// DeleteQuestion refuses (names the answer count) without force=true, and
// succeeds with force=true.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizIsolationGuardedDeleteBothWays(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	fx := seedQuizAttemptFixture(t, seedDB, "aaaaaaaa-0000-0000-0000-000000000f15", "guarded-delete", false)

	// Seed one answer against the question directly (bypassing the runner —
	// we only need answer_count > 0 for this test).
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("answer setup: %v", err)
	}
	var attemptID string
	if err := setup.QueryRow(
		`INSERT INTO public.education_quiz_attempts (church_id, quiz_id, user_id, attempt_number, max_score)
		 VALUES ($1, $2, $3, 1, 10) RETURNING id`,
		fx.churchID, fx.quizID, fx.studentID,
	).Scan(&attemptID); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed attempt: %v", err)
	}
	if _, err := setup.Exec(
		`INSERT INTO public.education_quiz_answers (church_id, attempt_id, question_id, selected_option_id)
		 VALUES ($1, $2, $3, $4)`,
		fx.churchID, attemptID, fx.questionID, fx.correctOptID,
	); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed answer: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("answer commit: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, fx.churchID)

	// Without force: must be refused, message names the count (1).
	err = DeleteQuestion(tx, fx.churchID, fx.questionID, false)
	if err == nil {
		t.Fatalf("expected DeleteQuestion to refuse deleting a question with answers when force=false")
	}
	if !containsSubstring(err.Error(), "1") {
		t.Errorf("DeleteQuestion's refusal message doesn't name the answer count (1): %q", err.Error())
	}
	var stillExists bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_quiz_questions WHERE id = $1)`, fx.questionID).Scan(&stillExists); err != nil {
		t.Fatalf("verify question still exists: %v", err)
	}
	if !stillExists {
		t.Fatalf("guarded delete was NOT actually blocked: the question row is gone despite force=false")
	}

	// With force=true: must succeed.
	if err := DeleteQuestion(tx, fx.churchID, fx.questionID, true); err != nil {
		t.Errorf("expected DeleteQuestion to succeed with force=true, got: %v", err)
	}
	var goneNow bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_quiz_questions WHERE id = $1)`, fx.questionID).Scan(&goneNow); err != nil {
		t.Fatalf("verify question deleted: %v", err)
	}
	if goneNow {
		t.Errorf("DeleteQuestion with force=true did not actually remove the row")
	}
}

func containsSubstring(s, substr string) bool {
	return len(s) >= len(substr) && (func() bool {
		for i := 0; i+len(substr) <= len(s); i++ {
			if s[i:i+len(substr)] == substr {
				return true
			}
		}
		return false
	})()
}
