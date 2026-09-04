// education_quiz_leak_test.go — the answer-leak boundary RED tests (PR-F).
//
// Spec ref: education-quiz-runtime, "answer-leak boundary — MUST NOT be
// simplified" (the design's own designated highest-risk slice). These three
// tests were written and confirmed to fail BEFORE
// handlers/education_quiz_runner.go, handlers/education_quiz_admin.go, or
// their route wiring existed — see sdd/education-module/apply-progress-v2
// for the exact RED-phase command/output evidence. They must stay GREEN
// through every later task in this PR (F.6, F.7, F.8): re-run them after
// each subsequent change.
//
// Test-harness note (documented deviation from a route-level HTTP dispatch,
// consistent with every OTHER boundary test in this package): this codebase
// never spins up a full Echo router + middleware chain in tests — every
// existing isolation/ownership boundary test (see education_isolation_test.go,
// education_progress_semantics_test.go) calls either the exact production
// SQL or the production handler function directly, with a manually built
// echo.Context standing in for what real middleware would have set up. We
// follow the same pattern here:
//   - A real *sql.Tx opened on the jetro_app-authenticated connection
//     (integrationDB) with app.current_church_id set via setTenantContext —
//     stashed on the context under config.TxKey(), exactly like TenantTx
//     middleware does in production. validateTx(c)/config.Tx(c) inside the
//     handler under test retrieve this same tx, so every query the handler
//     runs is genuinely RLS-enforced as jetro_app, not superuser.
//   - "module_role_level" is deliberately left UNSET on the context, so
//     getEducationAccessInfo(c) falls through to its own DB-backed
//     resolution query — run against the SAME stashed tx — exactly as it
//     would for a real GET route (only PUT/POST routes gated by
//     middleware.RequireModuleLevel get "module_role_level" pre-populated;
//     GetQuizAuthor's route is registered at RequireModuleLevel(..., 3), so
//     in production this value WOULD be pre-set to the resolved level — we
//     deliberately do NOT special-case that here, because
//     middleware.RequireModuleLevel's own DB query runs on the global
//     config.GetDB() pool, which in this app connects as the `postgres`
//     superuser (see apps/backend-go/.env) and is not safely constructible
//     inside an isolated Go test process. Instead, GetQuizAuthor carries its
//     OWN internal defense-in-depth level check via getEducationAccessInfo
//     (mirroring the existing pattern in GetSyllabus/lessonReadAccess) —
//     this test exercises THAT guard directly. It is a real, independently
//     load-bearing guard: if the route-level middleware were ever
//     misconfigured to a lower minLevel, this in-handler check is what
//     still stops a level-1 caller. See TestQuizAuthorRouteForbiddenForStudent
//     below for why this is not an "accidental pass" — the negative control
//     proves the SAME code path returns 200 (not 403) for a level-3 caller.
package handlers

