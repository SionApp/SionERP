package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"backend-sion/config"
	"backend-sion/models"
	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// Handler struct
// ─────────────────────────────────────────────────────────────────────────────

type EducationHandler struct{}

func NewEducationHandler() *EducationHandler {
	return &EducationHandler{}
}

// ─────────────────────────────────────────────────────────────────────────────
// Role ladder (spec: education-module-roles) — 1=student, 3=author, 5=module admin
// ─────────────────────────────────────────────────────────────────────────────

const (
	educationStudentLevel = 1
	educationAuthorLevel  = 3
	educationAdminLevel   = 5
)

var validEducationCadences = map[string]bool{
	"weekly":    true,
	"quarterly": true,
}

var validEducationStatuses = map[string]bool{
	"draft":     true,
	"published": true,
	"archived":  true,
}

// ─────────────────────────────────────────────────────────────────────────────
// Access helper
// ─────────────────────────────────────────────────────────────────────────────

type educationAccessInfo struct {
	userID string
	level  int
}

// getEducationAccessInfo resolves the caller's education module access.
//   - pastor/admin bypass → level 5 (module admin).
//   - module_user_roles entry (church-scoped) → uses stored role_level.
//   - No entry → level 0 (no access; handlers that allow level 0 through
//     RequireModule alone must degrade gracefully, e.g. published-only reads).
func getEducationAccessInfo(c echo.Context) (educationAccessInfo, error) {
	userID, _ := c.Get("user_id").(string)
	if userID == "" {
		return educationAccessInfo{}, fmt.Errorf("user not authenticated")
	}

	// RequireModuleLevel already resolved this for gated routes.
	if moduleLevel, _ := c.Get("module_role_level").(int); moduleLevel >= educationAdminLevel {
		return educationAccessInfo{userID: userID, level: educationAdminLevel}, nil
	}

	dbRole, _ := c.Get("db_role").(string)
	if utils.GetRoleLevel(dbRole) >= utils.LevelPastor {
		return educationAccessInfo{userID: userID, level: educationAdminLevel}, nil
	}

	moduleLevel, _ := c.Get("module_role_level").(int)
	if moduleLevel == 0 {
		// Not set by middleware (e.g. GET routes gated only by RequireModule) —
		// resolve directly via the request-scoped tx (RLS-enforced), still
		// explicitly scoped by church_id per the module_user_roles unique
		// constraint (church_id, user_id, module_key).
		churchID, _ := c.Get("church_id").(string)
		if churchID != "" {
			var lvl int
			err2 := config.Tx(c).QueryRow(
				`SELECT role_level FROM module_user_roles
				 WHERE user_id = $1 AND module_key = 'education' AND church_id = $2 LIMIT 1`,
				userID, churchID,
			).Scan(&lvl)
			if err2 == nil {
				moduleLevel = lvl
			}
		}
	}

	return educationAccessInfo{userID: userID, level: moduleLevel}, nil
}

// upsertEducationModuleRole writes a user's education module role, scoped by
// church_id — mirrors upsertMusicModuleRole (music.go).
func upsertEducationModuleRole(db *sql.DB, userID string, level int, roleName, assignedBy, churchID string) error {
	if db == nil || userID == "" || churchID == "" {
		return fmt.Errorf("missing required arguments")
	}
	var assigner interface{}
	if assignedBy != "" {
		assigner = assignedBy
	}
	_, err := db.Exec(`
		INSERT INTO module_user_roles (church_id, user_id, module_key, role_level, role_name, assigned_by)
		VALUES ($1, $2, 'education', $3, $4, $5)
		ON CONFLICT (church_id, user_id, module_key)
		DO UPDATE SET role_level = EXCLUDED.role_level,
		              role_name  = EXCLUDED.role_name,
		              updated_at = now()
	`, churchID, userID, level, roleName, assigner)
	return err
}

