package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"backend-sion/config"
	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS + LESSON PROGRESS (PR3a)
//
// Split from education.go (curriculum/lesson CRUD, PR2a) to keep files from
// growing unbounded — same EducationHandler receiver, same validateTx/
// config.Tx(c) RLS-enforced pattern (design: "read PR2a's existing handlers
// for the established pattern and match it exactly").
//
// Origin model (proposal decision 1 / design): education_assignments carries
// a nullable (source_module, source_ref_id) pair. NULL means self-enrolled
// or directly assigned by an author; non-NULL (currently only 'discipleship',
// per the table's own CHECK) means another module created it. Education never
// imports another module's types to do so — callers simply pass the tag.
//
// Progress model (design D4): row-presence in education_lesson_progress.
// A row existing = that lesson is complete for that assignment. There is no
// status column; "un-completing" a lesson is a DELETE, not an UPDATE.
// ─────────────────────────────────────────────────────────────────────────────

var validEducationSourceModules = map[string]bool{
	"discipleship": true,
}

// deriveAssignmentStatusSQL is the shared CASE expression implementing design
// D3 (status is derived, never stored): completed_at set → completed; else
// due_date in the past → overdue; else any progress → in_progress; else
// pending. Used identically by every query that returns an assignment row so
// the derivation logic lives in exactly one place.
const deriveAssignmentStatusSQL = `
	CASE
	  WHEN ea.completed_at IS NOT NULL THEN 'completed'
	  WHEN ea.due_date IS NOT NULL AND ea.due_date < CURRENT_DATE THEN 'overdue'
	  WHEN COUNT(elp.id) > 0 THEN 'in_progress'
	  ELSE 'pending'
	END
`

const assignmentSelectSQL = `
	SELECT ea.id, ea.curriculum_id, ec.name,
	       ea.assigned_to::text, ea.assigned_by::text,
	       ea.source_module, ea.source_ref_id::text,
	       to_char(ea.due_date, 'YYYY-MM-DD'),
	       to_char(ea.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       to_char(ea.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       COUNT(elp.id) AS completed_lessons,
	       (SELECT COUNT(*) FROM education_lessons el2 WHERE el2.curriculum_id = ea.curriculum_id) AS total_lessons,
	       ` + deriveAssignmentStatusSQL + ` AS status
	FROM education_assignments ea
	JOIN education_curricula ec ON ec.id = ea.curriculum_id
	LEFT JOIN education_lesson_progress elp ON elp.assignment_id = ea.id
`

