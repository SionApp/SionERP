// education_analytics_test.go — PR-K's K.5 integration coverage.
//
// Two real-Postgres tests, same superuserSeedDB (fixture setup, bypasses
// RLS) + integrationDB/newQuizTestContext (actual assertions, jetro_app /
// RLS-enforced) harness as every other education integration test in this
// package (see education_quiz_leak_test.go's file header for the full
// rationale on why handlers are invoked directly with a manually-built
// echo.Context rather than through a live router).
//
//   - TestAnalyticsRosterStatusPrecedence seeds one student per roster status
//     (completed, in_review, overdue, inactive, in_progress, pending) and
//     asserts GetStudentRoster's derived `status` field matches the
//     precedence order from sdd/education-module/tasks-v2-part2's PR-K
//     section, plus that the 4 KPI aggregates in the same response are
//     computed from those exact seeded rows (not hardcoded/stale).
//   - TestAnalyticsReviewQueueExcludesReflections is the mandated negative
//     control: seeds review-pending short-answer quiz answers ALONGSIDE a
//     real lesson reflection in the same church, and asserts the reflection
//     contributes ZERO to GetReviewQueue's count/body — proving the
//     exclusion structurally, not by absence of a positive test.
package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"backend-sion/models"
)

// ─────────────────────────────────────────────────────────────────────────────
// TestAnalyticsRosterStatusPrecedence
// ─────────────────────────────────────────────────────────────────────────────
func TestAnalyticsRosterStatusPrecedence(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-00000000a1a1"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	rollbackOnErr := func(err error, msg string) {
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("%s: %v", msg, err)
		}
	}

	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		church, "Education Analytics Church", "edu-analytics-church",
	)
	rollbackOnErr(err, "seed church")

	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status) VALUES ($1, $2, 'published') RETURNING id`,
		church, "edu-analytics-curriculum",
	).Scan(&curriculumID)
	rollbackOnErr(err, "seed curriculum")

	// 2 lessons so completed-vs-partial is distinguishable.
	var lesson1ID, lesson2ID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1, $2, 1, 'L1') RETURNING id`,
		church, curriculumID,
	).Scan(&lesson1ID)
	rollbackOnErr(err, "seed lesson 1")
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1, $2, 2, 'L2') RETURNING id`,
		church, curriculumID,
	).Scan(&lesson2ID)
	rollbackOnErr(err, "seed lesson 2")

	// One quiz on lesson1, used only by the in_review student's attempt.
	var quizID string
	err = setup.QueryRow(
		`INSERT INTO public.education_quizzes (church_id, lesson_id) VALUES ($1, $2) RETURNING id`,
		church, lesson1ID,
	).Scan(&quizID)
	rollbackOnErr(err, "seed quiz")
	var questionID string
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points)
		 VALUES ($1, $2, 1, 'short', 'edu-analytics-question', 10) RETURNING id`,
		church, quizID,
	).Scan(&questionID)
	rollbackOnErr(err, "seed question")

	seedUser := func(tag string) string {
		var userID string
		err = setup.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
			 VALUES ($1, 'Analytics', $2, '000', 'n/a', $3, 'member', $4) RETURNING id`,
			fmt.Sprintf("edu-analytics-%s", tag), tag, fmt.Sprintf("edu-analytics-%s@example.test", tag), church,
		).Scan(&userID)
		rollbackOnErr(err, "seed user "+tag)
		return userID
	}
	seedAssignment := func(userID string, dueDate *string) string {
		var assignmentID string
		err = setup.QueryRow(
			`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, assigned_by, due_date)
			 VALUES ($1, $2, $3, $3, $4) RETURNING id`,
			church, curriculumID, userID, dueDate,
		).Scan(&assignmentID)
		rollbackOnErr(err, "seed assignment for "+userID)
		return assignmentID
	}

	// 1. completed — both lessons completed_at set.
	completedUser := seedUser("Completed")
	completedAssignment := seedAssignment(completedUser, nil)
	for _, lid := range []string{lesson1ID, lesson2ID} {
		_, err = setup.Exec(
			`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, completed_at)
			 VALUES ($1, $2, $3, now())`,
			church, completedAssignment, lid,
		)
		rollbackOnErr(err, "seed completed progress")
	}
	_, err = setup.Exec(`UPDATE public.education_assignments SET completed_at = now() WHERE id = $1`, completedAssignment)
	rollbackOnErr(err, "mark assignment completed")

	// 2. in_review — a review-pending quiz attempt, even with an overdue
	// due_date, must win over 'overdue' per the precedence order.
	pastDue := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
	inReviewUser := seedUser("InReview")
	seedAssignment(inReviewUser, &pastDue)
	var inReviewAttemptID string
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_attempts (church_id, quiz_id, user_id, attempt_number, max_score, review_pending)
		 VALUES ($1, $2, $3, 1, 10, true) RETURNING id`,
		church, quizID, inReviewUser,
	).Scan(&inReviewAttemptID)
	rollbackOnErr(err, "seed in-review attempt")
	_, err = setup.Exec(
		`INSERT INTO public.education_quiz_answers (church_id, attempt_id, question_id, text_answer)
		 VALUES ($1, $2, $3, 'edu-analytics pending answer')`,
		church, inReviewAttemptID, questionID,
	)
	rollbackOnErr(err, "seed in-review answer")

	// 3. overdue — due_date in the past, nothing completed, no review pending.
	overdueUser := seedUser("Overdue")
	seedAssignment(overdueUser, &pastDue)

	// 4. inactive — one progress row, backdated 20 days so it clears the
	// 14-day threshold; no due_date (so it can't accidentally read as overdue).
	inactiveUser := seedUser("Inactive")
	inactiveAssignment := seedAssignment(inactiveUser, nil)
	_, err = setup.Exec(
		`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, started_at, updated_at)
		 VALUES ($1, $2, $3, now() - interval '20 days', now() - interval '20 days')`,
		church, inactiveAssignment, lesson1ID,
	)
	rollbackOnErr(err, "seed inactive progress")

	// 5. in_progress — a fresh (not completed) progress row, well within 14 days.
	inProgressUser := seedUser("InProgress")
	inProgressAssignment := seedAssignment(inProgressUser, nil)
	_, err = setup.Exec(
		`INSERT INTO public.education_lesson_progress (church_id, assignment_id, lesson_id, started_at, updated_at)
		 VALUES ($1, $2, $3, now(), now())`,
		church, inProgressAssignment, lesson1ID,
	)
	rollbackOnErr(err, "seed in-progress progress")

	// 6. pending — assignment exists, zero progress rows, zero attempts.
	pendingUser := seedUser("Pending")
	seedAssignment(pendingUser, nil)

	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE church_id = $1 AND id_number LIKE 'edu-analytics-%'`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	})

	c, rec, tx := newQuizTestContext(t, db, http.MethodGet, "/education/curricula/"+curriculumID+"/roster", church, completedUser, nil)
	defer tx.Rollback() //nolint:errcheck
	c.SetParamNames("id")
	c.SetParamValues(curriculumID)

	h := NewEducationHandler()
	if err := h.GetStudentRoster(c); err != nil {
		t.Fatalf("GetStudentRoster returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("GetStudentRoster: expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}

	var resp models.StudentRosterResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not valid JSON: %v\nbody: %s", err, rec.Body.String())
	}

	statusByUser := map[string]string{}
	for _, s := range resp.Students {
		statusByUser[s.UserID] = s.Status
	}

	wantStatus := map[string]string{
		completedUser:  "completed",
		inReviewUser:   "in_review",
		overdueUser:    "overdue",
		inactiveUser:   "inactive",
		inProgressUser: "in_progress",
		pendingUser:    "pending",
	}
	for userID, want := range wantStatus {
		got, ok := statusByUser[userID]
		if !ok {
			t.Errorf("roster missing a row for seeded user %s (wanted status %q)", userID, want)
			continue
		}
		if got != want {
			t.Errorf("status precedence mismatch for user %s: got %q, want %q", userID, got, want)
		}
	}
	if len(resp.Students) != 6 {
		t.Errorf("expected exactly 6 roster rows (one per seeded status), got %d", len(resp.Students))
	}

	// KPI aggregates must be REAL, derived from these exact 6 rows — not a
	// hardcoded/stale number. 1 of 6 is inactive; avg progress across all 6
	// assignments (2/2, 0/2, 0/2, 0/2 [inactive still has 0 completed], 0/2,
	// 0/2) is exactly 1/6 = 16.666...%.
	if resp.Kpis.InactiveCount != 1 {
		t.Errorf("kpis.inactive_count: got %d, want 1", resp.Kpis.InactiveCount)
	}
	wantAvg := 100.0 / 6.0
	if diff := resp.Kpis.AvgProgressPct - wantAvg; diff > 0.01 || diff < -0.01 {
		t.Errorf("kpis.avg_progress_pct: got %v, want ~%v", resp.Kpis.AvgProgressPct, wantAvg)
	}
	if resp.Kpis.ActiveStudents != 6 {
		t.Errorf("kpis.active_students: got %d, want 6 (total roster size)", resp.Kpis.ActiveStudents)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestAnalyticsReviewQueueExcludesReflections
//
// Negative control: seeds review-pending SHORT-answer quiz answers alongside
// a REAL education_lesson_reflections row in the SAME church, then asserts
// the reflection contributes ZERO to GetReviewQueue's count or body bytes. A
// test that only seeds quiz answers would prove nothing about the exclusion
// this scenario guards (spec: education-manual-review, "reflections
// excluded from the review queue count").
// ─────────────────────────────────────────────────────────────────────────────
func TestAnalyticsReviewQueueExcludesReflections(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-00000000a2a2"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	rollbackOnErr := func(err error, msg string) {
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("%s: %v", msg, err)
		}
	}

	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		church, "Education Review Negative Control Church", "edu-review-negctrl-church",
	)
	rollbackOnErr(err, "seed church")

	var curriculumID string
	err = setup.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status) VALUES ($1, $2, 'published') RETURNING id`,
		church, "edu-review-negctrl-curriculum",
	).Scan(&curriculumID)
	rollbackOnErr(err, "seed curriculum")

	var lessonID string
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title) VALUES ($1, $2, 1, 'L1') RETURNING id`,
		church, curriculumID,
	).Scan(&lessonID)
	rollbackOnErr(err, "seed lesson")

	var quizID string
	err = setup.QueryRow(
		`INSERT INTO public.education_quizzes (church_id, lesson_id) VALUES ($1, $2) RETURNING id`,
		church, lessonID,
	).Scan(&quizID)
	rollbackOnErr(err, "seed quiz")

	var studentID string
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-review-negctrl', 'Review', 'NegCtrl', '000', 'n/a', 'edu-review-negctrl@example.test', 'member', $1) RETURNING id`,
		church,
	).Scan(&studentID)
	rollbackOnErr(err, "seed student")

	// Three review-pending short-answer questions/answers on one attempt —
	// the review queue's REAL positive-count source.
	const wantShortAnswerCount = 3
	var attemptID string
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_attempts (church_id, quiz_id, user_id, attempt_number, max_score, review_pending, submitted_at)
		 VALUES ($1, $2, $3, 1, 30, true, now()) RETURNING id`,
		church, quizID, studentID,
	).Scan(&attemptID)
	rollbackOnErr(err, "seed attempt")

	answerTexts := []string{
		"edu-review-negctrl short answer one",
		"edu-review-negctrl short answer two",
		"edu-review-negctrl short answer three",
	}
	for i, text := range answerTexts {
		var questionID string
		err = setup.QueryRow(
			`INSERT INTO public.education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points)
			 VALUES ($1, $2, $3, 'short', $4, 10) RETURNING id`,
			church, quizID, i+1, fmt.Sprintf("edu-review-negctrl-prompt-%d", i+1),
		).Scan(&questionID)
		rollbackOnErr(err, "seed question")
		_, err = setup.Exec(
			`INSERT INTO public.education_quiz_answers (church_id, attempt_id, question_id, text_answer)
			 VALUES ($1, $2, $3, $4)`,
			church, attemptID, questionID, text,
		)
		rollbackOnErr(err, "seed answer")
	}

	// The negative control itself: a REAL lesson reflection, same church,
	// same lesson, distinctive text that would be trivially spottable if it
	// ever leaked into the review queue's response bytes.
	const reflectionText = "edu-review-negctrl THIS-IS-A-REFLECTION-NOT-A-REVIEW-ITEM"
	_, err = setup.Exec(
		`INSERT INTO public.education_lesson_reflections (church_id, lesson_id, block_id, user_id, answer)
		 VALUES ($1, $2, 'block-1', $3, $4)`,
		church, lessonID, studentID, reflectionText,
	)
	rollbackOnErr(err, "seed reflection")

	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = $1`, studentID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	})

	// GetReviewQueue is level >= 3 (author) — called here as the SAME seeded
	// student for connection simplicity, but with module_role_level forced
	// to author level on the context, exactly like a real RequireModuleLevel-
	// gated PUT/POST route would have it pre-populated by middleware (see
	// newQuizContextOn's own comment on why GET routes leave this unset by
	// default and GetQuizAuthor-style handlers resolve it themselves — this
	// endpoint is simpler and trusts the route-level gate, so the test must
	// supply what that gate would have set).
	c, rec, tx := newQuizTestContext(t, db, http.MethodGet, "/education/reviews", church, studentID, nil)
	defer tx.Rollback() //nolint:errcheck
	c.Set("module_role_level", educationAuthorLevel)

	h := NewEducationHandler()
	if err := h.GetReviewQueue(c); err != nil {
		t.Fatalf("GetReviewQueue returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("GetReviewQueue: expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}

	var items []QuizReviewQueueItem
	if err := json.Unmarshal(rec.Body.Bytes(), &items); err != nil {
		t.Fatalf("response is not valid JSON: %v\nbody: %s", err, rec.Body.String())
	}

	// Scope to THIS test's own fixture rows only (the queue is church-wide,
	// but this tx's tenant context is already set to `church`, so cross-
	// tenant leakage from other tests isn't possible here — still filter by
	// our own attempt id defensively in case a prior run left stale rows).
	ours := 0
	for _, it := range items {
		if it.AttemptID == attemptID {
			ours++
		}
	}
	if ours != wantShortAnswerCount {
		t.Errorf("GetReviewQueue count for our own attempt: got %d, want %d (one per seeded short answer)", ours, wantShortAnswerCount)
	}

	if rec.Body.String() != "" && strings.Contains(rec.Body.String(), reflectionText) {
		t.Errorf("review queue response leaked the seeded reflection's text — reflections must contribute ZERO to this endpoint")
	}
	for _, it := range items {
		if it.TextAnswer == reflectionText {
			t.Errorf("review queue item %s carries the reflection's own text_answer — exclusion boundary violated", it.AnswerID)
		}
	}

	// Sanity check the negative control actually seeded something real (a
	// test with a reflection count of zero possible rows proves nothing).
	// Queried via the SUPERUSER connection (bypasses RLS) — a bare read on
	// the jetro_app pool with no tenant context set would be blocked by RLS
	// and falsely read back zero regardless of what was actually seeded.
	var reflectionCount int
	if err := seedDB.QueryRow(
		`SELECT COUNT(*) FROM public.education_lesson_reflections WHERE lesson_id = $1 AND answer = $2`,
		lessonID, reflectionText,
	).Scan(&reflectionCount); err != nil {
		t.Fatalf("sanity-check reflection count: %v", err)
	}
	if reflectionCount != 1 {
		t.Fatalf("negative control setup broken: expected exactly 1 seeded reflection row, found %d", reflectionCount)
	}
}
