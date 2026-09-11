package handlers

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ RUNNER (PR-F, education-quiz-runtime) — the student-facing, level >= 1
// half of the answer-leak boundary. Every query in this file is written
// against models.QuizRunnerView/QuizRunnerQuestion/QuizRunnerOption
// (models/education_quiz_runner.go) — a file that structurally cannot
// declare an answer-key field. See education_quiz_leak_test.go for the
// enforcement tests.
//
// Design ref: sdd/education-module/design (obs #504), section 2 "The
// answer-leak boundary, concretely" — the exact SQL column lists below
// follow that section verbatim, including design supersession A5/A6: the
// options query NEVER selects order_index. Display order for an EXISTING
// attempt comes solely from that attempt's own persisted option-order map
// (education_quiz_attempts.option_order); StartAttempt is the one place
// order_index is read at all, purely server-side, to seed that permutation
// — it is never serialized back to the client (QuizRunnerOption has no such
// field, so this would be a compile error even by mistake).
// ─────────────────────────────────────────────────────────────────────────────

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"backend-sion/config"
	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// quizAttemptCeiling is the max attempts a student may have for one quiz
// (design/F.5: allow_retry ? 2 : 1).
func quizAttemptCeiling(allowRetry bool) int {
	if allowRetry {
		return 2
	}
	return 1
}

// quizForLesson resolves the quiz row for a lesson (church-scoped).
// ok=false means "no quiz configured for this lesson" (404).
type quizSettings struct {
	id               string
	timeLimitMinutes *int
	showResult       bool
	allowRetry       bool
	passScore        int
}

func quizForLesson(q config.Querier, churchID, lessonID string) (s quizSettings, ok bool, err error) {
	var tl sql.NullInt64
	err = q.QueryRow(`
		SELECT id, time_limit_minutes, show_result, allow_retry, pass_score
		FROM education_quizzes WHERE lesson_id = $1 AND church_id = $2
	`, lessonID, churchID).Scan(&s.id, &tl, &s.showResult, &s.allowRetry, &s.passScore)
	if err == sql.ErrNoRows {
		return quizSettings{}, false, nil
	}
	if err != nil {
		return quizSettings{}, false, err
	}
	if tl.Valid {
		v := int(tl.Int64)
		s.timeLimitMinutes = &v
	}
	return s, true, nil
}

// quizRunnerOptionRow is the exact projection design part1's runner options
// query specifies: id, question_id, text. No is_correct. No order_index.
type quizRunnerOptionRow struct {
	id         string
	questionID string
	text       string
}

