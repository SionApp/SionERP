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
// COURSE MODULES (PR-B, education-catalog "Course modules group lessons
// without owning order") — the grouping level above lessons. Lesson
// order_index stays course-wide and unique per curriculum (untouched); a
// module only affects DISPLAY grouping. Same read-visibility rule as
// GetLessons: level < 3 only sees modules of a published curriculum.
// ─────────────────────────────────────────────────────────────────────────────

func scanModuleRow(scanner interface {
	Scan(dest ...interface{}) error
}) (models.EducationCourseModule, error) {
	var m models.EducationCourseModule
	var description sql.NullString
	err := scanner.Scan(&m.ID, &m.CurriculumID, &m.OrderIndex, &m.Title, &description, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return m, err
	}
	if description.Valid {
		m.Description = &description.String
	}
	return m, nil
}

const moduleSelectSQL = `
	SELECT id, curriculum_id, order_index, title, description,
	       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	FROM education_course_modules
`

// GetCourseModules lists modules for a curriculum, ordered.
func (h *EducationHandler) GetCourseModules(c echo.Context) error {
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

	rows, err := q.Query(moduleSelectSQL+` WHERE curriculum_id = $1 AND church_id = $2 ORDER BY order_index ASC`, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener módulos"})
	}
	defer rows.Close()

	modules := []models.EducationCourseModule{}
	for rows.Next() {
		m, err := scanModuleRow(rows)
		if err != nil {
			continue
		}
		modules = append(modules, m)
	}
	return c.JSON(http.StatusOK, modules)
}

// CreateCourseModule — author (level >= 3) only.
func (h *EducationHandler) CreateCourseModule(c echo.Context) error {
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

	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
		OrderIndex  *int    `json:"order_index"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Title) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "title es requerido"})
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	} else {
		if err := q.QueryRow(`SELECT COALESCE(MAX(order_index), 0) + 1 FROM education_course_modules WHERE curriculum_id = $1`, curriculumID).Scan(&orderIndex); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al calcular posición"})
		}
	}
	if orderIndex <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO education_course_modules (church_id, curriculum_id, order_index, title, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, churchID, curriculumID, orderIndex, strings.TrimSpace(req.Title), req.Description).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un módulo en esa posición"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear módulo"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Módulo creado exitosamente"})
}

// UpdateCourseModule — author (level >= 3) only.
func (h *EducationHandler) UpdateCourseModule(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Title != nil && strings.TrimSpace(*req.Title) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "title no puede estar vacío"})
	}

	res, err := q.Exec(`
		UPDATE education_course_modules
		SET title       = COALESCE($3, title),
		    description = COALESCE($4, description),
		    updated_at  = now()
		WHERE id = $1 AND church_id = $2
	`, id, churchID, req.Title, req.Description)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar módulo"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Módulo no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Módulo actualizado"})
}

// DeleteCourseModule — author (level >= 3) only. Child lessons get
// module_id = NULL automatically (FK ON DELETE SET NULL) and render under
// the implicit "General" group — no manual orphan handling needed here
// (spec: "Module deletion orphans safely").
func (h *EducationHandler) DeleteCourseModule(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM education_course_modules WHERE id = $1 AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar módulo"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Módulo no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Módulo eliminado"})
}

// ReorderCourseModules — author (level >= 3) only. Same DEFERRABLE-
// constraint atomic-batch pattern as ReorderLessons/ReorderSteps.
func (h *EducationHandler) ReorderCourseModules(c echo.Context) error {
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
		Modules []struct {
			ID         string `json:"id"`
			OrderIndex int    `json:"order_index"`
		} `json:"modules"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if len(req.Modules) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "modules es requerido"})
	}
	for _, m := range req.Modules {
		if m.OrderIndex <= 0 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
		}
	}

	for _, m := range req.Modules {
		res, err := q.Exec(`
			UPDATE education_course_modules SET order_index = $3, updated_at = now()
			WHERE id = $1 AND curriculum_id = $2 AND church_id = $4
		`, m.ID, curriculumID, m.OrderIndex, churchID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al reordenar módulos"})
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return c.JSON(http.StatusNotFound, map[string]string{"error": fmt.Sprintf("Módulo %s no encontrado en este currículo", m.ID)})
		}
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Orden actualizado"})
}
