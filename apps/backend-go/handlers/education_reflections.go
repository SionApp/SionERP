package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// REFLECTIONS (PR-B, education-content-model "Reflection answers are
// private, ungraded journal entries") — self-only write, owner-or-author
// read. Mirrors MarkLessonComplete's self-only constraint (PR3a/PR-A): the
// write endpoint never accepts a user_id, so there is no ID to spoof.
// ─────────────────────────────────────────────────────────────────────────────

// reflectionBlockIsQuestion validates on write that block_id exists among
// the lesson's steps' blocks AND is of type "question" (spec: "Answer to a
// non-question block rejected"). block_id has no FK — it lives inside the
// steps.blocks jsonb — so this is the server-side existence+type check the
// spec requires in place of one.
func reflectionBlockIsQuestion(q interface {
	QueryRow(query string, args ...interface{}) *sql.Row
}, churchID, lessonID, blockID string) (bool, error) {
	var ok bool
	err := q.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM education_lesson_steps s, jsonb_array_elements(s.blocks) b
			WHERE s.lesson_id = $1 AND s.church_id = $2
			  AND b->>'id' = $3 AND b->>'type' = 'question'
		)
	`, lessonID, churchID, blockID).Scan(&ok)
	return ok, err
}

// UpsertReflection writes (creates or updates) the CALLER's own answer to a
// question block — level 1 (any education-module member), self-only.
func (h *EducationHandler) UpsertReflection(c echo.Context) error {
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

	lessonID := c.Param("id")
	blockID := c.Param("blockId")

	var req struct {
		Answer string `json:"answer"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Answer) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "answer es requerido"})
	}

	var lessonExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND church_id = $2)`,
		lessonID, churchID).Scan(&lessonExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	isQuestion, err := reflectionBlockIsQuestion(q, churchID, lessonID, blockID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar bloque"})
	}
	if !isQuestion {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "El bloque indicado no es una pregunta de reflexión en esta lección"})
	}

	if _, err := q.Exec(`
		INSERT INTO education_lesson_reflections (church_id, lesson_id, block_id, user_id, answer)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (lesson_id, block_id, user_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = now()
	`, churchID, lessonID, blockID, userID, strings.TrimSpace(req.Answer)); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar reflexión"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Reflexión guardada"})
}

// GetReflection reads a reflection answer. Access boundary (spec: "Read
// access boundary"): the owner may always read their own; an Education
// level >= 3 user in the SAME church may read anyone's; any other caller
// gets 404 (existence not leaked, matching the module's established
// convention). `?user_id=` selects whose answer to read — omitted/self
// defaults to the caller's own, which needs no elevated level at all.
func (h *EducationHandler) GetReflection(c echo.Context) error {
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
	blockID := c.Param("blockId")
	targetUserID := strings.TrimSpace(c.QueryParam("user_id"))
	if targetUserID == "" {
		targetUserID = info.userID
	}
	if targetUserID != info.userID && info.level < educationAuthorLevel {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Reflexión no encontrada"})
	}

	var r models.EducationReflection
	err = q.QueryRow(`
		SELECT id, lesson_id, block_id, user_id, answer,
		       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_lesson_reflections
		WHERE lesson_id = $1 AND block_id = $2 AND user_id = $3 AND church_id = $4
	`, lessonID, blockID, targetUserID, churchID).Scan(&r.ID, &r.LessonID, &r.BlockID, &r.UserID, &r.Answer, &r.CreatedAt, &r.UpdatedAt)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Reflexión no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener reflexión"})
	}
	return c.JSON(http.StatusOK, r)
}