import (
	"backend-sion/config"
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// TestQuizRunnerModelDeclaresNoAnswerKey
//
// Structural guarantee, not a behavioral one (design decision A7): reads
// models/education_quiz_runner.go from disk (NOT via reflection — a field
// could be renamed away from Go's reflection-visible tag inspection but not
// away from a literal grep) and fails if any of the 4 forbidden identifiers
// appear ANYWHERE in that file, including comments.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizRunnerModelDeclaresNoAnswerKey(t *testing.T) {
	// Path relative to this test file's own package directory
	// (apps/backend-go/handlers) — models is a sibling package directory.
	const path = "../models/education_quiz_runner.go"
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("could not read %s: %v", path, err)
	}
	src := string(raw)

	forbidden := []string{
		"is_correct",
		"IsCorrect",
		"feedback_ok",
		"FeedbackOk",
		"feedback_bad",
		"FeedbackBad",
		"CorrectOptionID",
		"correct_option_id",
	}
	for _, needle := range forbidden {
		if strings.Contains(src, needle) {
			t.Errorf("answer-leak boundary violated: %s contains forbidden identifier %q — "+
				"the pre-submit runner model must NEVER declare an answer-key field, not even in a comment",
				path, needle)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// quizLeakFixture seeds one church + published curriculum + lesson + quiz +
// one multiple-choice question with 2 options (one correct) and BOTH
// feedback strings, plus a level-1 student in that church. Uses the
// superuser connection for setup (bypasses RLS), matching every other
// education test's fixture pattern.
// ─────────────────────────────────────────────────────────────────────────────
type quizLeakFixture struct {
	churchID     string
	lessonID     string
	quizID       string
	questionID   string
	correctOptID string
	wrongOptID   string
	studentID    string
	feedbackOK   string
	feedbackBad  string
}

func mustSeedQuizLeakFixture(t *testing.T, seedDB *sql.DB) quizLeakFixture {
	t.Helper()

	church := "eeeeeeee-0000-0000-0000-000000000f01"
	fx := quizLeakFixture{
		churchID:    church,
		feedbackOK:  "edu-quiz-leak-feedback-ok-perfecto-entendiste-el-concepto",
		feedbackBad: "edu-quiz-leak-feedback-bad-repasa-el-capitulo-tres",
	}

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, 'Education Quiz Leak Church', 'edu-quiz-leak-church', NOW(), NOW())
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
		 VALUES ($1, 'edu-quiz-leak-curriculum', 'published') RETURNING id`,
		church,
	).Scan(&curriculumID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed curriculum: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_lessons (church_id, curriculum_id, order_index, title)
		 VALUES ($1, $2, 1, 'edu-quiz-leak-lesson') RETURNING id`,
		church, curriculumID,
	).Scan(&fx.lessonID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed lesson: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quizzes (church_id, lesson_id, pass_score, allow_retry, show_result)
		 VALUES ($1, $2, 60, false, true) RETURNING id`,
		church, fx.lessonID,
	).Scan(&fx.quizID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed quiz: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_questions
			(church_id, quiz_id, order_index, type, prompt, points, feedback_ok, feedback_bad)
		 VALUES ($1, $2, 1, 'multiple', 'edu-quiz-leak-prompt-cual-es-la-capital', 10, $3, $4)
		 RETURNING id`,
		church, fx.quizID, fx.feedbackOK, fx.feedbackBad,
	).Scan(&fx.questionID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed question: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_options (church_id, question_id, order_index, text, is_correct)
		 VALUES ($1, $2, 1, 'edu-quiz-leak-option-correct', true) RETURNING id`,
		church, fx.questionID,
	).Scan(&fx.correctOptID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed correct option: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.education_quiz_options (church_id, question_id, order_index, text, is_correct)
		 VALUES ($1, $2, 2, 'edu-quiz-leak-option-wrong', false) RETURNING id`,
		church, fx.questionID,
	).Scan(&fx.wrongOptID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed wrong option: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-quiz-leak-student', 'Edu', 'QuizLeakStudent', '000', 'n/a', 'edu-quiz-leak-student@example.test', 'member', $1)
		 RETURNING id`,
		church,
	).Scan(&fx.studentID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed student: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.module_user_roles (church_id, user_id, module_key, role_level)
		 VALUES ($1, $2, 'education', 1)
		 ON CONFLICT (church_id, user_id, module_key) DO UPDATE SET role_level = 1`,
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
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_answers WHERE question_id = $1`, fx.questionID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_attempts WHERE quiz_id = $1`, fx.quizID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_options WHERE question_id = $1`, fx.questionID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quiz_questions WHERE id = $1`, fx.questionID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_quizzes WHERE id = $1`, fx.quizID)
		_, _ = seedDB.Exec(`DELETE FROM public.module_user_roles WHERE user_id = $1`, fx.studentID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_lessons WHERE id = $1`, fx.lessonID)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE id = $1`, curriculumID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = $1`, fx.studentID)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	})
	return fx
}

// newQuizTestContext builds an echo.Context with a real jetro_app tx
// stashed under config.TxKey() (same GUC-scoping as TenantTx middleware),
// plus user_id/church_id set exactly as SupabaseAuth would — deliberately
// leaving module_role_level UNSET so getEducationAccessInfo resolves it
// itself through the SAME tx (see file header for why).
// ensureGlobalDBPool sets SUPABASE_DB_URL (if unset) so config.GetDB()'s
// process-wide sync.Once succeeds instead of panicking. validateTx(c) always
// probes config.GetDB() for connectivity as a precondition BEFORE falling
// back to the per-request tx stashed via config.Tx(c) — so even though
// every query these tests care about goes through OUR stashed jetro_app tx
// (never this global pool), config.GetDB() still has to succeed once.
// Points at the SAME local Postgres superuser connection this app's own
// config.GetDB() uses in production (apps/backend-go/.env: `postgres:
// postgres@...`) — i.e. this mirrors, not weakens, the real prod role
// split (global pool = postgres superuser; per-request tx = jetro_app,
// RLS-enforced). Never used to run any query this test's assertions rely
// on.
func ensureGlobalDBPool(t *testing.T) {
	t.Helper()
	if os.Getenv("SUPABASE_DB_URL") != "" {
		return
	}
	dsn := os.Getenv("INTEGRATION_TEST_SUPERUSER_DSN")
	if dsn == "" {
		dsn = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"
	}
	t.Setenv("SUPABASE_DB_URL", dsn)
}