func loadRunnerOptions(q config.Querier, churchID, quizID string) ([]quizRunnerOptionRow, error) {
	rows, err := q.Query(`
		SELECT o.id, o.question_id, o.text
		FROM education_quiz_options o
		JOIN education_quiz_questions qq ON qq.id = o.question_id AND qq.church_id = o.church_id
		WHERE qq.quiz_id = $1 AND o.church_id = $2
	`, quizID, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []quizRunnerOptionRow{}
	for rows.Next() {
		var r quizRunnerOptionRow
		if err := rows.Scan(&r.id, &r.questionID, &r.text); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type quizRunnerQuestionRow struct {
	id         string
	orderIndex int
	qType      string
	prompt     string
	points     int
}

func loadRunnerQuestions(q config.Querier, churchID, quizID string) ([]quizRunnerQuestionRow, error) {
	rows, err := q.Query(`
		SELECT qq.id, qq.order_index, qq.type, qq.prompt, qq.points
		FROM education_quiz_questions qq
		WHERE qq.quiz_id = $1 AND qq.church_id = $2
		ORDER BY qq.order_index ASC
	`, quizID, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []quizRunnerQuestionRow{}
	for rows.Next() {
		var r quizRunnerQuestionRow
		if err := rows.Scan(&r.id, &r.orderIndex, &r.qType, &r.prompt, &r.points); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// buildRunnerQuestions assembles the response shape from the questions/
// options rows plus a per-question option-id order (attempt.option_order,
// or nil for "no attempt yet" — falls back to DB row order, which is fine
// pre-attempt since nothing graded is at stake yet).
func buildRunnerQuestions(questions []quizRunnerQuestionRow, options []quizRunnerOptionRow, optionOrder map[string][]string) []models.QuizRunnerQuestion {
	byQuestion := map[string][]quizRunnerOptionRow{}
	for _, o := range options {
		byQuestion[o.questionID] = append(byQuestion[o.questionID], o)
	}

	out := make([]models.QuizRunnerQuestion, 0, len(questions))
	for _, qr := range questions {
		rows := byQuestion[qr.id]
		var ordered []models.QuizRunnerOption
		if order, ok := optionOrder[qr.id]; ok && len(order) > 0 {
			byID := map[string]quizRunnerOptionRow{}
			for _, r := range rows {
				byID[r.id] = r
			}
			for _, id := range order {
				if r, found := byID[id]; found {
					ordered = append(ordered, models.QuizRunnerOption{ID: r.id, Text: r.text})
				}
			}
		} else {
			for _, r := range rows {
				ordered = append(ordered, models.QuizRunnerOption{ID: r.id, Text: r.text})
			}
		}
		out = append(out, models.QuizRunnerQuestion{
			ID:       qr.id,
			Position: qr.orderIndex,
			Type:     qr.qType,
			Prompt:   qr.prompt,
			Points:   qr.points,
			Options:  ordered,
		})
	}
	return out
}

// GetQuizRunner returns the pre-submit quiz view for the caller's own
// current OPEN (unsubmitted) attempt, if any — or a fresh preview (no
// attempt yet, attempt_id empty) so the frontend can decide whether to
// render "resume" or "start". Level >= 1, self-only by construction (every
// draft/attempt lookup below is scoped to the caller's own user_id).
func (h *EducationHandler) GetQuizRunner(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	lessonID := c.Param("id")
	quiz, ok, err := quizForLesson(q, churchID, lessonID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener quiz"})
	}
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Este lección no tiene quiz"})
	}

	questions, err := loadRunnerQuestions(q, churchID, quiz.id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener preguntas"})
	}
	options, err := loadRunnerOptions(q, churchID, quiz.id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener opciones"})
	}
	maxScore := 0
	for _, qr := range questions {
		maxScore += qr.points
	}

	view := models.QuizRunnerView{
		ID:               quiz.id,
		LessonID:         lessonID,
		TimeLimitMinutes: quiz.timeLimitMinutes,
		ShowResult:       quiz.showResult,
		MaxScore:         maxScore,
	}

	// Resolve the caller's current OPEN attempt, if any.
	var attemptID string
	var attemptNumber int
	var optionOrderRaw []byte
	var startedAt time.Time
	err = q.QueryRow(`
		SELECT id, attempt_number, option_order, started_at
		FROM education_quiz_attempts
		WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NULL
		ORDER BY attempt_number DESC LIMIT 1
	`, quiz.id, churchID, info.userID).Scan(&attemptID, &attemptNumber, &optionOrderRaw, &startedAt)
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intento"})
	}

	var totalAttempts int
	if err := q.QueryRow(`SELECT COUNT(*) FROM education_quiz_attempts WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3`,
		quiz.id, churchID, info.userID).Scan(&totalAttempts); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intentos"})
	}
	ceiling := quizAttemptCeiling(quiz.allowRetry)
	view.AttemptsLeft = ceiling - totalAttempts
	if view.AttemptsLeft < 0 {
		view.AttemptsLeft = 0
	}

	optionOrder := map[string][]string{}
	drafts := map[string]struct {
		selected *string
		text     *string
	}{}
	if attemptID != "" {
		view.AttemptID = attemptID
		view.AttemptNumber = attemptNumber
		if quiz.timeLimitMinutes != nil {
			exp := startedAt.Add(time.Duration(*quiz.timeLimitMinutes) * time.Minute).UTC().Format("2006-01-02T15:04:05Z")
			view.ExpiresAt = &exp
		}
		_ = json.Unmarshal(optionOrderRaw, &optionOrder)

		rows, err := q.Query(`
			SELECT a.question_id, a.selected_option_id::text, a.text_answer
			FROM education_quiz_answers a
			JOIN education_quiz_attempts at ON at.id = a.attempt_id
			WHERE a.attempt_id = $1 AND a.church_id = $2
			  AND at.user_id = $3 AND at.submitted_at IS NULL
		`, attemptID, churchID, info.userID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener respuestas guardadas"})
		}
		defer rows.Close()
		for rows.Next() {
			var qid string
			var sel, txt sql.NullString
			if err := rows.Scan(&qid, &sel, &txt); err != nil {
				continue
			}
			d := drafts[qid]
			if sel.Valid {
				v := sel.String
				d.selected = &v
			}
			if txt.Valid {
				v := txt.String
				d.text = &v
			}
			drafts[qid] = d
		}
	}

	view.Questions = buildRunnerQuestions(questions, options, optionOrder)
	for i := range view.Questions {
		if d, found := drafts[view.Questions[i].ID]; found {
			view.Questions[i].Selected = d.selected
			view.Questions[i].Draft = d.text
		}
	}
	return c.JSON(http.StatusOK, view)
}

// StartAttempt creates a new attempt (or returns the caller's existing OPEN
// one, idempotently) and returns the full pre-submit QuizRunnerView. Level
// >= 1, self-only.
//
// order_index IS read here (identity/shuffle seed only) — the ONE place in
// this file that touches it — but QuizRunnerOption has no field to carry it
// back out, so it cannot leak through this handler's own response even by
// mistake (see models/education_quiz_runner.go's header comment).
func (h *EducationHandler) StartAttempt(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	lessonID := c.Param("id")
	quiz, ok, err := quizForLesson(q, churchID, lessonID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener quiz"})
	}
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Esta lección no tiene quiz"})
	}

	// Idempotent: reuse an existing OPEN attempt instead of creating a
	// duplicate.
	var existingID string
	err = q.QueryRow(`
		SELECT id FROM education_quiz_attempts
		WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NULL
		ORDER BY attempt_number DESC LIMIT 1
	`, quiz.id, churchID, info.userID).Scan(&existingID)
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar intento existente"})
	}
	if existingID != "" {
		return h.respondRunnerView(c, q, churchID, info.userID, lessonID, quiz)
	}

	var totalAttempts int
	if err := q.QueryRow(`SELECT COUNT(*) FROM education_quiz_attempts WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3`,
		quiz.id, churchID, info.userID).Scan(&totalAttempts); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar intentos"})
	}
	ceiling := quizAttemptCeiling(quiz.allowRetry)
	if totalAttempts >= ceiling {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": fmt.Sprintf("No quedan intentos disponibles para este quiz (máximo %d, ya usaste %d)", ceiling, totalAttempts),
		})
	}

	// Resolve the caller's own assignment (if any) — nullable, non-blocking.
	var assignmentID sql.NullString
	_ = q.QueryRow(`
		SELECT ea.id FROM education_assignments ea
		JOIN education_lessons el ON el.curriculum_id = ea.curriculum_id AND el.church_id = ea.church_id
		WHERE el.id = $1 AND ea.church_id = $2 AND ea.assigned_to = $3
	`, lessonID, churchID, info.userID).Scan(&assignmentID)

	// Fetch questions with order_index and their options with order_index —
	// server-side only, to seed the shuffle/identity permutation.
	type optRow struct {
		id         string
		orderIndex int
	}
	rows, err := q.Query(`
		SELECT o.id, o.order_index, o.question_id
		FROM education_quiz_options o
		JOIN education_quiz_questions qq ON qq.id = o.question_id AND qq.church_id = o.church_id
		WHERE qq.quiz_id = $1 AND o.church_id = $2
		ORDER BY qq.order_index ASC, o.order_index ASC
	`, quiz.id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener opciones"})
	}
	byQuestion := map[string][]optRow{}
	var questionOrder []string
	seenQ := map[string]bool{}
	for rows.Next() {
		var id, questionID string
		var oi int
		if err := rows.Scan(&id, &oi, &questionID); err != nil {
			rows.Close()
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer opciones"})
		}
		byQuestion[questionID] = append(byQuestion[questionID], optRow{id: id, orderIndex: oi})
		if !seenQ[questionID] {
			seenQ[questionID] = true
			questionOrder = append(questionOrder, questionID)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer opciones"})
	}

	var shuffle bool
	if err := q.QueryRow(`SELECT shuffle_options FROM education_quizzes WHERE id = $1 AND church_id = $2`,
		quiz.id, churchID).Scan(&shuffle); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer configuración de quiz"})
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	optionOrder := map[string][]string{}
	for _, questionID := range questionOrder {
		opts := append([]optRow(nil), byQuestion[questionID]...)
		if shuffle {
			rng.Shuffle(len(opts), func(i, j int) { opts[i], opts[j] = opts[j], opts[i] })
		}
		ids := make([]string, len(opts))
		for i, o := range opts {
			ids[i] = o.id
		}
		optionOrder[questionID] = ids
	}
	optionOrderJSON, err := json.Marshal(optionOrder)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al construir orden de opciones"})
	}

	var maxScore int
	if err := q.QueryRow(`SELECT COALESCE(SUM(points), 0) FROM education_quiz_questions WHERE quiz_id = $1 AND church_id = $2`,
		quiz.id, churchID).Scan(&maxScore); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al calcular puntaje máximo"})
	}

	var assignmentArg interface{}
	if assignmentID.Valid {
		assignmentArg = assignmentID.String
	}
	var newAttemptID string
	err = q.QueryRow(`
		INSERT INTO education_quiz_attempts
			(church_id, quiz_id, user_id, assignment_id, attempt_number, option_order, max_score)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
		RETURNING id
	`, churchID, quiz.id, info.userID, assignmentArg, totalAttempts+1, string(optionOrderJSON), maxScore).Scan(&newAttemptID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear intento"})
	}

	return h.respondRunnerView(c, q, churchID, info.userID, lessonID, quiz)
}

