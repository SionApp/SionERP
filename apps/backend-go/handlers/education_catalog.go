package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG (PR-B, education-catalog) — the backend for PR-D's student-facing
// catalog/course-detail screens. Everything here is level >= 1 (any
// education-module member); only `status = 'published'` curricula are ever
// visible (spec: "Draft invisible", "review is a real stored, filterable
// state" that stays student-invisible exactly like draft).
// ─────────────────────────────────────────────────────────────────────────────

var validEducationTracks = map[string]bool{
	"discipulado": true, "servicio": true, "liderazgo": true, "familia": true, "formacion": true,
}

// GetCatalog lists published curricula, optionally filtered by track,
// sorted by recency (spec: "Catalog filtering and sorting").
func (h *EducationHandler) GetCatalog(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	track := strings.TrimSpace(c.QueryParam("track"))
	if track != "" && !validEducationTracks[track] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "track inválido"})
	}

	query := `
		SELECT ec.id, ec.name, ec.description, ec.track, ec.level, ec.hours,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS teacher_name,
		       ec.cover_path,
		       COUNT(DISTINCT el.id) AS lesson_count,
		       COUNT(DISTINCT ea.id) AS student_count,
		       EXISTS(
		         SELECT 1 FROM education_quizzes eq
		         JOIN education_lessons el2 ON el2.id = eq.lesson_id
		         WHERE el2.curriculum_id = ec.id AND eq.church_id = ec.church_id
		       ) AS has_quiz,
		       to_char(ec.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_curricula ec
		LEFT JOIN users u ON u.id = ec.teacher_user_id
		LEFT JOIN education_lessons el ON el.curriculum_id = ec.id
		LEFT JOIN education_assignments ea ON ea.curriculum_id = ec.id
		WHERE ec.church_id = $1 AND ec.status = 'published'
	`
	args := []interface{}{churchID}
	if track != "" {
		query += ` AND ec.track = $2`
		args = append(args, track)
	}
	query += ` GROUP BY ec.id, u.first_name, u.last_name ORDER BY ec.created_at DESC`

	rows, err := q.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener catálogo"})
	}
	defer rows.Close()

	courses := []models.EducationCatalogCourse{}
	for rows.Next() {
		var course models.EducationCatalogCourse
		var teacherName sql.NullString
		if err := rows.Scan(&course.ID, &course.Name, &course.Description, &course.Track, &course.Level,
			&course.Hours, &teacherName, &course.CoverPath, &course.LessonCount, &course.StudentCount,
			&course.HasQuiz, &course.CreatedAt); err != nil {
			continue
		}
		if teacherName.Valid && strings.TrimSpace(teacherName.String) != "" {
			course.TeacherName = &teacherName.String
		}
		courses = append(courses, course)
	}
	return c.JSON(http.StatusOK, courses)
}

