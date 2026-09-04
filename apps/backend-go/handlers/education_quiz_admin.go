package handlers

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ ADMIN (PR-F, education-quiz-authoring) — the author-facing, level >= 3
// half of the answer-leak boundary. This is the ONLY file whose response
// bodies ever carry an answer key (models.QuizAuthorView family). Guarded
// by BOTH the route-level middleware.RequireModuleLevel(ModuleEducation, 3)
// (routes/education.go) AND an in-handler check via getEducationAccessInfo
// (defense in depth — see education_quiz_leak_test.go's header comment for
// why the in-handler check is the one this PR's tests exercise directly).
//
// Route count note: only 2 of the 6 functions below are directly routed
// (GetQuizAuthor, UpsertQuiz) — matches design's exact 9-route budget for
// this PR. CreateQuestion/UpdateQuestion/DeleteQuestion/UpsertOptions are
// internal reconciliation helpers UpsertQuiz calls in one transaction: the
// author submits the FULL quiz tree (settings + questions + options) in one
// PUT, and this file diffs it against the DB — mirroring SetLessonOrder's
// existing bulk-operation pattern (education_catalog.go) rather than
// exposing per-question/per-option CRUD as separate HTTP routes.
// ─────────────────────────────────────────────────────────────────────────────

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"backend-sion/config"
	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

var validQuizQuestionTypes = map[string]bool{"multiple": true, "true_false": true, "short": true}

// loadQuizAuthorView builds the full author-side tree for a lesson's quiz.
// Returns ok=false when no quiz exists yet for that lesson (404).
func loadQuizAuthorView(q config.Querier, churchID, lessonID string) (view models.QuizAuthorView, ok bool, err error) {
	var timeLimitMinutes sql.NullInt64
	err = q.QueryRow(`
		SELECT q.id, q.lesson_id::text, q.pass_score, q.time_limit_minutes,
		       q.shuffle_options, q.allow_retry, q.show_result
		FROM education_quizzes q WHERE q.lesson_id = $1 AND q.church_id = $2
	`, lessonID, churchID).Scan(&view.ID, &view.LessonID, &view.PassScore, &timeLimitMinutes,
		&view.ShuffleOptions, &view.AllowRetry, &view.ShowResult)
	if err == sql.ErrNoRows {
		return models.QuizAuthorView{}, false, nil
	}
	if err != nil {
		return models.QuizAuthorView{}, false, err
	}
	if timeLimitMinutes.Valid {
		v := int(timeLimitMinutes.Int64)
		view.TimeLimitMinutes = &v
	}

	qRows, err := q.Query(`
		SELECT qq.id, qq.order_index, qq.type, qq.prompt, qq.points,
		       qq.feedback_ok, qq.feedback_bad,
		       (SELECT COUNT(*) FROM education_quiz_answers a WHERE a.question_id = qq.id) AS answer_count
		FROM education_quiz_questions qq
		WHERE qq.quiz_id = $1 AND qq.church_id = $2 ORDER BY qq.order_index ASC
	`, view.ID, churchID)
	if err != nil {
		return models.QuizAuthorView{}, false, err
	}
	defer qRows.Close()

	view.Questions = []models.QuizAuthorQuestion{}
	questionByID := map[string]int{}
	for qRows.Next() {
		var question models.QuizAuthorQuestion
		var feedbackOK, feedbackBad sql.NullString
		if err := qRows.Scan(&question.ID, &question.OrderIndex, &question.Type, &question.Prompt,
			&question.Points, &feedbackOK, &feedbackBad, &question.AnswerCount); err != nil {
			return models.QuizAuthorView{}, false, err
		}
		if feedbackOK.Valid {
			question.FeedbackOk = &feedbackOK.String
		}
		if feedbackBad.Valid {
			question.FeedbackBad = &feedbackBad.String
		}
		question.Options = []models.QuizAuthorOption{}
		questionByID[question.ID] = len(view.Questions)
		view.Questions = append(view.Questions, question)
	}
	if err := qRows.Err(); err != nil {
		return models.QuizAuthorView{}, false, err
	}

	oRows, err := q.Query(`
		SELECT o.id, o.question_id, o.order_index, o.text, o.is_correct
		FROM education_quiz_options o
		JOIN education_quiz_questions qq ON qq.id = o.question_id
		WHERE qq.quiz_id = $1 AND o.church_id = $2 ORDER BY o.question_id, o.order_index ASC
	`, view.ID, churchID)
	if err != nil {
		return models.QuizAuthorView{}, false, err
	}
	defer oRows.Close()
	for oRows.Next() {
		var opt models.QuizAuthorOption
		var questionID string
		if err := oRows.Scan(&opt.ID, &questionID, &opt.OrderIndex, &opt.Text, &opt.IsCorrect); err != nil {
			return models.QuizAuthorView{}, false, err
		}
		if idx, found := questionByID[questionID]; found {
			view.Questions[idx].Options = append(view.Questions[idx].Options, opt)
		}
	}
	if err := oRows.Err(); err != nil {
		return models.QuizAuthorView{}, false, err
	}

	return view, true, nil
}