// respondRunnerView re-loads and serializes the caller's current runner
// view (used by both the "reuse existing attempt" and "just created"
// branches of StartAttempt, and returns 201 either way — starting is
// idempotent).
func (h *EducationHandler) respondRunnerView(c echo.Context, q config.Querier, churchID, userID, lessonID string, quiz quizSettings) error {
	questions, err := loadRunnerQuestions(q, churchID, quiz.id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener preguntas"})
	}
	options, err := loadRunnerOptions(q, churchID, quiz.id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener opciones"})
	}
	maxScore := 0
	for _, qr := range questions {
		maxScore += qr.points
	}

	var attemptID string
	var attemptNumber int
	var optionOrderRaw []byte
	var startedAt time.Time
	err = q.QueryRow(`
		SELECT id, attempt_number, option_order, started_at
		FROM education_quiz_attempts
		WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NULL
		ORDER BY attempt_number DESC LIMIT 1
	`, quiz.id, churchID, userID).Scan(&attemptID, &attemptNumber, &optionOrderRaw, &startedAt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intento recién creado"})
	}

	var totalAttempts int
	if err := q.QueryRow(`SELECT COUNT(*) FROM education_quiz_attempts WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3`,
		quiz.id, churchID, userID).Scan(&totalAttempts); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intentos"})
	}
	ceiling := quizAttemptCeiling(quiz.allowRetry)
	attemptsLeft := ceiling - totalAttempts
	if attemptsLeft < 0 {
		attemptsLeft = 0
	}

	optionOrder := map[string][]string{}
	_ = json.Unmarshal(optionOrderRaw, &optionOrder)

	view := models.QuizRunnerView{
		ID:               quiz.id,
		LessonID:         lessonID,
		AttemptID:        attemptID,
		AttemptNumber:    attemptNumber,
		AttemptsLeft:     attemptsLeft,
		TimeLimitMinutes: quiz.timeLimitMinutes,
		ShowResult:       quiz.showResult,
		MaxScore:         maxScore,
		Questions:        buildRunnerQuestions(questions, options, optionOrder),
	}
	if quiz.timeLimitMinutes != nil {
		exp := startedAt.Add(time.Duration(*quiz.timeLimitMinutes) * time.Minute).UTC().Format("2006-01-02T15:04:05Z")
		view.ExpiresAt = &exp
	}
	return c.JSON(http.StatusCreated, view)
}