func hasLessonBody(content, attachmentPath *string) bool {
	if content != nil && strings.TrimSpace(*content) != "" {
		return true
	}
	if attachmentPath != nil && strings.TrimSpace(*attachmentPath) != "" {
		return true
	}
	return false
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULA — CRUD
// ─────────────────────────────────────────────────────────────────────────────

// GetCurricula lists curricula for the caller's church. Level < 3 (student /
// no grant) only sees published curricula (spec: "Draft invisible").
func (h *EducationHandler) GetCurricula(c echo.Context) error {
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

	query := `
		SELECT ec.id, ec.name, ec.description, ec.cadence, ec.status,
		       COUNT(el.id) AS lesson_count,
		       ec.created_by::text,
		       to_char(ec.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(ec.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_curricula ec
		LEFT JOIN education_lessons el ON el.curriculum_id = ec.id
		WHERE ec.church_id = $1
	`
	if info.level < educationAuthorLevel {
		query += ` AND ec.status = 'published'`
	}
	query += `
		GROUP BY ec.id
		ORDER BY ec.name ASC
	`

	rows, err := q.Query(query, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener currículos"})
	}
	defer rows.Close()

	curricula := []models.EducationCurriculum{}
	for rows.Next() {
		var r models.EducationCurriculum
		var createdBy sql.NullString
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.Cadence, &r.Status, &r.LessonCount,
			&createdBy, &r.CreatedAt, &r.UpdatedAt); err != nil {
			continue
		}
		if createdBy.Valid {
			r.CreatedBy = &createdBy.String
		}
		curricula = append(curricula, r)
	}
	return c.JSON(http.StatusOK, curricula)
}

func (h *EducationHandler) GetCurriculumByID(c echo.Context) error {
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

	id := c.Param("id")
	var r models.EducationCurriculum
	var createdBy sql.NullString
	err = q.QueryRow(`
		SELECT ec.id, ec.name, ec.description, ec.cadence, ec.status,
		       (SELECT COUNT(*) FROM education_lessons el WHERE el.curriculum_id = ec.id) AS lesson_count,
		       ec.created_by::text,
		       to_char(ec.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(ec.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_curricula ec
		WHERE ec.id = $1 AND ec.church_id = $2
	`, id, churchID).Scan(&r.ID, &r.Name, &r.Description, &r.Cadence, &r.Status, &r.LessonCount,
		&createdBy, &r.CreatedAt, &r.UpdatedAt)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener currículo"})
	}
	if r.Status != "published" && info.level < educationAuthorLevel {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	if createdBy.Valid {
		r.CreatedBy = &createdBy.String
	}
	return c.JSON(http.StatusOK, r)
}

func (h *EducationHandler) CreateCurriculum(c echo.Context) error {
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
		Name        string  `json:"name"`
		Description *string `json:"description"`
		Cadence     string  `json:"cadence"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Name) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name es requerido"})
	}
	if req.Cadence == "" {
		req.Cadence = "weekly"
	}
	if !validEducationCadences[req.Cadence] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cadence inválida — valores: weekly, quarterly"})
	}

	var createdBy interface{}
	if callerID != "" {
		createdBy = callerID
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO education_curricula (name, description, cadence, church_id, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, strings.TrimSpace(req.Name), req.Description, req.Cadence, churchID, createdBy).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un currículo con ese nombre"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear currículo"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Currículo creado exitosamente"})
}

func (h *EducationHandler) UpdateCurriculum(c echo.Context) error {
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
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Cadence     *string `json:"cadence"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name no puede estar vacío"})
	}
	if req.Cadence != nil && !validEducationCadences[*req.Cadence] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cadence inválida — valores: weekly, quarterly"})
	}

	res, err := q.Exec(`
		UPDATE education_curricula
		SET name        = COALESCE($3, name),
		    description = COALESCE($4, description),
		    cadence     = COALESCE($5, cadence),
		    updated_at  = now()
		WHERE id = $1 AND church_id = $2
	`, id, churchID, req.Name, req.Description, req.Cadence)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un currículo con ese nombre"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar currículo"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Currículo actualizado"})
}

// UpdateCurriculumStatus handles publish/archive/unpublish transitions.
// Registered at level 3 (publish); moving to 'archived' or back to 'draft'
// from 'published' additionally requires level 5 (design D8/spec: "level 5 —
// archive/unpublish any curriculum").
func (h *EducationHandler) UpdateCurriculumStatus(c echo.Context) error {
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
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if !validEducationStatuses[req.Status] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "status inválido — valores: draft, published, archived"})
	}

	moduleLevel, _ := c.Get("module_role_level").(int)
	if (req.Status == "archived" || req.Status == "draft") && moduleLevel < educationAdminLevel {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error":   "Nivel insuficiente",
			"message": "Archivar o despublicar un currículo requiere nivel 5 en el módulo de educación",
		})
	}

	res, err := q.Exec(`
		UPDATE education_curricula SET status = $3, updated_at = now()
		WHERE id = $1 AND church_id = $2
	`, id, churchID, req.Status)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar estado del currículo"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Estado actualizado"})
}

