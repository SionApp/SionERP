package handlers

import (
	"database/sql"
	"net/http"

	"backend-sion/models"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// LESSON BOOKMARKS (small follow-up to the design-handoff chain — README.md
// line 247 named a "Guardar" pill with zero behavioral spec; this closes that
// gap per an explicit user decision). Self-only write, self-only read — same
// self-service, `user_id = caller` scoping convention as
// education_reflections.go/UpsertReflection and education_steps.go's
// UpdateLessonPosition. Entirely independent of education_lesson_progress /
// education_assignments (completion tracking) — a personal "come back to
// this later" list, not a progress signal.
//
// Both write endpoints are deliberately idempotent (spec: "calling it twice
// on an already-bookmarked/already-unbookmarked lesson should just succeed,
// not error") — BookmarkLesson relies on the table's own UNIQUE constraint
// via `ON CONFLICT DO NOTHING` (never an app-level pre-check), and
// UnbookmarkLesson simply ignores a zero-row DELETE.
// ─────────────────────────────────────────────────────────────────────────────

// BookmarkLesson creates the CALLER's own bookmark for one lesson —
// idempotent (ON CONFLICT DO NOTHING on the (church_id, user_id, lesson_id)
// unique constraint). 404 when the lesson doesn't exist in this church,
// matching the module's established "existence not leaked" convention.
func (h *EducationHandler) BookmarkLesson(c echo.Context) error {
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
	var lessonExists bool
	if err := q.QueryRow(`SELECT EXISTS(SELECT 1 FROM education_lessons WHERE id = $1 AND church_id = $2)`,
		lessonID, churchID).Scan(&lessonExists); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar lección"})
	}
	if !lessonExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Lección no encontrada"})
	}

	if _, err := q.Exec(`
		INSERT INTO education_lesson_bookmarks (church_id, user_id, lesson_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (church_id, user_id, lesson_id) DO NOTHING
	`, churchID, userID, lessonID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar la lección"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección guardada"})
}

// UnbookmarkLesson removes the CALLER's own bookmark for one lesson —
// idempotent (a zero-row DELETE, e.g. a bookmark already removed or never
// created, still succeeds).
func (h *EducationHandler) UnbookmarkLesson(c echo.Context) error {
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
	if _, err := q.Exec(`
		DELETE FROM education_lesson_bookmarks WHERE church_id = $1 AND user_id = $2 AND lesson_id = $3
	`, churchID, userID, lessonID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al quitar la lección guardada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Lección quitada de guardados"})
}

// GetMyBookmarks lists the CALLER's own bookmarked lessons, newest first,
// joined with enough lesson/curriculum/module data for StudentHome's
// "Lecciones guardadas" card to render without a second round trip. A
// bookmark pointing at a lesson that no longer exists is impossible by
// construction (ON DELETE CASCADE from education_lessons — see the
// migration), but the INNER JOINs below are the defensive belt-and-braces:
// if a lesson or curriculum row were ever hard-deleted through some other
// path, the join naturally drops that bookmark from the result instead of
// erroring, so a stale bookmark can never 500 this endpoint or the card.
func (h *EducationHandler) GetMyBookmarks(c echo.Context) error {
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

	rows, err := q.Query(`
		SELECT b.id, l.id, l.title, cu.id, cu.name, m.title,
		       to_char(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM education_lesson_bookmarks b
		JOIN education_lessons l ON l.id = b.lesson_id AND l.church_id = b.church_id
		JOIN education_curricula cu ON cu.id = l.curriculum_id AND cu.church_id = b.church_id
		LEFT JOIN education_course_modules m ON m.id = l.module_id AND m.church_id = b.church_id
		WHERE b.church_id = $1 AND b.user_id = $2
		ORDER BY b.created_at DESC
	`, churchID, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener lecciones guardadas"})
	}
	defer rows.Close()

	bookmarks := []models.EducationLessonBookmark{}
	for rows.Next() {
		var b models.EducationLessonBookmark
		var moduleTitle sql.NullString
		if err := rows.Scan(&b.ID, &b.LessonID, &b.LessonTitle, &b.CurriculumID, &b.CurriculumName, &moduleTitle, &b.CreatedAt); err != nil {
			continue
		}
		if moduleTitle.Valid {
			b.ModuleTitle = &moduleTitle.String
		}
		bookmarks = append(bookmarks, b)
	}
	return c.JSON(http.StatusOK, bookmarks)
}