// SaveAnswer upserts a DRAFT answer pre-submission — the student can change
// their mind before submitting. Guarded to the caller's own OPEN attempt.
func (h *EducationHandler) SaveAnswer(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	attemptID := c.Param("attemptId")
	var req struct {
		QuestionID       string  `json:"question_id"`
		SelectedOptionID *string `json:"selected_option_id"`
		TextAnswer       *string `json:"text_answer"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.QuestionID) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "question_id es requerido"})
	}
	if (req.SelectedOptionID == nil) == (req.TextAnswer == nil) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Enviá exactamente uno de selected_option_id o text_answer"})
	}

	var owns bool
	if err := q.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM education_quiz_attempts
			WHERE id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NULL)
	`, attemptID, churchID, info.userID).Scan(&owns); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar intento"})
	}
	if !owns {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Intento no encontrado o ya enviado"})
	}

	var questionBelongs bool
	if err := q.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM education_quiz_questions qq
			JOIN education_quiz_attempts at ON at.quiz_id = qq.quiz_id AND at.church_id = qq.church_id
			WHERE qq.id = $1 AND at.id = $2 AND qq.church_id = $3
		)`, req.QuestionID, attemptID, churchID).Scan(&questionBelongs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar pregunta"})
	}
	if !questionBelongs {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Pregunta no encontrada en este quiz"})
	}

	if req.SelectedOptionID != nil {
		var optionBelongs bool
		if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_quiz_options WHERE id = $1 AND question_id = $2 AND church_id = $3)`,
			*req.SelectedOptionID, req.QuestionID, churchID).Scan(&optionBelongs); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar opción"})
		}
		if !optionBelongs {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "La opción no pertenece a esta pregunta"})
		}
	}

	if _, err := q.Exec(`
		INSERT INTO education_quiz_answers (church_id, attempt_id, question_id, selected_option_id, text_answer)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (attempt_id, question_id) DO UPDATE SET
			selected_option_id = EXCLUDED.selected_option_id,
			text_answer = EXCLUDED.text_answer,
			updated_at = now()
	`, churchID, attemptID, req.QuestionID, req.SelectedOptionID, req.TextAnswer); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar respuesta"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Respuesta guardada"})
}