// scanAssignmentRow scans one row produced by assignmentSelectSQL.
func scanAssignmentRow(rows interface {
	Scan(dest ...interface{}) error
}) (models.EducationAssignment, error) {
	var a models.EducationAssignment
	var assignedBy, sourceModule, sourceRefID, dueDate, completedAt sql.NullString
	err := rows.Scan(&a.ID, &a.CurriculumID, &a.CurriculumName,
		&a.AssignedTo, &assignedBy, &sourceModule, &sourceRefID,
		&dueDate, &completedAt, &a.CreatedAt,
		&a.CompletedLessons, &a.TotalLessons, &a.Status)
	if err != nil {
		return a, err
	}
	if assignedBy.Valid {
		a.AssignedBy = &assignedBy.String
	}
	if sourceModule.Valid {
		a.SourceModule = &sourceModule.String
	}
	if sourceRefID.Valid {
		a.SourceRefID = &sourceRefID.String
	}
	if dueDate.Valid {
		a.DueDate = &dueDate.String
	}
	if completedAt.Valid {
		a.CompletedAt = &completedAt.String
	}
	return a, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment creation (author/admin bulk assign + self-enroll)
// ─────────────────────────────────────────────────────────────────────────────

// CreateAssignments bulk-assigns a curriculum to one or more users of the
// caller's church. Level 3+ (author) action — an author or module admin can
// assign to anyone. Also the entry point another module (e.g. Discipleship,
// PR4) will call, tagging the row with its own source_module/source_ref_id;
// Education validates the tag against the column's own CHECK constraint but
// never imports the calling module's types.
func (h *EducationHandler) CreateAssignments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	callerID, _ := c.Get("user_id").(string)

	var req struct {
		CurriculumID string   `json:"curriculum_id"`
		UserIDs      []string `json:"user_ids"`
		DueDate      *string  `json:"due_date"`
		SourceModule *string  `json:"source_module"`
		SourceRefID  *string  `json:"source_ref_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.CurriculumID) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "curriculum_id es requerido"})
	}
	if len(req.UserIDs) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_ids es requerido"})
	}
	if (req.SourceModule == nil) != (req.SourceRefID == nil) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "source_module y source_ref_id deben venir juntos"})
	}
	if req.SourceModule != nil && !validEducationSourceModules[*req.SourceModule] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "source_module inválido"})
	}

	var curriculumExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_curricula WHERE id = $1 AND church_id = $2)`,
		req.CurriculumID, churchID).Scan(&curriculumExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}
	if !curriculumExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}

	var assignedByArg interface{}
	if callerID != "" {
		assignedByArg = callerID
	}

	created := 0
	skipped := 0
	for _, userID := range req.UserIDs {
		userID = strings.TrimSpace(userID)
		if userID == "" {
			continue
		}
		var belongs bool
		if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND church_id = $2)`, userID, churchID).Scan(&belongs); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar usuario"})
		}
		if !belongs {
			skipped++
			continue
		}
		res, err := q.Exec(`
			INSERT INTO education_assignments
				(church_id, curriculum_id, assigned_to, assigned_by, source_module, source_ref_id, due_date)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (church_id, curriculum_id, assigned_to) DO NOTHING
		`, churchID, req.CurriculumID, userID, assignedByArg, req.SourceModule, req.SourceRefID, req.DueDate)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear asignación"})
		}
		n, _ := res.RowsAffected()
		if n > 0 {
			created++
		} else {
			skipped++
		}
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"created": created,
		"skipped": skipped,
		"message": fmt.Sprintf("%d asignación(es) creada(s), %d omitida(s) (usuario inválido o ya asignado)", created, skipped),
	})
}

// EnrollSelf lets the caller self-enroll in a PUBLISHED curriculum, creating
// their own assignment with source_module/source_ref_id NULL (proposal
// decision 1: "self-assigned" and "author-assigned" are the same row shape,
// differing only in that origin tag). Level 1 (student) action — the
// existence check that draft curricula stay invisible mirrors GetCurricula/
// GetLessons (404, not 403, so a draft's existence is not leaked).
func (h *EducationHandler) EnrollSelf(c echo.Context) error {
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

	curriculumID := c.Param("id")
	var status string
	err = q.QueryRow(`SELECT status FROM education_curricula WHERE id = $1 AND church_id = $2`, curriculumID, churchID).Scan(&status)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}
	if status != "published" {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO education_assignments (church_id, curriculum_id, assigned_to, assigned_by, due_date)
		VALUES ($1, $2, $3, $3, NULL)
		ON CONFLICT (church_id, curriculum_id, assigned_to) DO NOTHING
		RETURNING id
	`, churchID, curriculumID, userID).Scan(&id)
	if err == sql.ErrNoRows {
		// Already enrolled — idempotent, return the existing assignment id.
		if err2 := q.QueryRow(`
			SELECT id FROM education_assignments WHERE church_id = $1 AND curriculum_id = $2 AND assigned_to = $3
		`, churchID, curriculumID, userID).Scan(&id); err2 != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar inscripción"})
		}
		return c.JSON(http.StatusOK, map[string]string{"id": id, "message": "Ya estabas inscripto en este currículo"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al inscribirse"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Inscripción exitosa"})
}