// GetSyllabus returns the course's lessons grouped by module (NULL module_id
// → implicit "General" group), each with a server-computed `state`
// (completed | in_progress | locked | pending) and a `has_quiz` flag.
//
// PR-F wires the real unlock derivation (design decision A8: "Unlock is
// derived in the syllabus query ... Derivation is free at read time and
// correct by definition", replacing PR-B's always-false `locked` stub): a
// lesson is locked only when the caller HAS an assignment (a browsing,
// unenrolled visitor never sees a lock — there is no personal progression
// to gate) AND the immediately-previous lesson in course order is not yet
// unlocked-worthy — i.e. not completed, OR completed but its own quiz (if
// it has one) has not been passed by the caller. The first lesson in the
// course is never locked. This mirrors the "se desbloquea al completar la
// lección anterior" / quiz-pass copy PR-D's row component already ships.
func (h *EducationHandler) GetSyllabus(c echo.Context) error {
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

	curriculumID := c.Param("id")
	var status string
	err = q.QueryRow(`SELECT status FROM education_curricula WHERE id = $1 AND church_id = $2`, curriculumID, churchID).Scan(&status)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}
	if status != "published" && info.level < educationAuthorLevel {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}

	// Own assignment (if any) drives per-lesson state; a browsing,
	// unenrolled student sees every lesson as "pending".
	var assignmentID sql.NullString
	if err := q.QueryRow(`
		SELECT id FROM education_assignments WHERE curriculum_id = $1 AND church_id = $2 AND assigned_to = $3
	`, curriculumID, churchID, info.userID).Scan(&assignmentID); err != nil && err != sql.ErrNoRows {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar inscripción"})
	}

	// The LAG(...) window functions below let one query compute "is the
	// PREVIOUS lesson (in course order) unlock-worthy" without a second
	// round trip. `w` orders identically to the final ORDER BY, so LAG at
	// row N is exactly "row N-1's own value" — design supersession-free,
	// no education_quiz_options.order_index involved (that constraint is
	// specific to the quiz RUNNER's answer-leak boundary, not this query).
	rows, err := q.Query(`
		SELECT el.id, el.order_index, el.title, el.duration_minutes,
		       cm.id::text, cm.title, cm.order_index,
		       (elp.completed_at IS NOT NULL) AS is_completed,
		       (elp.id IS NOT NULL AND elp.completed_at IS NULL) AS is_in_progress,
		       EXISTS(SELECT 1 FROM education_quizzes eq WHERE eq.lesson_id = el.id AND eq.church_id = el.church_id) AS has_quiz,
		       LAG(el.id::text) OVER w AS prev_lesson_id,
		       LAG(elp.completed_at IS NOT NULL) OVER w AS prev_completed,
		       LAG(EXISTS(SELECT 1 FROM education_quizzes eq2 WHERE eq2.lesson_id = el.id AND eq2.church_id = el.church_id)) OVER w AS prev_has_quiz,
		       LAG(EXISTS(
		         SELECT 1 FROM education_quiz_attempts qa
		         JOIN education_quizzes pq ON pq.id = qa.quiz_id AND pq.lesson_id = el.id
		         WHERE qa.user_id = $4 AND qa.passed = true AND qa.church_id = $3
		       )) OVER w AS prev_quiz_passed
		FROM education_lessons el
		LEFT JOIN education_course_modules cm ON cm.id = el.module_id
		LEFT JOIN education_lesson_progress elp
		       ON elp.lesson_id = el.id AND elp.assignment_id = $2 AND elp.church_id = $3
		WHERE el.curriculum_id = $1 AND el.church_id = $3
		WINDOW w AS (ORDER BY (el.module_id IS NULL) ASC, cm.order_index ASC, el.order_index ASC)
		ORDER BY (el.module_id IS NULL) ASC, cm.order_index ASC, el.order_index ASC
	`, curriculumID, assignmentID, churchID, info.userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener temario"})
	}
	defer rows.Close()

	order := []string{}
	byModule := map[string]*models.EducationSyllabusModule{}
	isEnrolled := assignmentID.Valid

	for rows.Next() {
		var lessonID, title string
		var moduleID, moduleTitle sql.NullString
		var moduleOrder sql.NullInt64
		var orderIndex int
		var durationMinutes sql.NullInt64
		var isCompleted, isInProgress, hasQuiz bool
		var prevLessonID sql.NullString
		var prevCompleted, prevHasQuiz, prevQuizPassed sql.NullBool
		if err := rows.Scan(&lessonID, &orderIndex, &title, &durationMinutes,
			&moduleID, &moduleTitle, &moduleOrder, &isCompleted, &isInProgress, &hasQuiz,
			&prevLessonID, &prevCompleted, &prevHasQuiz, &prevQuizPassed); err != nil {
			continue
		}
		key := "general"
		if moduleID.Valid {
			key = moduleID.String
		}
		if _, exists := byModule[key]; !exists {
			var idPtr *string
			mTitle := "General"
			if moduleID.Valid {
				id := moduleID.String
				idPtr = &id
				mTitle = moduleTitle.String
			}
			byModule[key] = &models.EducationSyllabusModule{ID: idPtr, Title: mTitle, Lessons: []models.EducationSyllabusLesson{}}
			order = append(order, key)
		}

		state := "pending"
		switch {
		case isCompleted:
			state = "completed"
		case isInProgress:
			state = "in_progress"
		case isEnrolled && prevLessonID.Valid:
			prevUnlockedNext := prevCompleted.Bool && (!prevHasQuiz.Bool || prevQuizPassed.Bool)
			if !prevUnlockedNext {
				state = "locked"
			}
		}

		var durPtr *int
		if durationMinutes.Valid {
			d := int(durationMinutes.Int64)
			durPtr = &d
		}
		var lessonModuleID *string
		if moduleID.Valid {
			m := moduleID.String
			lessonModuleID = &m
		}

		byModule[key].Lessons = append(byModule[key].Lessons, models.EducationSyllabusLesson{
			ID: lessonID, ModuleID: lessonModuleID, OrderIndex: orderIndex, Title: title,
			DurationMinutes: durPtr, State: state, HasQuiz: hasQuiz,
		})
	}

	result := []models.EducationSyllabusModule{}
	for _, key := range order {
		result = append(result, *byModule[key])
	}
	return c.JSON(http.StatusOK, result)
}

