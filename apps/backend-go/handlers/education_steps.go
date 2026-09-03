package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"backend-sion/config"
	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// STEPS + BLOCKS (PR-B, education-content-model)
//
// Every write funnels through ValidateLessonBlocks (education_blocks_
// validate.go) — the ONLY write path into education_lesson_steps.blocks.
//
// Read access is intentionally NOT the same rule as GetLessons (PR-A, lesson
// shells): a level 1-2 caller must hold an assignment on the lesson's
// curriculum to read step CONTENT (steps+blocks), whereas the syllabus shell
// (title/duration only) stays visible to any published-curriculum browser.
// Level >= 3 (author) always reads freely within their own church, since
// authoring requires seeing content regardless of enrollment. See
// lessonReadAccess below — the single gate both GetLessonDetail (education_
// content list read) and the step handlers share.
// ─────────────────────────────────────────────────────────────────────────────

// lessonReadAccess resolves (curriculumID, ok) for a lesson the caller may
// read CONTENT for. Returns ok=false when the lesson doesn't exist in this
// church, OR (for level < 3) the caller holds no assignment on its
// curriculum — callers should respond 404 either way (existence not leaked,
// matching GetLessons/EnrollSelf's established convention).
func lessonReadAccess(q config.Querier, churchID, lessonID, callerID string, level int) (curriculumID string, ok bool, err error) {
	err = q.QueryRow(`SELECT curriculum_id FROM education_lessons WHERE id = $1 AND church_id = $2`,
		lessonID, churchID).Scan(&curriculumID)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if level >= educationAuthorLevel {
		return curriculumID, true, nil
	}
	var assigned bool
	if err := q.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM education_assignments WHERE curriculum_id = $1 AND church_id = $2 AND assigned_to = $3)
	`, curriculumID, churchID, callerID).Scan(&assigned); err != nil {
		return "", false, err
	}
	return curriculumID, assigned, nil
}

// blockIDsUsedElsewhereInLesson collects every block id already stored in
// the lesson's OTHER steps (excluding excludeStepID, so updating a step
// against its OWN previous blocks doesn't self-collide) — feeds
// ValidateLessonBlocks's lesson-wide uniqueness check.
func blockIDsUsedElsewhereInLesson(q config.Querier, churchID, lessonID, excludeStepID string) (map[string]bool, error) {
	rows, err := q.Query(`
		SELECT blocks FROM education_lesson_steps
		WHERE lesson_id = $1 AND church_id = $2 AND id <> $3
	`, lessonID, churchID, excludeStepID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	used := map[string]bool{}
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			continue
		}
		var blocks []struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(raw, &blocks); err != nil {
			continue
		}
		for _, b := range blocks {
			used[b.ID] = true
		}
	}
	return used, rows.Err()
}

func scanStepRow(scanner interface {
	Scan(dest ...interface{}) error
}) (models.EducationStep, error) {
	var s models.EducationStep
	var rawBlocks []byte
	err := scanner.Scan(&s.ID, &s.LessonID, &s.OrderIndex, &s.Label, &rawBlocks, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return s, err
	}
	s.Blocks = []models.EducationBlock{}
	if len(rawBlocks) > 0 {
		_ = json.Unmarshal(rawBlocks, &s.Blocks)
	}
	return s, nil
}

const stepSelectSQL = `
	SELECT id, lesson_id, order_index, label, blocks,
	       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	FROM education_lesson_steps