func newQuizTestContext(t *testing.T, db *sql.DB, method, path, churchID, userID string, body []byte) (echo.Context, *httptest.ResponseRecorder, *sql.Tx) {
	t.Helper()
	ensureGlobalDBPool(t)
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin test tx: %v", err)
	}
	setTenantContext(t, tx, churchID)
	c, rec := newQuizContextOn(tx, method, path, churchID, userID, body)
	return c, rec, tx
}

// newQuizTestContextOnTx builds a context on an ALREADY-OPEN tx (no new
// Begin/setTenantContext) — needed whenever a test must chain multiple
// handler calls (e.g. StartAttempt then SubmitAttempt on the SAME attempt)
// and see each call's own uncommitted writes.
func newQuizTestContextOnTx(tx *sql.Tx, method, path, churchID, userID string) (echo.Context, *httptest.ResponseRecorder, *sql.Tx) {
	c, rec := newQuizContextOn(tx, method, path, churchID, userID, nil)
	return c, rec, tx
}

func newQuizContextOn(tx *sql.Tx, method, path, churchID, userID string, body []byte) (echo.Context, *httptest.ResponseRecorder) {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	rec := httptest.NewRecorder()
	e := echo.New()
	c := e.NewContext(req, rec)
	c.Set(config.TxKey(), tx)
	c.Set("user_id", userID)
	c.Set("church_id", churchID)
	c.Set("db_role", "member")
	return c, rec
}

// setJSONBody re-creates the context's request with a JSON body — used
// when a test needs a PUT/POST body on a context built via
// newQuizTestContextOnTx (which has no body parameter).
func setJSONBody(t *testing.T, c echo.Context, v interface{}) {
	t.Helper()
	raw := mustJSON(t, v)
	req := c.Request()
	req.Body = http.NoBody
	newReq := httptest.NewRequest(req.Method, req.URL.String(), bytes.NewReader(raw))
	newReq.Header.Set("Content-Type", "application/json")
	for name, vals := range req.Header {
		for _, v := range vals {
			newReq.Header.Add(name, v)
		}
	}
	c.SetRequest(newReq)
}

func mustJSON(t *testing.T, v interface{}) []byte {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal JSON body: %v", err)
	}
	return raw
}

