package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
)

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLESHIP MEMBER JOURNEY — Slice 1 (backbone).
//
// Same DiscipleshipHandler receiver as discipleship.go/discipleship_visitors.go
// — split into its own file to keep discipleship.go from growing unbounded
// (mirrors education_catalog.go being split from education.go with the same
// EducationHandler receiver).
//
// Design D2: stage (new_convert / disciple / disciple_maker) is DERIVED at
// read time and never stored; activity (active / inactive) IS stored and
// leader-marked — a deliberate asymmetry (product decision r2: attendance
// can't drive it because discipleship_attendance is keyed by group_id, and a
// manually-anchored convert may have no group).
//
// One-way dependency: this file reads education_assignments/education_curricula
// but never imports an Education handler/service type, and no Education file
// is modified by this change (see the migration's G1 comment for the single
// justified exception — an additive index).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ──────────────────────────────────────────────────────────────────

// DiscipleshipSettings — the church-level conversion-path curriculum pointer.
type DiscipleshipSettings struct {
	ConversionPathCurriculumID *string `json:"conversion_path_curriculum_id"`
}

// UpdateDiscipleshipSettingsRequest — PUT /discipleship/settings body.
// ConversionPathCurriculumID is a pointer so `null` (clear the pointer) is
// distinguishable from "field omitted" (Bind leaves the pointer nil either
// way, which is fine here: PUT is a full replace of the one nullable field).
type UpdateDiscipleshipSettingsRequest struct {
	ConversionPathCurriculumID *string `json:"conversion_path_curriculum_id"`
}

// JourneyEntry — one member's anchor + derived stage, as returned by the
// batch GET /discipleship/journey?user_ids= endpoint. Members with no anchor
// row simply do not appear in the response slice — the frontend renders
// "not tracked" for any requested user_id it does not find (spec: Not-Tracked
// Rendering — no anchor must never be mislabeled as a stage).
type JourneyEntry struct {
	UserID             string  `json:"user_id"`
	Origin             string  `json:"origin"`
	ActivityStatus     string  `json:"activity_status"`
	ActivityChangedAt  string  `json:"activity_changed_at"`
	ConvertedAt        *string `json:"converted_at"`
	Stage              string  `json:"stage"`
	AssignmentID       *string `json:"assignment_id"`
	AssignmentCurricID *string `json:"curriculum_id"`
}

// UpdateJourneyActivityRequest — PUT /discipleship/journey/:userId/activity body.
type UpdateJourneyActivityRequest struct {
	ActivityStatus string `json:"activity_status" validate:"required,oneof=active inactive"`
}

// ─── Journey stage derivation (design G3) ──────────────────────────────────
//
// journeyStageSQL implements the read-time stage derivation:
//   - anchor + a path assignment with completed_at set  → "disciple"
//   - anchor only (no completed path assignment)         → "new_convert"
//   - "disciple_maker" is structurally reachable (spec: Derived Stage) once
//     an active-mentorship signal exists, but Slice 1 has no mentorship
//     entity (that's Slice 2) so this query never emits it.
//
// The LATERAL join's precedence — tagged row first, ORDER BY (source_module =
// 'discipleship') DESC NULLS LAST LIMIT 1 — is what lets a pointer swap never
// demote an already-tagged convert (spec: "Pointer swap does not retroact"):
// the tagged arm is pointer-independent, and only the untagged fallback arm
// depends on discipleship_settings.conversion_path_curriculum_id. G1's partial
// unique index is what makes "at most one tagged row" a real invariant rather
// than an assumption this query relies on blindly.
//
// NULLS LAST is load-bearing, not cosmetic. The fallback row has
// source_module IS NULL, so `(NULL = 'discipleship')` evaluates to NULL — and
// Postgres orders NULLs FIRST under DESC by default, which silently ranked
// the untagged fallback ABOVE the tagged row and inverted the precedence.
// TestDiscipleshipJourneyIsolationFallbackArmPrecedence guards this.
//
// completed_at here is education_assignments.completed_at (the aggregate
// field EducationHandler.recomputeAssignmentCompletion maintains from
// education_lesson_progress) — NOT a raw education_lesson_progress row, so
// the "elp.completed_at IS NOT NULL" completion-semantics guard that Education
// applies internally does not need to be repeated here; it already governs
// how ea.completed_at gets set in the first place. This query only reads the
// already-derived assignment-level field.
const journeyStageSQL = `
	SELECT j.id, j.user_id, j.origin, j.activity_status,
	       to_char(j.activity_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       to_char(j.converted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	       ea.id, ea.curriculum_id, ea.completed_at
	FROM discipleship_journey j
	LEFT JOIN discipleship_settings s ON s.church_id = j.church_id
	LEFT JOIN LATERAL (
	  SELECT ea.id, ea.curriculum_id, ea.completed_at
	  FROM education_assignments ea
	  WHERE ea.church_id = j.church_id
	    AND ( (ea.source_module = 'discipleship' AND ea.source_ref_id = j.id)
	       OR (ea.source_module IS NULL AND ea.assigned_to = j.user_id
	           AND ea.curriculum_id = s.conversion_path_curriculum_id) )
	  ORDER BY (ea.source_module = 'discipleship') DESC NULLS LAST
	  LIMIT 1
	) ea ON true
	WHERE j.church_id = $1 AND j.user_id = ANY($2)
`