// SubmitAttempt grades server-side — the ONLY code path that computes
// `passed`. Auto-grades multiple/true_false questions by comparing the
// selected option's is_correct (read here, server-side only — never
// serialized to any runner-family struct). `short` questions cannot be
// auto-graded: left is_correct=NULL, review_pending=true on the attempt.
func (h *EducationHandler) SubmitAttempt(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	attemptID := c.Param("attemptId")
	var quizID string
	var maxScore int
	err = q.QueryRow(`
		SELECT quiz_id, max_score FROM education_quiz_attempts
		WHERE id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NULL
	`, attemptID, churchID, info.userID).Scan(&quizID, &maxScore)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Intento no encontrado o ya enviado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intento"})
	}

	var passScore int
	if err := q.QueryRow(`SELECT pass_score FROM education_quizzes WHERE id = $1 AND church_id = $2`,
		quizID, churchID).Scan(&passScore); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener configuración de quiz"})
	}

	// Grade every answer server-side. Questions with no submitted answer at
	// all are treated as auto-graded-wrong (0 points) if gradable, or simply
	// absent (no review needed — nothing was submitted to review).
	rows, err := q.Query(`
		SELECT qq.id, qq.type, qq.points, a.id, a.selected_option_id::text, a.text_answer
		FROM education_quiz_questions qq
		LEFT JOIN education_quiz_answers a ON a.question_id = qq.id AND a.attempt_id = $1
		WHERE qq.quiz_id = $2 AND qq.church_id = $3
	`, attemptID, quizID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer preguntas"})
	}
	type gradeRow struct {
		questionID string
		qType      string
		points     int
		answerID   sql.NullString
		selectedID sql.NullString
		textAnswer sql.NullString
	}
	var toGrade []gradeRow
	for rows.Next() {
		var r gradeRow
		if err := rows.Scan(&r.questionID, &r.qType, &r.points, &r.answerID, &r.selectedID, &r.textAnswer); err != nil {
			rows.Close()
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer respuestas"})
		}
		toGrade = append(toGrade, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer respuestas"})
	}

	autoScore := 0
	reviewPending := false
	for _, r := range toGrade {
		if r.qType == "short" {
			reviewPending = true
			// Leave is_correct/awarded_points NULL — nothing to update if no
			// answer row exists yet (ReviewAnswer requires a row to grade).
			continue
		}
		isCorrect := false
		if r.selectedID.Valid {
			if err := q.QueryRow(`SELECT is_correct FROM education_quiz_options WHERE id = $1 AND question_id = $2 AND church_id = $3`,
				r.selectedID.String, r.questionID, churchID).Scan(&isCorrect); err != nil && err != sql.ErrNoRows {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al calificar respuesta"})
			}
		}
		if isCorrect {
			autoScore += r.points
		}
		if r.answerID.Valid {
			awarded := 0
			if isCorrect {
				awarded = r.points
			}
			if _, err := q.Exec(`UPDATE education_quiz_answers SET is_correct = $1, awarded_points = $2, updated_at = now() WHERE id = $3`,
				isCorrect, awarded, r.answerID.String); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar calificación"})
			}
		}
	}

	var passed *bool
	if !reviewPending {
		required := (maxScore*passScore + 99) / 100 // ceil(maxScore * passScore / 100)
		p := autoScore >= required
		passed = &p
	}

	if _, err := q.Exec(`
		UPDATE education_quiz_attempts
		SET submitted_at = now(), auto_score = $2, passed = $3, review_pending = $4, updated_at = now()
		WHERE id = $1
	`, attemptID, autoScore, passed, reviewPending); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al enviar intento"})
	}

	return h.respondAttemptResult(c, q, churchID, info.userID, attemptID)
}