func jsonUnmarshalBody(t *testing.T, rec *httptest.ResponseRecorder, v interface{}) error {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("response is not valid JSON: %v\nbody: %s", err, rec.Body.String())
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// TestQuizRunnerResponseHasNoAnswerKey
//
// Starts a REAL attempt (h.StartAttempt) against a REAL seeded quiz as the
// level-1 student, then asserts the raw JSON response bytes contain NONE of
// is_correct / feedback_ok / feedback_bad, and none of the actual seeded
// feedback text. This is a byte-level assertion on the wire response, not a
// struct-field assertion — it would catch a leak even if introduced via
// map[string]interface{} or a stray Printf/Marshal bypassing the typed
// QuizRunnerView entirely.
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizRunnerResponseHasNoAnswerKey(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	fx := mustSeedQuizLeakFixture(t, seedDB)

	h := NewEducationHandler()
	c, rec, tx := newQuizTestContext(t, db, http.MethodPost,
		"/education/me/lessons/"+fx.lessonID+"/quiz/attempts", fx.churchID, fx.studentID, nil)
	defer tx.Rollback() //nolint:errcheck
	c.SetParamNames("id")
	c.SetParamValues(fx.lessonID)

	if err := h.StartAttempt(c); err != nil {
		t.Fatalf("StartAttempt returned error: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("StartAttempt: expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	raw := rec.Body.Bytes()
	forbiddenBytes := [][]byte{
		[]byte("is_correct"),
		[]byte("feedback_ok"),
		[]byte("feedback_bad"),
		[]byte(fx.feedbackOK),
		[]byte(fx.feedbackBad),
	}
	for _, needle := range forbiddenBytes {
		if bytes.Contains(raw, needle) {
			t.Errorf("answer-leak boundary violated: StartAttempt response contains forbidden bytes %q\nfull body: %s",
				needle, raw)
		}
	}

	// Positive control: prove this isn't a false pass from an empty/broken
	// response — the response MUST actually contain the question+options.
	var view struct {
		Questions []struct {
			ID      string `json:"id"`
			Options []struct {
				ID   string `json:"id"`
				Text string `json:"text"`
			} `json:"options"`
		} `json:"questions"`
	}
	if err := json.Unmarshal(raw, &view); err != nil {
		t.Fatalf("response is not valid JSON matching the expected runner shape: %v\nbody: %s", err, raw)
	}
	if len(view.Questions) != 1 {
		t.Fatalf("test fixture invariant broken: expected exactly 1 question in the response, got %d — "+
			"cannot trust the leak assertion above against an empty/wrong response", len(view.Questions))
	}
	if len(view.Questions[0].Options) != 2 {
		t.Fatalf("test fixture invariant broken: expected exactly 2 options in the response, got %d",
			len(view.Questions[0].Options))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TestQuizAuthorRouteForbiddenForStudent
//
// A level-1 (student) caller invoking GetQuizAuthor (the author-only quiz
// read) must be refused. Negative control: the SAME call, with the SAME
// fixture, as a level-3 caller instead, must succeed (200) and must contain
// the answer key — proving the level-1 rejection is a real authorization
// decision (not, e.g., the lesson/quiz simply not existing, which would
// 404 regardless of caller level and prove nothing about the level check).
// ─────────────────────────────────────────────────────────────────────────────
func TestQuizAuthorRouteForbiddenForStudent(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	fx := mustSeedQuizLeakFixture(t, seedDB)

	// Seed a level-3 author in the same church for the negative control.
	var authorID string
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("author setup tx: %v", err)
	}
	err = setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-quiz-leak-author', 'Edu', 'QuizLeakAuthor', '000', 'n/a', 'edu-quiz-leak-author@example.test', 'member', $1)
		 RETURNING id`,
		fx.churchID,
	).Scan(&authorID)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed author: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.module_user_roles (church_id, user_id, module_key, role_level)
		 VALUES ($1, $2, 'education', 3)
		 ON CONFLICT (church_id, user_id, module_key) DO UPDATE SET role_level = 3`,
		fx.churchID, authorID,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed author module role: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("author seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.module_user_roles WHERE user_id = $1`, authorID)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id = $1`, authorID)
	})

	h := NewEducationHandler()

	// ── The actual boundary: level 1 → 403 ──
	c, rec, tx := newQuizTestContext(t, db, http.MethodGet,
		"/education/lessons/"+fx.lessonID+"/quiz", fx.churchID, fx.studentID, nil)
	c.SetParamNames("id")
	c.SetParamValues(fx.lessonID)
	if err := h.GetQuizAuthor(c); err != nil {
		t.Fatalf("GetQuizAuthor (student) returned Go error: %v", err)
	}
	tx.Rollback() //nolint:errcheck
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for a level-1 caller on the author-only quiz route, got %d: %s",
			rec.Code, rec.Body.String())
	}

	// ── Negative control: level 3 → 200, and the answer key IS present for
	// the legitimate author (proves the 403 above is a real level check,
	// not e.g. a 404 from a broken fixture that would "pass" regardless of
	// caller level). ──
	c2, rec2, tx2 := newQuizTestContext(t, db, http.MethodGet,
		"/education/lessons/"+fx.lessonID+"/quiz", fx.churchID, authorID, nil)
	defer tx2.Rollback() //nolint:errcheck
	c2.SetParamNames("id")
	c2.SetParamValues(fx.lessonID)
	if err := h.GetQuizAuthor(c2); err != nil {
		t.Fatalf("GetQuizAuthor (author) returned Go error: %v", err)
	}
	if rec2.Code != http.StatusOK {
		t.Fatalf("negative control failed: expected 200 for the level-3 author, got %d: %s — "+
			"if this fails, the 403 above proves nothing about the level check",
			rec2.Code, rec2.Body.String())
	}
	if !bytes.Contains(rec2.Body.Bytes(), []byte("is_correct")) {
		t.Fatalf("negative control failed: author response unexpectedly missing the answer key entirely — "+
			"fixture/handler broken in a way that would make the 403 above meaningless: %s", rec2.Body.String())
	}
}