// scanJourneyEntry scans one journeyStageSQL row and derives stage.
func scanJourneyEntry(rows interface {
	Scan(dest ...interface{}) error
}) (JourneyEntry, error) {
	var e JourneyEntry
	var anchorID string
	var convertedAt sql.NullString
	var assignmentID, curriculumID sql.NullString
	var completedAt sql.NullTime
	if err := rows.Scan(&anchorID, &e.UserID, &e.Origin, &e.ActivityStatus,
		&e.ActivityChangedAt, &convertedAt, &assignmentID, &curriculumID, &completedAt); err != nil {
		return e, err
	}
	if convertedAt.Valid {
		e.ConvertedAt = &convertedAt.String
	}
	if assignmentID.Valid {
		e.AssignmentID = &assignmentID.String
	}
	if curriculumID.Valid {
		e.AssignmentCurricID = &curriculumID.String
	}
	if completedAt.Valid {
		e.Stage = "disciple"
	} else {
		e.Stage = "new_convert"
	}
	return e, nil
}

// ─── Handlers ───────────────────────────────────────────────────────────────

// GetDiscipleshipSettings — GET /discipleship/settings
// Group-default level (any authenticated discipleship-module member): the
// pointer is read-only context for the conversion flow, not sensitive config.
func (h *DiscipleshipHandler) GetDiscipleshipSettings(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	var settings DiscipleshipSettings
	var curriculumID sql.NullString
	err = q.QueryRow(`
		SELECT conversion_path_curriculum_id FROM discipleship_settings WHERE church_id = $1
	`, churchID).Scan(&curriculumID)
	if err == sql.ErrNoRows {
		// No settings row yet — pointer defaults to unset, not an error.
		return c.JSON(http.StatusOK, settings)
	}
	if err != nil {
		c.Logger().Error("Error fetching discipleship settings:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener la configuración de discipulado"})
	}
	if curriculumID.Valid {
		settings.ConversionPathCurriculumID = &curriculumID.String
	}
	return c.JSON(http.StatusOK, settings)
}

// UpdateDiscipleshipSettings — PUT /discipleship/settings
// Pastoral-only (church-wide config, spec: "Pastor sets the pointer").
func (h *DiscipleshipHandler) UpdateDiscipleshipSettings(c echo.Context) error {
	var req UpdateDiscipleshipSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	if req.ConversionPathCurriculumID != nil {
		var exists bool
		if err := q.QueryRow(
			`SELECT EXISTS(SELECT 1 FROM education_curricula WHERE id = $1 AND church_id = $2)`,
			*req.ConversionPathCurriculumID, churchID,
		).Scan(&exists); err != nil {
			c.Logger().Error("Error validating curriculum:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al validar el curso"})
		}
		if !exists {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "curso no encontrado en esta iglesia"})
		}
	}

	_, err = q.Exec(`
		INSERT INTO discipleship_settings (church_id, conversion_path_curriculum_id)
		VALUES ($1, $2)
		ON CONFLICT (church_id) DO UPDATE SET
			conversion_path_curriculum_id = EXCLUDED.conversion_path_curriculum_id
	`, churchID, req.ConversionPathCurriculumID)
	if err != nil {
		c.Logger().Error("Error updating discipleship settings:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar la configuración"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Configuración actualizada exitosamente"})
}

// GetJourney — GET /discipleship/journey?user_ids=<uuid>,<uuid>,...
// Group-default level: batch anchors + derived stage for a set of members.
func (h *DiscipleshipHandler) GetJourney(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	raw := strings.Split(c.QueryParam("user_ids"), ",")
	userIDs := make([]string, 0, len(raw))
	for _, id := range raw {
		trimmed := strings.TrimSpace(id)
		if trimmed != "" {
			userIDs = append(userIDs, trimmed)
		}
	}
	if len(userIDs) == 0 {
		return c.JSON(http.StatusOK, []JourneyEntry{})
	}

	rows, err := q.Query(journeyStageSQL, churchID, pq.Array(userIDs))
	if err != nil {
		c.Logger().Error("Error fetching journey:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener el camino de discipulado"})
	}
	defer rows.Close()

	entries := []JourneyEntry{}
	for rows.Next() {
		entry, err := scanJourneyEntry(rows)
		if err != nil {
			c.Logger().Error("Error scanning journey entry:", err)
			continue
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		c.Logger().Error("Error iterating journey entries:", err)
	}
	return c.JSON(http.StatusOK, entries)
}

// UpdateJourneyActivity — PUT /discipleship/journey/:userId/activity
// Leader-marked (product decision r2 — NOT derived from attendance). Never
// creates an anchor: activity can only be flipped on a user who already
// entered the journey via the conversion or manual door (PR-2).
func (h *DiscipleshipHandler) UpdateJourneyActivity(c echo.Context) error {
	var req UpdateJourneyActivityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}
	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Validación fallida: " + err.Error()})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	userID := c.Param("userId")

	// activity_changed_at only moves on an actual transition — referencing
	// activity_status on the right side of its own SET evaluates against the
	// pre-update row value, so this is the same "CASE guard" idiom the design
	// specifies for the conversion/manual-door upserts (G2), just expressed as
	// a plain UPDATE instead of an ON CONFLICT DO UPDATE.
	result, err := q.Exec(`
		UPDATE discipleship_journey SET
			activity_status = $3,
			activity_changed_at = CASE WHEN activity_status <> $3 THEN now() ELSE activity_changed_at END
		WHERE church_id = $1 AND user_id = $2
	`, churchID, userID, req.ActivityStatus)
	if err != nil {
		c.Logger().Error("Error updating journey activity:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar la actividad"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "este miembro todavía no tiene un ancla de discipulado"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Actividad actualizada exitosamente"})
}