// DeleteAssignment removes an assignment — level 3+ (author/admin) action.
// Cascades to education_lesson_progress via the table's own ON DELETE CASCADE.
func (h *EducationHandler) DeleteAssignment(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM education_assignments WHERE id = $1 AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar asignación"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Asignación eliminada"})
}

// ─────────────────────────────────────────────────────────────────────────────
// Student self-service — "mis asignaciones" (level 1)
// ─────────────────────────────────────────────────────────────────────────────

// GetMyAssignments lists the caller's own assignments with a per-assignment
// progress rollup. Self-only by construction (WHERE assigned_to = caller) —
// there is no user_id parameter to spoof.
func (h *EducationHandler) GetMyAssignments(c echo.Context) error {
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
		GROUP BY ea.id, ec.name
		ORDER BY ea.created_at DESC
	`, churchID, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignaciones"})
	}
	defer rows.Close()

	assignments := []models.EducationAssignment{}
	for rows.Next() {
		a, err := scanAssignmentRow(rows)
		if err != nil {
			continue
		}
		assignments = append(assignments, a)
	}
	return c.JSON(http.StatusOK, assignments)
}

// GetMyAssignmentByID returns a single own assignment — 404 (not 403) when it
// exists but belongs to someone else, so ownership is never leaked.
func (h *EducationHandler) GetMyAssignmentByID(c echo.Context) error {
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

	id := c.Param("id")
	row := q.QueryRow(assignmentSelectSQL+`
		WHERE ea.id = $1 AND ea.church_id = $2 AND ea.assigned_to = $3
		GROUP BY ea.id, ec.name
	`, id, churchID, userID)
	a, err := scanAssignmentRow(row)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignación"})
	}
	return c.JSON(http.StatusOK, a)
}

// recomputeAssignmentCompletion applies the completion side effect documented
// in design ("after INSERT/DELETE on progress, if COUNT(progress) = COUNT
// (lessons) then completed_at = now(), else completed_at = NULL") in the same
// transaction as the progress mutation that triggered it.
func recomputeAssignmentCompletion(q config.Querier, assignmentID string) error {
	var completedCount, totalCount int
	err := q.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM education_lesson_progress WHERE assignment_id = $1),
			(SELECT COUNT(*) FROM education_lessons el
			   JOIN education_assignments ea ON ea.curriculum_id = el.curriculum_id
			  WHERE ea.id = $1)
	`, assignmentID).Scan(&completedCount, &totalCount)
	if err != nil {
		return err
	}
	if totalCount > 0 && completedCount == totalCount {
		_, err = q.Exec(`UPDATE education_assignments SET completed_at = now() WHERE id = $1`, assignmentID)
		return err
	}
	_, err = q.Exec(`UPDATE education_assignments SET completed_at = NULL WHERE id = $1`, assignmentID)
	return err
}