// GetAttemptResult is gated to `user_id = caller AND submitted_at IS NOT
// NULL`. When the quiz's show_result=false, Questions is nil'd out in Go
// before serialization — the server never puts that data on the wire, it
// is not merely omitted client-side.
func (h *EducationHandler) GetAttemptResult(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	attemptID := c.Param("attemptId")
	return h.respondAttemptResult(c, q, churchID, info.userID, attemptID)
}

// respondAttemptResult builds and writes the QuizResultView for one
// attempt, gated `user_id = caller AND submitted_at IS NOT NULL`. Shared by
// SubmitAttempt (its own response) and GetAttemptResult (refresh/resume).
func (h *EducationHandler) respondAttemptResult(c echo.Context, q config.Querier, churchID, userID, attemptID string) error {
	var quizID string
	var attemptNumber, autoScore, maxScore int
	var passed sql.NullBool
	var reviewPending bool
	err := q.QueryRow(`
		SELECT quiz_id, attempt_number, COALESCE(auto_score,0), max_score, passed, review_pending
		FROM education_quiz_attempts
		WHERE id = $1 AND church_id = $2 AND user_id = $3 AND submitted_at IS NOT NULL
	`, attemptID, churchID, userID).Scan(&quizID, &attemptNumber, &autoScore, &maxScore, &passed, &reviewPending)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Resultado no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener resultado"})
	}

	var lessonID string
	var passScore int
	var showResult, allowRetry bool
	if err := q.QueryRow(`SELECT lesson_id::text, pass_score, show_result, allow_retry FROM education_quizzes WHERE id = $1 AND church_id = $2`,
		quizID, churchID).Scan(&lessonID, &passScore, &showResult, &allowRetry); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener configuración de quiz"})
	}

	var totalAttempts int
	if err := q.QueryRow(`SELECT COUNT(*) FROM education_quiz_attempts WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3`,
		quizID, churchID, userID).Scan(&totalAttempts); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intentos"})
	}

	view := models.QuizResultView{
		AttemptID:     attemptID,
		AttemptNumber: attemptNumber,
		AutoScore:     autoScore,
		MaxScore:      maxScore,
		PassScore:     passScore,
		ReviewPending: reviewPending,
		CanRetry:      allowRetry && !reviewPending && totalAttempts < quizAttemptCeiling(allowRetry) && !(passed.Valid && passed.Bool),
	}
	if passed.Valid {
		p := passed.Bool
		view.Passed = &p
	}

	// Next lesson (nullable): the following lesson by order_index within
	// the same curriculum.
	var nextLessonID sql.NullString
	_ = q.QueryRow(`
		SELECT nxt.id::text
		FROM education_lessons cur
		JOIN education_lessons nxt ON nxt.curriculum_id = cur.curriculum_id AND nxt.church_id = cur.church_id
		WHERE cur.id = $1 AND cur.church_id = $2 AND nxt.order_index > cur.order_index
		ORDER BY nxt.order_index ASC LIMIT 1
	`, lessonID, churchID).Scan(&nextLessonID)
	if nextLessonID.Valid {
		view.NextLessonID = &nextLessonID.String
	}

	if !showResult {
		view.Questions = nil
		return c.JSON(http.StatusOK, view)
	}

	rows, err := q.Query(`
		SELECT qq.id, qq.prompt, qq.type, qq.feedback_ok, qq.feedback_bad,
		       a.selected_option_id::text, a.text_answer, a.is_correct
		FROM education_quiz_questions qq
		LEFT JOIN education_quiz_answers a ON a.question_id = qq.id AND a.attempt_id = $1
		WHERE qq.quiz_id = $2 AND qq.church_id = $3
		ORDER BY qq.order_index ASC
	`, attemptID, quizID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener preguntas"})
	}

	// Buffer every row FIRST and close this cursor before running any
	// nested per-question lookup query below — a *sql.Tx holds exactly one
	// physical connection, so starting a second Query/QueryRow while this
	// Rows cursor is still open on the SAME connection corrupts the
	// connection (surfaces as "driver: bad connection" on a LATER,
	// unrelated call — a real bug this exact pattern caused during PR-F
	// development, caught by TestQuizIsolationPassSurvivesUnassignment).
	type resultRow struct {
		qid, prompt, qType                                    string
		feedbackOK, feedbackBad, selectedOptionID, textAnswer sql.NullString
		isCorrect                                             sql.NullBool
	}
	var buffered []resultRow
	for rows.Next() {
		var r resultRow
		if err := rows.Scan(&r.qid, &r.prompt, &r.qType, &r.feedbackOK, &r.feedbackBad, &r.selectedOptionID, &r.textAnswer, &r.isCorrect); err != nil {
			continue
		}
		buffered = append(buffered, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer preguntas"})
	}

	view.Questions = []models.QuizResultQuestion{}
	for _, r := range buffered {
		rq := models.QuizResultQuestion{ID: r.qid, Prompt: r.prompt}
		if r.textAnswer.Valid {
			v := r.textAnswer.String
			rq.YourTextAnswer = &v
		}
		if r.selectedOptionID.Valid {
			var text string
			if err := q.QueryRow(`SELECT text FROM education_quiz_options WHERE id = $1 AND church_id = $2`,
				r.selectedOptionID.String, churchID).Scan(&text); err == nil {
				rq.YourOptionText = &text
			}
		}
		switch {
		case !r.isCorrect.Valid:
			rq.Verdict = "in_review"
		case r.isCorrect.Bool:
			rq.Verdict = "correct"
			if r.feedbackOK.Valid {
				rq.Feedback = &r.feedbackOK.String
			}
		default:
			rq.Verdict = "incorrect"
			if r.feedbackBad.Valid {
				rq.Feedback = &r.feedbackBad.String
			}
			var correctText string
			if err := q.QueryRow(`SELECT text FROM education_quiz_options WHERE question_id = $1 AND church_id = $2 AND is_correct = true`,
				r.qid, churchID).Scan(&correctText); err == nil {
				rq.CorrectText = &correctText
			}
		}
		view.Questions = append(view.Questions, rq)
	}

	return c.JSON(http.StatusOK, view)
}