`

// GetLessonDetail returns lesson metadata plus its ordered steps (with
// blocks) — the actual content-serving endpoint PR-A stripped out of
// GetLessons/CreateLesson/UpdateLesson (design: "PR-A ... strips content
// from lesson handlers ... step/block content authoring is PR-B's job").
func (h *EducationHandler) GetLessonDetail(c echo.Context) error {
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
	var l models.EducationLessonDetail
	var moduleID sql.NullString
	err = q.QueryRow(`
		SELECT id, curriculum_id, module_id::text, order_index, title, duration_minutes
		FROM education_lessons WHERE id = $1 AND church_id = $2
	`, lessonID, churchID).Scan(&l.ID, &l.CurriculumID, &moduleID, &l.OrderIndex, &l.Title, &l.DurationMinutes)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener lección"})
	}
	if moduleID.Valid {
		l.ModuleID = &moduleID.String
	}

	if info.level < educationAuthorLevel {
		var assigned bool
		if err := q.QueryRow(`
			SELECT EXISTS(SELECT 1 FROM education_assignments WHERE curriculum_id = $1 AND church_id = $2 AND assigned_to = $3)
		`, l.CurriculumID, churchID, info.userID).Scan(&assigned); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar inscripción"})
		}
		if !assigned {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
		}
	}

	rows, err := q.Query(stepSelectSQL+` WHERE lesson_id = $1 AND church_id = $2 ORDER BY order_index ASC`, lessonID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener pasos"})
	}
	defer rows.Close()

	l.Steps = []models.EducationStep{}
	for rows.Next() {
		s, err := scanStepRow(rows)
		if err != nil {
			continue
		}
		l.Steps = append(l.Steps, s)
	}
	return c.JSON(http.StatusOK, l)
}

// GetLessonSteps lists steps for a lesson (list-only view; same read gate as
// GetLessonDetail).
func (h *EducationHandler) GetLessonSteps(c echo.Context) error {
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

	lessonID := c.Param("lessonId")
	_, ok, err = lessonReadAccess(q, churchID, lessonID, info.userID, info.level)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	rows, err := q.Query(stepSelectSQL+` WHERE lesson_id = $1 AND church_id = $2 ORDER BY order_index ASC`, lessonID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener pasos"})
	}
	defer rows.Close()

	steps := []models.EducationStep{}
	for rows.Next() {
		s, err := scanStepRow(rows)
		if err != nil {
			continue
		}
		steps = append(steps, s)
	}
	return c.JSON(http.StatusOK, steps)
}

// GetStepByID returns one step — same read gate as GetLessonSteps.
func (h *EducationHandler) GetStepByID(c echo.Context) error {
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

	lessonID := c.Param("lessonId")
	stepID := c.Param("stepId")
	_, ok, err = lessonReadAccess(q, churchID, lessonID, info.userID, info.level)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	row := q.QueryRow(stepSelectSQL+` WHERE id = $1 AND lesson_id = $2 AND church_id = $3`, stepID, lessonID, churchID)
	s, err := scanStepRow(row)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Paso no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener paso"})
	}
	return c.JSON(http.StatusOK, s)
}

// CreateStep creates a step shell or a step with initial blocks — author
// (level >= 3) only.
func (h *EducationHandler) CreateStep(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	lessonID := c.Param("lessonId")
	var lessonExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND church_id = $2)`,
		lessonID, churchID).Scan(&lessonExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	var req struct {
		Label      string          `json:"label"`
		Blocks     json.RawMessage `json:"blocks"`
		OrderIndex *int            `json:"order_index"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Label) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "label es requerido"})
	}
	blocksRaw := req.Blocks
	if len(blocksRaw) == 0 {
		blocksRaw = json.RawMessage(`[]`)
	}

	used, err := blockIDsUsedElsewhereInLesson(q, churchID, lessonID, "")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar bloques existentes"})
	}
	if err := ValidateLessonBlocks(blocksRaw, used); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("Bloques inválidos: %s", err.Error())})
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	} else {
		if err := q.QueryRow(`SELECT COALESCE(MAX(order_index), 0) + 1 FROM education_lesson_steps WHERE lesson_id = $1`, lessonID).Scan(&orderIndex); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al calcular posición"})
		}
	}
	if orderIndex <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO education_lesson_steps (church_id, lesson_id, order_index, label, blocks)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		RETURNING id
	`, churchID, lessonID, orderIndex, strings.TrimSpace(req.Label), string(blocksRaw)).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un paso en esa posición"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear paso"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Paso creado exitosamente"})
}