// GetHome aggregates the caller's own education dashboard: in-progress /
// completed counts, a "continue" pick (the most recently updated in-progress
// assignment), and the full assignment list — the backend for PR-D's
// StudentHome (spec: education-copy-and-omissions "Sidebar composition" —
// exactly profile / avance donut / pending-quiz alert, all derived from this
// same data, never from a stored certificate/next-class field).
func (h *EducationHandler) GetHome(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	userID, _ := c.Get("user_id").(string)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	rows, err := q.Query(assignmentSelectSQL+`
		WHERE ea.church_id = $1 AND ea.assigned_to = $2
		GROUP BY ea.id, ec.name, ec.track, u.first_name, u.last_name
		ORDER BY ea.created_at DESC
	`, churchID, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener panel"})
	}
	defer rows.Close()

	agg := models.EducationHomeAggregate{Assignments: []models.EducationAssignment{}}
	var mostRecentInProgress *models.EducationAssignment
	for rows.Next() {
		a, err := scanAssignmentRow(rows)
		if err != nil {
			continue
		}
		switch a.Status {
		case "completed":
			agg.CompletedCount++
		case "in_progress", "overdue":
			agg.InProgressCount++
			if mostRecentInProgress == nil {
				aCopy := a
				mostRecentInProgress = &aCopy
			}
		}
		agg.Assignments = append(agg.Assignments, a)
	}
	agg.Continue = mostRecentInProgress
	return c.JSON(http.StatusOK, agg)
}

// SetLessonOrder is the bulk lesson-order/move-between-modules operation
// (spec: "Reordering and moving between modules MUST be one bulk operation
// PUT /education/curricula/:id/lesson-order taking the full ordered set").
// Course-wide order_index stays unique per curriculum regardless of which
// module a lesson belongs to (uq_education_lessons_order, untouched).
func (h *EducationHandler) SetLessonOrder(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	curriculumID := c.Param("id")
	var req struct {
		Lessons []struct {
			ID         string  `json:"id"`
			ModuleID   *string `json:"module_id"`
			OrderIndex int     `json:"order_index"`
		} `json:"lessons"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if len(req.Lessons) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "lessons es requerido"})
	}
	for _, l := range req.Lessons {
		if l.OrderIndex <= 0 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
		}
	}

	for _, l := range req.Lessons {
		res, err := q.Exec(`
			UPDATE education_lessons SET module_id = $3, order_index = $4, updated_at = now()
			WHERE id = $1 AND curriculum_id = $2 AND church_id = $5
		`, l.ID, curriculumID, l.ModuleID, l.OrderIndex, churchID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al reordenar lecciones"})
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return c.JSON(http.StatusNotFound, map[string]string{"error": fmt.Sprintf("Lección %s no encontrada en este currículo", l.ID)})
		}
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Orden actualizado"})
}