func (h *EducationHandler) DeleteCurriculum(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM education_curricula WHERE id = $1 AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar currículo"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Currículo eliminado"})
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSONS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

// GetLessons lists lessons for a curriculum, ordered. Level < 3 users may only
// see lessons of a published curriculum (spec: "Draft invisible").
func (h *EducationHandler) GetLessons(c echo.Context) error {
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

	rows, err := q.Query(`
		SELECT id, curriculum_id, order_index, title, content, attachment_path, attachment_name,
		       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_lessons
		WHERE curriculum_id = $1 AND church_id = $2
		ORDER BY order_index ASC
	`, curriculumID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener lecciones"})
	}
	defer rows.Close()

	lessons := []models.EducationLesson{}
	for rows.Next() {
		var l models.EducationLesson
		if err := rows.Scan(&l.ID, &l.CurriculumID, &l.OrderIndex, &l.Title, &l.Content,
			&l.AttachmentPath, &l.AttachmentName, &l.CreatedAt, &l.UpdatedAt); err != nil {
			continue
		}
		lessons = append(lessons, l)
	}
	return c.JSON(http.StatusOK, lessons)
}

func (h *EducationHandler) CreateLesson(c echo.Context) error {
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
		Title          string  `json:"title"`
		Content        *string `json:"content"`
		AttachmentPath *string `json:"attachment_path"`
		AttachmentName *string `json:"attachment_name"`
		OrderIndex     *int    `json:"order_index"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Title) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "title es requerido"})
	}
	if !hasLessonBody(req.Content, req.AttachmentPath) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "La lección debe tener contenido, un adjunto, o ambos"})
	}
	if (req.AttachmentPath == nil) != (req.AttachmentName == nil) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "attachment_path y attachment_name deben venir juntos"})
	}

	var exists bool
	err = q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_curricula WHERE id = $1 AND church_id = $2)`, curriculumID, churchID).Scan(&exists)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar currículo"})
	}
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Currículo no encontrado"})
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	} else {
		if err := q.QueryRow(`SELECT COALESCE(MAX(order_index), 0) + 1 FROM education_lessons WHERE curriculum_id = $1`, curriculumID).Scan(&orderIndex); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al calcular posición"})
		}
	}
	if orderIndex <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "order_index debe ser mayor a 0"})
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO education_lessons (curriculum_id, church_id, order_index, title, content, attachment_path, attachment_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, curriculumID, churchID, orderIndex, strings.TrimSpace(req.Title), req.Content, req.AttachmentPath, req.AttachmentName).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe una lección en esa posición"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear lección"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Lección creada exitosamente"})
}

// UpdateLesson replaces title/content/attachment — PUT semantics (full
// replacement), matching UpdateEvent's convention in music.go.
func (h *EducationHandler) UpdateLesson(c echo.Context) error {
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
		Title          *string `json:"title"`
		Content        *string `json:"content"`
		AttachmentPath *string `json:"attachment_path"`
		AttachmentName *string `json:"attachment_name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Title != nil && strings.TrimSpace(*req.Title) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "title no puede estar vacío"})
	}
	if !hasLessonBody(req.Content, req.AttachmentPath) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "La lección debe tener contenido, un adjunto, o ambos"})
	}
	if (req.AttachmentPath == nil) != (req.AttachmentName == nil) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "attachment_path y attachment_name deben venir juntos"})
	}

	res, err := q.Exec(`
		UPDATE education_lessons
		SET title           = COALESCE($3, title),
		    content         = $4,
		    attachment_path = $5,
		    attachment_name = $6,
		    updated_at      = now()
		WHERE id = $1 AND church_id = $2
	`, id, churchID, req.Title, req.Content, req.AttachmentPath, req.AttachmentName)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar lección"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección actualizada"})
}

func (h *EducationHandler) DeleteLesson(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM education_lessons WHERE id = $1 AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar lección"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección eliminada"})
}

// ReorderLessons applies a new order_index for a batch of lessons within one
// curriculum, in a single transaction. `uq_education_lessons_order` is
// DEFERRABLE INITIALLY DEFERRED (design D6) so intermediate duplicate
// positions during the batch don't trip the UNIQUE constraint — it is only
// checked at COMMIT (TenantTx middleware commits after this handler returns).
func (h *EducationHandler) ReorderLessons(c echo.Context) error {
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
			ID         string `json:"id"`
			OrderIndex int    `json:"order_index"`
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
			UPDATE education_lessons SET order_index = $3, updated_at = now()
			WHERE id = $1 AND curriculum_id = $2 AND church_id = $4
		`, l.ID, curriculumID, l.OrderIndex, churchID)
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

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS / ROLES (level 5) — module_user_roles management
// ─────────────────────────────────────────────────────────────────────────────