// GetQuizAuthor returns the full answer-key-carrying quiz tree for one
// lesson. Author-only (level >= 3) — see file header for the double gate.
func (h *EducationHandler) GetQuizAuthor(c echo.Context) error {
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
	if info.level < educationAuthorLevel {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "Esta acción requiere nivel de autor en Educación"})
	}

	lessonID := c.Param("id")
	var lessonExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND church_id = $2)`,
		lessonID, churchID).Scan(&lessonExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	view, ok, err := loadQuizAuthorView(q, churchID, lessonID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener quiz"})
	}
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Esta lección todavía no tiene quiz"})
	}
	return c.JSON(http.StatusOK, view)
}

// quizUpsertOption / quizUpsertQuestion / quizUpsertRequest are UpsertQuiz's
// request DTOs — an ID of "" means "new", matching UpdateStep's established
// create-or-update-in-one-payload convention.
type quizUpsertOption struct {
	ID         string `json:"id"`
	OrderIndex int    `json:"order_index"`
	Text       string `json:"text"`
	IsCorrect  bool   `json:"is_correct"`
}

type quizUpsertQuestion struct {
	ID          string             `json:"id"`
	OrderIndex  int                `json:"order_index"`
	Type        string             `json:"type"`
	Prompt      string             `json:"prompt"`
	Points      int                `json:"points"`
	FeedbackOk  *string            `json:"feedback_ok"`
	FeedbackBad *string            `json:"feedback_bad"`
	Options     []quizUpsertOption `json:"options"`
}

type quizUpsertRequest struct {
	PassScore        int                  `json:"pass_score"`
	TimeLimitMinutes *int                 `json:"time_limit_minutes"`
	ShuffleOptions   bool                 `json:"shuffle_options"`
	AllowRetry       bool                 `json:"allow_retry"`
	ShowResult       bool                 `json:"show_result"`
	Force            bool                 `json:"force"`
	Questions        []quizUpsertQuestion `json:"questions"`
}

// UpsertQuiz reconciles the FULL quiz tree (settings + questions + options)
// in one transaction. Author-only (level >= 3).
func (h *EducationHandler) UpsertQuiz(c echo.Context) error {
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
	if info.level < educationAuthorLevel {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "Esta acción requiere nivel de autor en Educación"})
	}

	lessonID := c.Param("id")
	var lessonExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND church_id = $2)`,
		lessonID, churchID).Scan(&lessonExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	var req quizUpsertRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.PassScore < 0 || req.PassScore > 100 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "pass_score debe estar entre 0 y 100"})
	}
	if req.TimeLimitMinutes != nil && *req.TimeLimitMinutes <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "time_limit_minutes debe ser mayor a 0"})
	}
	for i, question := range req.Questions {
		if !validQuizQuestionTypes[question.Type] {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: type inválido", i)})
		}
		if strings.TrimSpace(question.Prompt) == "" {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: prompt es requerido", i)})
		}
		if question.Points <= 0 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: points debe ser mayor a 0", i)})
		}
		if question.Type == "short" {
			if len(question.Options) > 0 {
				return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: las preguntas de tipo short no llevan opciones", i)})
			}
			continue
		}
		if len(question.Options) < 2 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: se requieren al menos 2 opciones", i)})
		}
		correctCount := 0
		for _, o := range question.Options {
			if strings.TrimSpace(o.Text) == "" {
				return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: el texto de cada opción es requerido", i)})
			}
			if o.IsCorrect {
				correctCount++
			}
		}
		if correctCount != 1 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("questions[%d]: debe haber exactamente una opción correcta", i)})
		}
	}

	// Upsert the quiz settings row.
	var quizID string
	err = q.QueryRow(`
		INSERT INTO education_quizzes (church_id, lesson_id, pass_score, time_limit_minutes, shuffle_options, allow_retry, show_result)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (lesson_id) DO UPDATE SET
			pass_score = EXCLUDED.pass_score,
			time_limit_minutes = EXCLUDED.time_limit_minutes,
			shuffle_options = EXCLUDED.shuffle_options,
			allow_retry = EXCLUDED.allow_retry,
			show_result = EXCLUDED.show_result,
			updated_at = now()
		RETURNING id
	`, churchID, lessonID, req.PassScore, req.TimeLimitMinutes, req.ShuffleOptions, req.AllowRetry, req.ShowResult).Scan(&quizID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar configuración de quiz"})
	}

	// Determine which existing questions are absent from the payload — those
	// are deletions, guarded by DeleteQuestion's answer-count check.
	existingRows, err := q.Query(`SELECT id FROM education_quiz_questions WHERE quiz_id = $1 AND church_id = $2`, quizID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer preguntas existentes"})
	}
	existingIDs := map[string]bool{}
	for existingRows.Next() {
		var id string
		if err := existingRows.Scan(&id); err == nil {
			existingIDs[id] = true
		}
	}
	existingRows.Close()

	keepIDs := map[string]bool{}
	for _, question := range req.Questions {
		if question.ID != "" {
			keepIDs[question.ID] = true
		}
	}
	for id := range existingIDs {
		if !keepIDs[id] {
			if err := DeleteQuestion(q, churchID, id, req.Force); err != nil {
				return c.JSON(http.StatusConflict, map[string]string{"error": err.Error()})
			}
		}
	}

	for i, question := range req.Questions {
		orderIndex := question.OrderIndex
		if orderIndex <= 0 {
			orderIndex = i + 1
		}
		var questionID string
		if question.ID == "" {
			questionID, err = CreateQuestion(q, churchID, quizID, orderIndex, question.Type, question.Prompt, question.Points, question.FeedbackOk, question.FeedbackBad)
		} else {
			questionID = question.ID
			err = UpdateQuestion(q, churchID, questionID, orderIndex, question.Type, question.Prompt, question.Points, question.FeedbackOk, question.FeedbackBad)
		}
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("Error al guardar pregunta %d: %s", i+1, err.Error())})
		}
		if question.Type != "short" {
			if err := UpsertOptions(q, churchID, questionID, question.Options); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("Error al guardar opciones de la pregunta %d: %s", i+1, err.Error())})
			}
		}
	}

	view, ok, err := loadQuizAuthorView(q, churchID, lessonID)
	if err != nil || !ok {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al recargar quiz"})
	}
	return c.JSON(http.StatusOK, view)
}