// UpdateStep replaces label/blocks (PUT semantics) — author (level >= 3)
// only. The step editor's autosave (PR-I) targets this endpoint.
func (h *EducationHandler) UpdateStep(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	lessonID := c.Param("lessonId")
	stepID := c.Param("stepId")

	var req struct {
		Label  *string         `json:"label"`
		Blocks json.RawMessage `json:"blocks"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Label != nil && strings.TrimSpace(*req.Label) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "label no puede estar vacío"})
	}

	var blocksArg interface{}
	if len(req.Blocks) > 0 {
		used, err := blockIDsUsedElsewhereInLesson(q, churchID, lessonID, stepID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar bloques existentes"})
		}
		if err := ValidateLessonBlocks(req.Blocks, used); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("Bloques inválidos: %s", err.Error())})
		}
		blocksArg = string(req.Blocks)
	}

	res, err := q.Exec(`
		UPDATE education_lesson_steps
		SET label      = COALESCE($4, label),
		    blocks     = COALESCE($5::jsonb, blocks),
		    updated_at = now()
		WHERE id = $1 AND lesson_id = $2 AND church_id = $3
	`, stepID, lessonID, churchID, req.Label, blocksArg)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar paso"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Paso no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Paso actualizado"})
}

// DeleteStep removes a step — author (level >= 3) only. Progress rows
// pointing at this step (current_step_id) fall back to NULL via the FK's ON
// DELETE SET NULL; visited_step_ids entries for a deleted step simply never
// match again (design A3: "accepted cost, no pruning job").
func (h *EducationHandler) DeleteStep(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	lessonID := c.Param("lessonId")
	stepID := c.Param("stepId")
	res, err := q.Exec(`DELETE FROM education_lesson_steps WHERE id = $1 AND lesson_id = $2 AND church_id = $3`,
		stepID, lessonID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar paso"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Paso no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Paso eliminado"})
}

// ReorderSteps applies a new order_index for a batch of steps within one
// lesson, atomically — same DEFERRABLE-constraint pattern as
// education.go's ReorderLessons (uq_education_lesson_steps_order is
// DEFERRABLE INITIALLY DEFERRED for exactly this reason).
func (h *EducationHandler) ReorderSteps(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	lessonID := c.Param("lessonId")
	var req struct {
		Steps []struct {
			ID         string `json:"id"`
			OrderIndex int    `json:"order_index"`
		} `json:"steps"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if len(req.Steps) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "steps es requerido"})
	}
	for _, s := range req.Steps {
		if s.OrderIndex <= 0 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
		}
	}

	for _, s := range req.Steps {
		res, err := q.Exec(`
			UPDATE education_lesson_steps SET order_index = $3, updated_at = now()
			WHERE id = $1 AND lesson_id = $2 AND church_id = $4
		`, s.ID, lessonID, s.OrderIndex, churchID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al reordenar pasos"})
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return c.JSON(http.StatusNotFound, map[string]string{"error": fmt.Sprintf("Paso %s no encontrado en esta lección", s.ID)})
		}
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Orden actualizado"})
}

// ─────────────────────────────────────────────────────────────────────────────
// Step-pointer persistence (design A2/A3: current_step_id uuid +
// visited_step_ids uuid[] — NOT the spec's literal current_step int, since
// an ordinal cannot survive a step reorder)
// ─────────────────────────────────────────────────────────────────────────────

// UpdateLessonPosition persists the CALLER's own step pointer for one
// assignment/lesson pair, on every step change (spec: "Resume after
// refresh"). Self-only, same ownership pattern as MarkLessonComplete. Row
// presence continues to mean STARTED (education-assignments DELTA):
// advancing steps upserts a progress row without ever touching
// completed_at, so an in-progress lesson never gets counted as complete by
// the guard in education_assignments.go.
//
// The server does NOT reject a forward-skip write (e.g. jumping straight to
// step 4 of 4) — "cannot skip forward" is a client-side affordance over
// visited_step_ids (spec: education-lesson-consumption, not a security
// boundary in the threat matrix), so this endpoint is intentionally
// permissive about what step_id the caller reports reaching.
func (h *EducationHandler) UpdateLessonPosition(c echo.Context) error {
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

	var req struct {
		StepID string `json:"step_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.StepID) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "step_id es requerido"})
	}

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

	var stepBelongs bool
	if err := q.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM education_lesson_steps s
			JOIN education_lessons l ON l.id = s.lesson_id AND l.curriculum_id = $2 AND l.church_id = $3
			WHERE s.id = $1 AND s.lesson_id = $4 AND s.church_id = $3
		)`, req.StepID, curriculumID, churchID, lessonID).Scan(&stepBelongs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar paso"})
	}
	if !stepBelongs {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Paso no encontrado en esta lección"})
	}

	if _, err := q.Exec(`
		INSERT INTO education_lesson_progress (church_id, assignment_id, lesson_id, current_step_id, visited_step_ids)
		VALUES ($1, $2, $3, $4, ARRAY[$4]::uuid[])
		ON CONFLICT (assignment_id, lesson_id) DO UPDATE SET
			current_step_id  = EXCLUDED.current_step_id,
			visited_step_ids = CASE
				WHEN $4 = ANY(education_lesson_progress.visited_step_ids)
				THEN education_lesson_progress.visited_step_ids
				ELSE array_append(education_lesson_progress.visited_step_ids, $4::uuid)
			END,
			updated_at = now()
	`, churchID, assignmentID, lessonID, req.StepID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar posición"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Posición guardada"})
}