// GetMembers lists users of the caller's church holding an education module
// role, plus their level/name — level 5 only (spec: level 5 "grant roles").
func (h *EducationHandler) GetMembers(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	rows, err := q.Query(`
		SELECT mur.user_id::text,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
		       u.email, mur.role_level, mur.role_name
		FROM module_user_roles mur
		JOIN users u ON u.id = mur.user_id AND u.church_id = $1
		WHERE mur.church_id = $1 AND mur.module_key = 'education'
		ORDER BY name ASC
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener miembros"})
	}
	defer rows.Close()

	members := []models.EducationMember{}
	for rows.Next() {
		var m models.EducationMember
		var email sql.NullString
		if err := rows.Scan(&m.UserID, &m.Name, &email, &m.RoleLevel, &m.RoleName); err != nil {
			continue
		}
		if email.Valid {
			m.Email = &email.String
		}
		members = append(members, m)
	}
	return c.JSON(http.StatusOK, members)
}

var educationRoleNames = map[int]string{
	educationStudentLevel: "Estudiante",
	educationAuthorLevel:  "Autor",
	educationAdminLevel:   "Administrador del módulo",
}

// UpdateMemberRole upserts a user's education module role level — level 5 only.
func (h *EducationHandler) UpdateMemberRole(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	callerID, _ := c.Get("user_id").(string)

	targetUserID := c.Param("userId")
	var req struct {
		RoleLevel int `json:"role_level"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	roleName, valid := educationRoleNames[req.RoleLevel]
	if !valid {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "role_level inválido — valores: 1 (estudiante), 3 (autor), 5 (administrador)"})
	}

	// Verify the target user belongs to the caller's church before granting.
	var exists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND church_id = $2)`, targetUserID, churchID).Scan(&exists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar usuario"})
	}
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Usuario no encontrado"})
	}

	if err := upsertEducationModuleRole(config.GetDB().DB, targetUserID, req.RoleLevel, roleName, callerID, churchID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al asignar rol"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Rol actualizado"})
}

// BulkGrantLeaders snapshots current discipleship_hierarchy level-1 users
// (líderes) at click time and grants them a level-1 (student) education role.
// Idempotent (ON CONFLICT upserts in place) and never downgrades a higher
// existing grant (spec: "Bulk líder grant (snapshot)"). Guarded so Education
// still works with Discipleship uninstalled — it only NAMES discipleship via
// a runtime to_regclass check, never imports discipleship models/types
// (design: "the ONLY education handler that names discipleship").
func (h *EducationHandler) BulkGrantLeaders(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	callerID, _ := c.Get("user_id").(string)

	var discipleshipInstalled bool
	if err := q.QueryRow(`SELECT to_regclass('public.discipleship_hierarchy') IS NOT NULL`).Scan(&discipleshipInstalled); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar disponibilidad de Discipulado"})
	}
	if !discipleshipInstalled {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"granted": 0,
			"message": "Discipulado no está disponible — no se otorgó ningún rol",
		})
	}

	rows, err := q.Query(`
		SELECT user_id::text FROM discipleship_hierarchy
		WHERE church_id = $1 AND hierarchy_level = 1
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al leer jerarquía de discipulado"})
	}
	leaderIDs := []string{}
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err != nil {
			continue
		}
		leaderIDs = append(leaderIDs, uid)
	}
	rows.Close()

	globalDB := config.GetDB().DB
	granted := 0
	for _, uid := range leaderIDs {
		// Never downgrade an existing higher grant (spec: "MUST NOT downgrade
		// higher grants") — only insert when absent, or when the existing
		// level is below student level.
		_, err := globalDB.Exec(`
			INSERT INTO module_user_roles (church_id, user_id, module_key, role_level, role_name, assigned_by)
			VALUES ($1, $2, 'education', $3, $4, $5)
			ON CONFLICT (church_id, user_id, module_key)
			DO UPDATE SET updated_at = now()
			WHERE module_user_roles.role_level < EXCLUDED.role_level
		`, churchID, uid, educationStudentLevel, educationRoleNames[educationStudentLevel], nullIfEmpty(callerID))
		if err != nil {
			continue
		}
		granted++
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"granted": granted,
		"message": fmt.Sprintf("%d líder(es) recibieron acceso de estudiante en Educación", granted),
	})
}