// CreateQuestion inserts a new question row. Internal helper (config.Querier,
// not echo.Context) — called only from UpsertQuiz's reconciliation loop.
func CreateQuestion(q config.Querier, churchID, quizID string, orderIndex int, qType, prompt string, points int, feedbackOK, feedbackBad *string) (string, error) {
	var id string
	err := q.QueryRow(`
		INSERT INTO education_quiz_questions (church_id, quiz_id, order_index, type, prompt, points, feedback_ok, feedback_bad)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, churchID, quizID, orderIndex, qType, prompt, points, feedbackOK, feedbackBad).Scan(&id)
	return id, err
}

// UpdateQuestion updates an existing question row in place.
func UpdateQuestion(q config.Querier, churchID, questionID string, orderIndex int, qType, prompt string, points int, feedbackOK, feedbackBad *string) error {
	res, err := q.Exec(`
		UPDATE education_quiz_questions
		SET order_index = $2, type = $3, prompt = $4, points = $5, feedback_ok = $6, feedback_bad = $7, updated_at = now()
		WHERE id = $1 AND church_id = $8
	`, questionID, orderIndex, qType, prompt, points, feedbackOK, feedbackBad, churchID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("pregunta %s no encontrada", questionID)
	}
	return nil
}

// DeleteQuestion refuses to delete a question that already has student
// answers UNLESS force=true — the refusal message names the actual answer
// count (F.6's explicit requirement). Cascades to options/answers via their
// own ON DELETE CASCADE once allowed to proceed.
func DeleteQuestion(q config.Querier, churchID, questionID string, force bool) error {
	var answerCount int
	if err := q.QueryRow(`SELECT COUNT(*) FROM education_quiz_answers WHERE question_id = $1 AND church_id = $2`,
		questionID, churchID).Scan(&answerCount); err != nil {
		return fmt.Errorf("error al verificar respuestas existentes: %w", err)
	}
	if answerCount > 0 && !force {
		return fmt.Errorf("esta pregunta ya tiene %d respuesta(s) de alumnos — usá force=true para eliminarla de todos modos", answerCount)
	}
	if _, err := q.Exec(`DELETE FROM education_quiz_questions WHERE id = $1 AND church_id = $2`, questionID, churchID); err != nil {
		return fmt.Errorf("error al eliminar pregunta: %w", err)
	}
	return nil
}

// UpsertOptions replaces a question's option set. Marking one option
// correct unmarks any previously-correct sibling in the SAME write: step 1
// clears is_correct on every existing row for the question, step 2 sets
// exactly one true from the incoming payload — so
// uq_education_quiz_options_correct (the partial unique index, F.1) is
// never violated mid-transaction, backing this same invariant at the DB
// level, not just in application code.
func UpsertOptions(q config.Querier, churchID, questionID string, options []quizUpsertOption) error {
	if _, err := q.Exec(`UPDATE education_quiz_options SET is_correct = false, updated_at = now() WHERE question_id = $1 AND church_id = $2`,
		questionID, churchID); err != nil {
		return fmt.Errorf("error al limpiar opciones existentes: %w", err)
	}

	keepIDs := map[string]bool{}
	for i, opt := range options {
		orderIndex := opt.OrderIndex
		if orderIndex <= 0 {
			orderIndex = i + 1
		}
		if opt.ID == "" {
			var newID string
			if err := q.QueryRow(`
				INSERT INTO education_quiz_options (church_id, question_id, order_index, text, is_correct)
				VALUES ($1, $2, $3, $4, $5) RETURNING id
			`, churchID, questionID, orderIndex, opt.Text, opt.IsCorrect).Scan(&newID); err != nil {
				return fmt.Errorf("error al crear opción: %w", err)
			}
			keepIDs[newID] = true
			continue
		}
		res, err := q.Exec(`
			UPDATE education_quiz_options SET order_index = $2, text = $3, is_correct = $4, updated_at = now()
			WHERE id = $1 AND question_id = $5 AND church_id = $6
		`, opt.ID, orderIndex, opt.Text, opt.IsCorrect, questionID, churchID)
		if err != nil {
			return fmt.Errorf("error al actualizar opción: %w", err)
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return fmt.Errorf("opción %s no encontrada en esta pregunta", opt.ID)
		}
		keepIDs[opt.ID] = true
	}

	// Remove any existing option not present in the incoming payload.
	rows, err := q.Query(`SELECT id FROM education_quiz_options WHERE question_id = $1 AND church_id = $2`, questionID, churchID)
	if err != nil {
		return fmt.Errorf("error al leer opciones existentes: %w", err)
	}
	var toDelete []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil && !keepIDs[id] {
			toDelete = append(toDelete, id)
		}
	}
	rows.Close()
	for _, id := range toDelete {
		if _, err := q.Exec(`DELETE FROM education_quiz_options WHERE id = $1 AND church_id = $2`, id, churchID); err != nil {
			return fmt.Errorf("error al eliminar opción obsoleta: %w", err)
		}
	}
	return nil
}
