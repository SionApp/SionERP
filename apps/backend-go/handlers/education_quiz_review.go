package handlers

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MANUAL REVIEW (PR-F, education-manual-review) — grading `short`-type
// answers that cannot be auto-graded. Level >= 3 (author-equivalent), same
// double-gate pattern as education_quiz_admin.go.
//
// GetReviewQueue explicitly EXCLUDES lesson reflections — those live in the
// entirely separate education_lesson_reflections table (PR-B) and are never
// touched by any query in this file, so the exclusion is structural, not a
// filter that could be accidentally loosened.
// ─────────────────────────────────────────────────────────────────────────────

import (
	"database/sql"
	"net/http"

	"backend-sion/config"

	"github.com/labstack/echo/v4"
)

// QuizReviewQueueItem is one pending short-answer response awaiting manual
// grading.
type QuizReviewQueueItem struct {
	AnswerID    string `json:"answer_id"`
	AttemptID   string `json:"attempt_id"`
	QuestionID  string `json:"question_id"`
	Prompt      string `json:"prompt"`
	Points      int    `json:"points"`
	TextAnswer  string `json:"text_answer"`
	StudentName string `json:"student_name"`
	LessonID    string `json:"lesson_id"`
	LessonTitle string `json:"lesson_title"`
	SubmittedAt string `json:"submitted_at"`
}

// GetReviewQueue lists every education_quiz_answers row still awaiting
// manual grading (is_correct IS NULL AND text_answer IS NOT NULL — i.e. a
// submitted `short` answer). Level >= 3, church-scoped.
func (h *EducationHandler) GetReviewQueue(c echo.Context) error {
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

	rows, err := q.Query(`
		SELECT a.id, a.attempt_id, a.question_id, qq.prompt, qq.points, a.text_answer,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS student_name,
		       el.id::text, el.title,
		       to_char(at.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_quiz_answers a
		JOIN education_quiz_questions qq ON qq.id = a.question_id AND qq.church_id = a.church_id
		JOIN education_quiz_attempts at ON at.id = a.attempt_id AND at.church_id = a.church_id
		JOIN education_quizzes eq ON eq.id = at.quiz_id AND eq.church_id = a.church_id
		JOIN education_lessons el ON el.id = eq.lesson_id AND el.church_id = a.church_id
		JOIN users u ON u.id = at.user_id
		WHERE a.church_id = $1 AND a.is_correct IS NULL AND a.text_answer IS NOT NULL
		ORDER BY at.submitted_at ASC
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener cola de revisión"})
	}
	defer rows.Close()

	items := []QuizReviewQueueItem{}
	for rows.Next() {
		var item QuizReviewQueueItem
		if err := rows.Scan(&item.AnswerID, &item.AttemptID, &item.QuestionID, &item.Prompt, &item.Points,
			&item.TextAnswer, &item.StudentName, &item.LessonID, &item.LessonTitle, &item.SubmittedAt); err != nil {
			continue
		}
		items = append(items, item)
	}
	return c.JSON(http.StatusOK, items)
}

// ReviewAnswer grades one short-answer response and recomputes the parent
// attempt's grade in the same transaction. Level >= 3, church-scoped.
func (h *EducationHandler) ReviewAnswer(c echo.Context) error {
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

	answerID := c.Param("answerId")
	var req struct {
		IsCorrect     bool    `json:"is_correct"`
		AwardedPoints int     `json:"awarded_points"`
		ReviewNote    *string `json:"review_note"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.AwardedPoints < 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "awarded_points no puede ser negativo"})
	}

	var attemptID, questionID string
	var maxPoints int
	err = q.QueryRow(`
		SELECT a.attempt_id, a.question_id, qq.points
		FROM education_quiz_answers a
		JOIN education_quiz_questions qq ON qq.id = a.question_id AND qq.church_id = a.church_id
		WHERE a.id = $1 AND a.church_id = $2
	`, answerID, churchID).Scan(&attemptID, &questionID, &maxPoints)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Respuesta no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar respuesta"})
	}
	if req.AwardedPoints > maxPoints {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "awarded_points no puede superar el puntaje de la pregunta"})
	}

	callerID, _ := c.Get("user_id").(string)
	if _, err := q.Exec(`
		UPDATE education_quiz_answers
		SET is_correct = $2, awarded_points = $3, reviewed_by = $4, reviewed_at = now(), review_note = $5, updated_at = now()
		WHERE id = $1
	`, answerID, req.IsCorrect, req.AwardedPoints, callerID, req.ReviewNote); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar calificación"})
	}

	if err := recomputeAttemptGrade(q, churchID, attemptID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al recalcular puntaje del intento"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Respuesta calificada"})
}

// recomputeAttemptGrade finalizes an attempt's score/passed/review_pending
// once a review write lands — same transaction as the caller (no DB
// trigger), mirroring recomputeAssignmentCompletion's existing style in
// education_assignments.go. `passed` and `review_pending=false` are set
// ONLY when zero NULL-graded answers remain on the attempt; otherwise the
// attempt stays review_pending with passed left NULL.
func recomputeAttemptGrade(q config.Querier, churchID, attemptID string) error {
	var pendingCount int
	if err := q.QueryRow(`
		SELECT COUNT(*) FROM education_quiz_answers WHERE attempt_id = $1 AND church_id = $2 AND is_correct IS NULL
	`, attemptID, churchID).Scan(&pendingCount); err != nil {
		return err
	}
	if pendingCount > 0 {
		// Still waiting on other short answers — leave review_pending=true,
		// passed=NULL, but refresh auto_score with whatever is graded so far
		// so a partial view is at least consistent.
		var total int
		if err := q.QueryRow(`
			SELECT COALESCE(SUM(CASE WHEN is_correct THEN qq.points WHEN awarded_points IS NOT NULL THEN awarded_points ELSE 0 END), 0)
			FROM education_quiz_answers a
			JOIN education_quiz_questions qq ON qq.id = a.question_id AND qq.church_id = a.church_id
			WHERE a.attempt_id = $1 AND a.church_id = $2
		`, attemptID, churchID).Scan(&total); err != nil {
			return err
		}
		_, err := q.Exec(`UPDATE education_quiz_attempts SET auto_score = $2, updated_at = now() WHERE id = $1`, attemptID, total)
		return err
	}

	var total, maxScore, passScore int
	if err := q.QueryRow(`
		SELECT COALESCE(SUM(CASE WHEN a.is_correct THEN qq.points WHEN a.awarded_points IS NOT NULL THEN a.awarded_points ELSE 0 END), 0)
		FROM education_quiz_answers a
		JOIN education_quiz_questions qq ON qq.id = a.question_id AND qq.church_id = a.church_id
		WHERE a.attempt_id = $1 AND a.church_id = $2
	`, attemptID, churchID).Scan(&total); err != nil {
		return err
	}
	if err := q.QueryRow(`
		SELECT at.max_score, eq.pass_score
		FROM education_quiz_attempts at
		JOIN education_quizzes eq ON eq.id = at.quiz_id AND eq.church_id = at.church_id
		WHERE at.id = $1 AND at.church_id = $2
	`, attemptID, churchID).Scan(&maxScore, &passScore); err != nil {
		return err
	}
	required := (maxScore*passScore + 99) / 100
	passed := total >= required
	_, err := q.Exec(`
		UPDATE education_quiz_attempts
		SET auto_score = $2, passed = $3, review_pending = false, updated_at = now()
		WHERE id = $1
	`, attemptID, total, passed)
	return err
}