// QuizPendingReviewItem is one of the CALLER's OWN submitted attempts still
// awaiting manual grading (education_quiz_attempts.review_pending = true).
// PR-G addition: StudentHome's PendingQuizAlert needs a way to know "do I
// have a quiz awaiting review, and does it have a deadline" without any new
// answer-key surface — this struct carries none of the answer-leak-boundary
// fields (no is_correct, no feedback, no correctness of any kind), only the
// SAME review_pending boolean QuizResultView already exposes per-attempt,
// aggregated into a small list. Self-only (WHERE user_id = caller), church-
// scoped, level >= 1 — same access shape as every other handler in this file.
//
// PR-G's own launch prompt frames the whole slice as "frontend-only — no
// backend/schema changes", but ALSO explicitly anticipates and permits this
// exact gap in G.4's own text ("if nothing exists, the smallest addition is
// a new lightweight backend read endpoint"). Confirmed nothing existing
// covers this (GetReviewQueue is level >= 3, church-wide, not self-scoped;
// GetHome/GetMyAssignments carry no quiz-level signal at all) before adding
// this ~65-line, read-only, no-migration, no-schema-change handler+route —
// documented here and in the apply-progress writeup as the one deliberate
// exception to the "frontend-only" framing.
type QuizPendingReviewItem struct {
	AttemptID      string  `json:"attempt_id"`
	LessonID       string  `json:"lesson_id"`
	LessonTitle    string  `json:"lesson_title"`
	CurriculumID   string  `json:"curriculum_id"`
	CurriculumName string  `json:"curriculum_name"`
	DueDate        *string `json:"due_date"`
	SubmittedAt    string  `json:"submitted_at"`
}