// MarkLessonComplete marks a lesson complete for the CALLER's own assignment.
// Self-only: the assignment lookup is scoped to assigned_to = caller, so a
// user can never mark another user's progress — there is no admin override
// on this endpoint by design (progress is a personal, first-person action).
// Idempotent: ON CONFLICT DO NOTHING on the (assignment_id, lesson_id) UNIQUE.
func (h *EducationHandler) MarkLessonComplete(c echo.Context) error {
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

	assignmentID := c.Param("id")
	lessonID := c.Param("lessonId")

	var curriculumID string
	err = q.QueryRow(`
		SELECT curriculum_id FROM education_assignments
		WHERE id = $1 AND church_id = $2 AND assigned_to = $3
	`, assignmentID, churchID, userID).Scan(&curriculumID)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar asignación"})
	}

	var lessonBelongs bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND curriculum_id = $2 AND church_id = $3)`,
		lessonID, curriculumID, churchID).Scan(&lessonBelongs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonBelongs {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada en este currículo"})
	}

	if _, err := q.Exec(`
		INSERT INTO education_lesson_progress (church_id, assignment_id, lesson_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (assignment_id, lesson_id) DO NOTHING
	`, churchID, assignmentID, lessonID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al marcar lección completa"})
	}
	if err := recomputeAssignmentCompletion(q, assignmentID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar progreso"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección marcada como completa"})
}

// MarkLessonIncomplete un-completes a lesson for the CALLER's own assignment
// (design D4: progress is row-presence, so "incomplete" is a DELETE). Same
// self-only constraint as MarkLessonComplete.
func (h *EducationHandler) MarkLessonIncomplete(c echo.Context) error {
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

	assignmentID := c.Param("id")
	lessonID := c.Param("lessonId")

	var owned bool
	if err := q.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM education_assignments WHERE id = $1 AND church_id = $2 AND assigned_to = $3)
	`, assignmentID, churchID, userID).Scan(&owned); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar asignación"})
	}
	if !owned {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}

	if _, err := q.Exec(`
		DELETE FROM education_lesson_progress WHERE assignment_id = $1 AND lesson_id = $2 AND church_id = $3
	`, assignmentID, lessonID, churchID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al desmarcar lección"})
	}
	if err := recomputeAssignmentCompletion(q, assignmentID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar progreso"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección desmarcada"})
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin view — who's assigned to a curriculum, and their progress (level 3)
// ─────────────────────────────────────────────────────────────────────────────

// GetCurriculumProgress lists every assignment for a curriculum (all assigned
// users, their progress) — the admin counterpart to GetMyAssignments.
func (h *EducationHandler) GetCurriculumProgress(c echo.Context) error {
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
		SELECT ea.id, ea.curriculum_id, ec.name,
		       ea.assigned_to::text, ea.assigned_by::text,
		       ea.source_module, ea.source_ref_id::text,
		       to_char(ea.due_date, 'YYYY-MM-DD'),
		       to_char(ea.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(ea.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       COUNT(elp.id) AS completed_lessons,
		       (SELECT COUNT(*) FROM education_lessons el2 WHERE el2.curriculum_id = ea.curriculum_id) AS total_lessons,
		       `+deriveAssignmentStatusSQL+` AS status,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS assigned_to_name,
		       u.email
		FROM education_assignments ea
		JOIN education_curricula ec ON ec.id = ea.curriculum_id
		JOIN users u ON u.id = ea.assigned_to
		LEFT JOIN education_lesson_progress elp ON elp.assignment_id = ea.id
		WHERE ea.curriculum_id = $1 AND ea.church_id = $2
		GROUP BY ea.id, ec.name, u.first_name, u.last_name, u.email
		ORDER BY assigned_to_name ASC
	`, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener progreso"})
	}
	defer rows.Close()

	assignments := []models.EducationAssignment{}
	for rows.Next() {
		var a models.EducationAssignment
		var assignedBy, sourceModule, sourceRefID, dueDate, completedAt, name, email sql.NullString
		if err := rows.Scan(&a.ID, &a.CurriculumID, &a.CurriculumName,
			&a.AssignedTo, &assignedBy, &sourceModule, &sourceRefID,
			&dueDate, &completedAt, &a.CreatedAt,
			&a.CompletedLessons, &a.TotalLessons, &a.Status, &name, &email); err != nil {
			continue
		}
		if assignedBy.Valid {
			a.AssignedBy = &assignedBy.String
		}
		if sourceModule.Valid {
			a.SourceModule = &sourceModule.String
		}
		if sourceRefID.Valid {
			a.SourceRefID = &sourceRefID.String
		}
		if dueDate.Valid {
			a.DueDate = &dueDate.String
		}
		if completedAt.Valid {
			a.CompletedAt = &completedAt.String
		}
		if name.Valid {
			a.AssignedToName = &name.String
		}
		if email.Valid {
			a.AssignedToEmail = &email.String
		}
		assignments = append(assignments, a)
	}
	return c.JSON(http.StatusOK, assignments)
}
