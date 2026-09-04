package handlers

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS + CSV EXPORT (PR-K, education-manual-review / education-
// assignments DELTA) — admin roster with derived status precedence,
// per-lesson funnel, and CSV export. Level >= 3 (author), church-scoped,
// same validateTx/config.Tx(c) pattern as every other EducationHandler
// method. K.4's review queue/grading UI consumes the ALREADY-LIVE PR-F
// endpoints (GetReviewQueue/ReviewAnswer in education_quiz_review.go) — no
// new review-specific route lives here.
//
// Roster status precedence (design: sdd/education-module/tasks-v2-part2,
// PR-K section — the orchestrator-authored derivation rule, since
// `in_review`/`inactive` have never been computed anywhere in this backend
// before): completed > in_review > overdue > inactive > in_progress >
// pending. Computed in Go (deriveRosterStatus) from plain columns/booleans
// the roster query already selects — see that function's own comment for
// why this isn't folded into one SQL CASE like deriveAssignmentStatusSQL.
// ─────────────────────────────────────────────────────────────────────────────

const educationInactivityThresholdDays = 14

// rosterQuerySQL is shared by GetStudentRoster and ExportRosterCSV so the
// two endpoints can never drift on what "the roster" means. Per-row
// subqueries (rather than extra JOINs) mirror the existing answer_count
// pattern in GetQuizAuthor (education_quiz_admin.go) — class sizes are
// small, and this keeps each derived value legible in isolation.
const rosterQuerySQL = `
	SELECT
		ea.id, ea.assigned_to::text,
		TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
		u.email,
		to_char(ea.due_date, 'YYYY-MM-DD') AS due_date,
		ea.completed_at,
		ea.created_at,
		(SELECT COUNT(*) FROM education_lesson_progress elp
		  WHERE elp.assignment_id = ea.id AND elp.completed_at IS NOT NULL) AS completed_lessons,
		(SELECT COUNT(*) FROM education_lessons el WHERE el.curriculum_id = ea.curriculum_id) AS total_lessons,
		(SELECT COUNT(*) FROM education_lesson_progress elp2
		  WHERE elp2.assignment_id = ea.id) AS any_progress_count,
		(SELECT MAX(elp3.updated_at) FROM education_lesson_progress elp3
		  WHERE elp3.assignment_id = ea.id) AS last_activity,
		(ea.due_date IS NOT NULL AND ea.due_date < CURRENT_DATE) AS is_overdue,
		EXISTS (
			SELECT 1 FROM education_quiz_attempts qa
			JOIN education_quizzes eq ON eq.id = qa.quiz_id AND eq.church_id = ea.church_id
			JOIN education_lessons qel ON qel.id = eq.lesson_id AND qel.church_id = ea.church_id
			WHERE qa.user_id = ea.assigned_to AND qa.church_id = ea.church_id
			  AND qel.curriculum_id = ea.curriculum_id AND qa.review_pending = true
		) AS in_review,
		(SELECT qa2.auto_score FROM education_quiz_attempts qa2
		  JOIN education_quizzes eq2 ON eq2.id = qa2.quiz_id AND eq2.church_id = ea.church_id
		  JOIN education_lessons qel2 ON qel2.id = eq2.lesson_id AND qel2.church_id = ea.church_id
		  WHERE qa2.user_id = ea.assigned_to AND qa2.church_id = ea.church_id
		    AND qel2.curriculum_id = ea.curriculum_id AND qa2.submitted_at IS NOT NULL
		  ORDER BY qa2.submitted_at DESC LIMIT 1) AS last_quiz_score,
		(SELECT qa3.max_score FROM education_quiz_attempts qa3
		  JOIN education_quizzes eq3 ON eq3.id = qa3.quiz_id AND eq3.church_id = ea.church_id
		  JOIN education_lessons qel3 ON qel3.id = eq3.lesson_id AND qel3.church_id = ea.church_id
		  WHERE qa3.user_id = ea.assigned_to AND qa3.church_id = ea.church_id
		    AND qel3.curriculum_id = ea.curriculum_id AND qa3.submitted_at IS NOT NULL
		  ORDER BY qa3.submitted_at DESC LIMIT 1) AS last_quiz_max,
		(SELECT qa4.passed FROM education_quiz_attempts qa4
		  JOIN education_quizzes eq4 ON eq4.id = qa4.quiz_id AND eq4.church_id = ea.church_id
		  JOIN education_lessons qel4 ON qel4.id = eq4.lesson_id AND qel4.church_id = ea.church_id
		  WHERE qa4.user_id = ea.assigned_to AND qa4.church_id = ea.church_id
		    AND qel4.curriculum_id = ea.curriculum_id AND qa4.submitted_at IS NOT NULL
		  ORDER BY qa4.submitted_at DESC LIMIT 1) AS last_quiz_passed,
		(SELECT qa5.review_pending FROM education_quiz_attempts qa5
		  JOIN education_quizzes eq5 ON eq5.id = qa5.quiz_id AND eq5.church_id = ea.church_id
		  JOIN education_lessons qel5 ON qel5.id = eq5.lesson_id AND qel5.church_id = ea.church_id
		  WHERE qa5.user_id = ea.assigned_to AND qa5.church_id = ea.church_id
		    AND qel5.curriculum_id = ea.curriculum_id AND qa5.submitted_at IS NOT NULL
		  ORDER BY qa5.submitted_at DESC LIMIT 1) AS last_quiz_review_pending
	FROM education_assignments ea
	JOIN users u ON u.id = ea.assigned_to
	WHERE ea.curriculum_id = $1 AND ea.church_id = $2
	ORDER BY name ASC
`

// rosterRow is the scan target for one rosterQuerySQL row.
type rosterRow struct {
	assignmentID          string
	userID                string
	name                  string
	email                 string
	dueDate               sql.NullString
	completedAt           sql.NullTime
	createdAt             sql.NullTime
	completedLessons      int
	totalLessons          int
	anyProgressCount      int
	lastActivity          sql.NullTime
	isOverdue             bool
	inReview              bool
	lastQuizScore         sql.NullInt64
	lastQuizMax           sql.NullInt64
	lastQuizPassed        sql.NullBool
	lastQuizReviewPending sql.NullBool
}

// deriveRosterStatus applies the 6-level precedence order (highest first):
// completed > in_review > overdue > inactive > in_progress > pending.
func deriveRosterStatus(r rosterRow) string {
	switch {
	case r.completedAt.Valid:
		return "completed"
	case r.inReview:
		return "in_review"
	case r.isOverdue:
		return "overdue"
	case isRosterInactive(r):
		return "inactive"
	case r.anyProgressCount > 0 || r.completedLessons > 0:
		return "in_progress"
	default:
		return "pending"
	}
}

// isRosterInactive: MAX(progress.updated_at) across every progress row tied
// to this assignment (or the assignment's own created_at when zero progress
// rows exist yet) is more than 14 days old.
func isRosterInactive(r rosterRow) bool {
	reference := r.createdAt
	if r.lastActivity.Valid {
		reference = r.lastActivity
	}
	if !reference.Valid {
		return false
	}
	return time.Since(reference.Time) > educationInactivityThresholdDays*24*time.Hour
}

func fetchRoster(q interface {
	Query(query string, args ...interface{}) (*sql.Rows, error)
}, curriculumID, churchID string) ([]rosterRow, error) {
	rows, err := q.Query(rosterQuerySQL, curriculumID, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []rosterRow
	for rows.Next() {
		var r rosterRow
		if err := rows.Scan(
			&r.assignmentID, &r.userID, &r.name, &r.email, &r.dueDate, &r.completedAt, &r.createdAt,
			&r.completedLessons, &r.totalLessons, &r.anyProgressCount, &r.lastActivity, &r.isOverdue,
			&r.inReview, &r.lastQuizScore, &r.lastQuizMax, &r.lastQuizPassed, &r.lastQuizReviewPending,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func rosterRowToStudent(r rosterRow) models.RosterStudent {
	s := models.RosterStudent{
		AssignmentID:     r.assignmentID,
		UserID:           r.userID,
		Name:             r.name,
		Email:            r.email,
		Status:           deriveRosterStatus(r),
		CompletedLessons: r.completedLessons,
		TotalLessons:     r.totalLessons,
	}
	if r.totalLessons > 0 {
		s.ProgressPct = float64(r.completedLessons) / float64(r.totalLessons) * 100
	}
	if r.dueDate.Valid {
		s.DueDate = &r.dueDate.String
	}
	if r.lastQuizScore.Valid {
		v := int(r.lastQuizScore.Int64)
		s.LastQuizScore = &v
	}
	if r.lastQuizMax.Valid {
		v := int(r.lastQuizMax.Int64)
		s.LastQuizMax = &v
	}
	switch {
	case r.lastQuizReviewPending.Valid && r.lastQuizReviewPending.Bool:
		v := "in_review"
		s.LastQuizVerdict = &v
	case r.lastQuizPassed.Valid && r.lastQuizPassed.Bool:
		v := "passed"
		s.LastQuizVerdict = &v
	case r.lastQuizPassed.Valid && !r.lastQuizPassed.Bool:
		v := "failed"
		s.LastQuizVerdict = &v
	}
	return s
}

// computeRosterKPIs derives the 4 aggregate cards from the SAME rows the
// roster table renders (design: "avoid a second round trip" and "never a
// separately-derived number that could drift"). active_students is the
// total roster size for this curriculum (mirrors AdminCourseList's existing
// "Alumnos inscritos" KPI convention — total enrolled, not a narrower
// "currently engaging" subset).
func computeRosterKPIs(rows []rosterRow) models.RosterKPIs {
	kpis := models.RosterKPIs{ActiveStudents: len(rows)}
	if len(rows) == 0 {
		return kpis
	}

	var progressSum float64
	progressSamples := 0
	quizPassed, quizGraded := 0, 0
	for _, r := range rows {
		if r.totalLessons > 0 {
			progressSum += float64(r.completedLessons) / float64(r.totalLessons) * 100
			progressSamples++
		}
		if deriveRosterStatus(r) == "inactive" {
			kpis.InactiveCount++
		}
		if r.lastQuizPassed.Valid && !(r.lastQuizReviewPending.Valid && r.lastQuizReviewPending.Bool) {
			quizGraded++
			if r.lastQuizPassed.Bool {
				quizPassed++
			}
		}
	}
	if progressSamples > 0 {
		kpis.AvgProgressPct = progressSum / float64(progressSamples)
	}
	if quizGraded > 0 {
		kpis.QuizPassRate = float64(quizPassed) / float64(quizGraded) * 100
	}
	return kpis
}

// GetStudentRoster returns every assignment for a curriculum with derived
// status + progress + last-quiz-result summary, plus the 4 KPI aggregates
// in the same response. Level >= 3, church-scoped.
func (h *EducationHandler) GetStudentRoster(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	curriculumID := c.Param("id")
	var curriculumName string
	err = q.QueryRow(`SELECT name FROM education_curricula WHERE id = $1 AND church_id = $2`, curriculumID, churchID).Scan(&curriculumName)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}

	rows, err := fetchRoster(q, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener el progreso de alumnos"})
	}

	students := make([]models.RosterStudent, 0, len(rows))
	for _, r := range rows {
		students = append(students, rosterRowToStudent(r))
	}

	return c.JSON(http.StatusOK, models.StudentRosterResponse{
		CurriculumID:   curriculumID,
		CurriculumName: curriculumName,
		Kpis:           computeRosterKPIs(rows),
		Students:       students,
	})
}

// GetLessonFunnel returns per-lesson reached/completed counts, in course
// order — the raw numbers LessonFunnel.tsx's drop-off chart needs. Level >=
// 3, church-scoped.
func (h *EducationHandler) GetLessonFunnel(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	curriculumID := c.Param("id")
	var exists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_curricula WHERE id = $1 AND church_id = $2)`,
		curriculumID, churchID).Scan(&exists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}

	rows, err := q.Query(`
		SELECT el.id, el.title, el.order_index,
		       COUNT(DISTINCT CASE WHEN elp.id IS NOT NULL THEN elp.assignment_id END) AS reached,
		       COUNT(DISTINCT CASE WHEN elp.completed_at IS NOT NULL THEN elp.assignment_id END) AS completed
		FROM education_lessons el
		LEFT JOIN education_lesson_progress elp
		  ON elp.lesson_id = el.id AND elp.church_id = el.church_id
		  AND elp.assignment_id IN (SELECT id FROM education_assignments WHERE curriculum_id = el.curriculum_id AND church_id = el.church_id)
		WHERE el.curriculum_id = $1 AND el.church_id = $2
		GROUP BY el.id, el.title, el.order_index
		ORDER BY el.order_index ASC
	`, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener el embudo de lecciones"})
	}
	defer rows.Close()

	points := []models.LessonFunnelPoint{}
	for rows.Next() {
		var p models.LessonFunnelPoint
		if err := rows.Scan(&p.LessonID, &p.Title, &p.OrderIndex, &p.Reached, &p.Completed); err != nil {
			continue
		}
		points = append(points, p)
	}
	return c.JSON(http.StatusOK, points)
}

// ExportRosterCSV serves the SAME roster data as GetStudentRoster as a CSV
// download — one row per student. Follows the exact Content-Type/
// Content-Disposition/csv.NewWriter precedent established by
// handlers/users_import.go's ExportUsers. Level >= 3, church-scoped.
func (h *EducationHandler) ExportRosterCSV(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	curriculumID := c.Param("id")
	var curriculumName string
	err = q.QueryRow(`SELECT name FROM education_curricula WHERE id = $1 AND church_id = $2`, curriculumID, churchID).Scan(&curriculumName)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}

	rows, err := fetchRoster(q, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener el progreso de alumnos"})
	}

	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="progreso-%s.csv"`, curriculumID))
	c.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(c.Response())
	_ = w.Write([]string{"Nombre", "Correo", "Estado", "Lecciones completadas", "Lecciones totales", "Progreso %", "Fecha límite", "Último puntaje de quiz"})
	for _, r := range rows {
		student := rosterRowToStudent(r)
		due := ""
		if student.DueDate != nil {
			due = *student.DueDate
		}
		quiz := ""
		if student.LastQuizScore != nil && student.LastQuizMax != nil {
			quiz = fmt.Sprintf("%d/%d", *student.LastQuizScore, *student.LastQuizMax)
		}
		_ = w.Write([]string{
			student.Name,
			student.Email,
			student.Status,
			fmt.Sprintf("%d", student.CompletedLessons),
			fmt.Sprintf("%d", student.TotalLessons),
			fmt.Sprintf("%.0f", student.ProgressPct),
			due,
			quiz,
		})
	}
	w.Flush()
	return nil
}