// GetMyPendingReviews lists the caller's own submitted-but-not-yet-graded
// short-answer attempts (PR-G, education-manual-review's student-facing
// counterpart to GetReviewQueue). Deliberately NOT the same endpoint as
// GetReviewQueue (level >= 3, every student's pending items, church-wide) —
// this is level >= 1, self-only, and returns at most the caller's own rows.
func (h *EducationHandler) GetMyPendingReviews(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	rows, err := q.Query(`
		SELECT at.id, eq.lesson_id::text, el.title, el.curriculum_id::text, ec.name,
		       to_char(ea.due_date, 'YYYY-MM-DD'),
		       to_char(at.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_quiz_attempts at
		JOIN education_quizzes eq ON eq.id = at.quiz_id AND eq.church_id = at.church_id
		JOIN education_lessons el ON el.id = eq.lesson_id AND el.church_id = at.church_id
		JOIN education_curricula ec ON ec.id = el.curriculum_id AND ec.church_id = at.church_id
		LEFT JOIN education_assignments ea ON ea.id = at.assignment_id AND ea.church_id = at.church_id
		WHERE at.church_id = $1 AND at.user_id = $2 AND at.review_pending = true
		ORDER BY at.submitted_at ASC
	`, churchID, info.userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener quizzes en revisión"})
	}
	defer rows.Close()

	items := []QuizPendingReviewItem{}
	for rows.Next() {
		var item QuizPendingReviewItem
		var dueDate sql.NullString
		if err := rows.Scan(&item.AttemptID, &item.LessonID, &item.LessonTitle, &item.CurriculumID,
			&item.CurriculumName, &dueDate, &item.SubmittedAt); err != nil {
			continue
		}
		if dueDate.Valid {
			item.DueDate = &dueDate.String
		}
		items = append(items, item)
	}
	return c.JSON(http.StatusOK, items)
}

// GetMyLatestAttempt tells the caller whether they already have an attempt
// on this lesson's quiz, and whether it's submitted — the lesson viewer uses
// this to route "last step" straight to the existing result (resuelto or en
// revisión) instead of into StartAttempt, which 409s once the retry ceiling
// is reached and otherwise gives no way back to a past attempt. Level >= 1,
// self-only.
func (h *EducationHandler) GetMyLatestAttempt(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	info, err := getEducationAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	lessonID := c.Param("id")
	quiz, ok, err := quizForLesson(q, churchID, lessonID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener quiz"})
	}
	if !ok {
		return c.JSON(http.StatusOK, map[string]any{"attempt_id": nil, "submitted": false})
	}

	var attemptID string
	var submittedAt sql.NullTime
	err = q.QueryRow(`
		SELECT id, submitted_at FROM education_quiz_attempts
		WHERE quiz_id = $1 AND church_id = $2 AND user_id = $3
		ORDER BY attempt_number DESC LIMIT 1
	`, quiz.id, churchID, info.userID).Scan(&attemptID, &submittedAt)
	if err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener intento"})
	}
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusOK, map[string]any{"attempt_id": nil, "submitted": false})
	}
	return c.JSON(http.StatusOK, map[string]any{"attempt_id": attemptID, "submitted": submittedAt.Valid})
}
