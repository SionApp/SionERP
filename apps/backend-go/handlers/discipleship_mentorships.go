package handlers

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"

	"backend-sion/config"
)

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLESHIP MENTORSHIPS — Slice 2 (disciple-maker).
//
// Same DiscipleshipHandler receiver as discipleship.go/discipleship_journey.go
// — split into its own file, mirroring the Slice 1 convention.
//
// A mentorship is a mentor↔mentee link scoped to one cell group (product
// decision #579 / spec R3, R4). A mentor may have several active mentees at
// once; a mentee may only have one active mentor at a time (enforced by the
// partial unique index uq_mentorship_active_mentee, not just app logic).
// journeyStageSQL reads this table's active rows to derive "disciple_maker"
// (see discipleship_journey.go) — this file only owns the write door + the
// group-scoped list/count read.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ──────────────────────────────────────────────────────────────────

// Mentorship — one mentor↔mentee row, as returned by the list endpoint.
type Mentorship struct {
	ID           string  `json:"id"`
	GroupID      string  `json:"group_id"`
	MentorUserID string  `json:"mentor_user_id"`
	MentorName   string  `json:"mentor_name"`
	MenteeUserID string  `json:"mentee_user_id"`
	MenteeName   string  `json:"mentee_name"`
	Status       string  `json:"status"`
	StartedAt    string  `json:"started_at"`
	EndedAt      *string `json:"ended_at"`
}

// CreateMentorshipRequest — POST /discipleship/groups/:id/mentorships body.
type CreateMentorshipRequest struct {
	MentorUserID string `json:"mentor_user_id" validate:"required,uuid"`
	MenteeUserID string `json:"mentee_user_id" validate:"required,uuid"`
}

// ─── Handlers ───────────────────────────────────────────────────────────────

// CreateMentorship — POST /discipleship/groups/:id/mentorships
// Gated DiscipleshipLevelAuxiliary (supervisor+, matches the ConvertVisitor /
// CreateJourneyEntry manual-door gating in this same module). Validates
// mentor ≠ mentee, and that BOTH are active members of the group (spec R3);
// the one-active-mentor-per-mentee invariant (spec R2) is enforced by the
// database's partial unique index — a 23505 on it maps to 409, not 500.
func (h *DiscipleshipHandler) CreateMentorship(c echo.Context) error {
	groupID := c.Param("id")
	var req CreateMentorshipRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}
	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Validación fallida: " + err.Error()})
	}
	if req.MentorUserID == req.MenteeUserID {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "el discipulador y el discípulo no pueden ser la misma persona"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	var groupExists bool
	if err := q.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM discipleship_groups WHERE id = $1 AND church_id = $2)`,
		groupID, churchID,
	).Scan(&groupExists); err != nil {
		c.Logger().Error("Error validating group for mentorship:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al validar el grupo"})
	}
	if !groupExists {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "grupo no encontrado en esta iglesia"})
	}

	// Same-group invariant (spec R3): both mentor and mentee must be active
	// members of THIS group — checked against discipleship_group_members, not
	// assumed from the request.
	var activeCount int
	if err := q.QueryRow(`
		SELECT COUNT(*) FROM discipleship_group_members
		WHERE group_id = $1 AND church_id = $2 AND is_active = true
		  AND user_id IN ($3, $4)
	`, groupID, churchID, req.MentorUserID, req.MenteeUserID).Scan(&activeCount); err != nil {
		c.Logger().Error("Error validating group membership for mentorship:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al validar la membresía del grupo"})
	}
	if activeCount != 2 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "el discipulador y el discípulo deben ser miembros activos de este grupo"})
	}

	var mentorshipID string
	err = q.QueryRow(`
		INSERT INTO discipleship_mentorships (church_id, group_id, mentor_user_id, mentee_user_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, churchID, groupID, req.MentorUserID, req.MenteeUserID).Scan(&mentorshipID)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			if pqErr.Constraint == "uq_mentorship_active_mentee" {
				return c.JSON(http.StatusConflict, map[string]string{"error": "este discípulo ya tiene un discipulador activo"})
			}
			return c.JSON(http.StatusConflict, map[string]string{"error": "esta pareja de discipulado ya existe"})
		}
		c.Logger().Error("Error creating mentorship:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear el vínculo de discipulado"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":      mentorshipID,
		"message": "Vínculo de discipulado creado exitosamente",
	})
}

// EndMentorship — DELETE /discipleship/mentorships/:id
// Gated DiscipleshipLevelAuxiliary (same as create). Soft-ends the row
// (status→'ended', ended_at=now()) — never deletes it (audit trail). Once
// zero active mentorships remain for a mentor, journeyStageSQL naturally
// stops deriving disciple_maker for them (spec R4) — no extra bookkeeping
// needed here.
func (h *DiscipleshipHandler) EndMentorship(c echo.Context) error {
	mentorshipID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	result, err := q.Exec(`
		UPDATE discipleship_mentorships
		SET status = 'ended', ended_at = now()
		WHERE id = $1 AND church_id = $2 AND status = 'active'
	`, mentorshipID, churchID)
	if err != nil {
		c.Logger().Error("Error ending mentorship:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al finalizar el vínculo de discipulado"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "vínculo de discipulado no encontrado o ya finalizado"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Vínculo de discipulado finalizado"})
}

// ListGroupMentorships — GET /discipleship/groups/:id/mentorships
// Group-default read level (mirrors GetGroupAttendance/GetGroupMembers):
// canSeeAll (coordinator+) or hierarchy-scoped access to THIS group. Returns
// the group's active mentorship pairs plus the count (spec R6 — the leader's
// "weekly report" IS this live-derived count, not a per-mentee form).
func (h *DiscipleshipHandler) ListGroupMentorships(c echo.Context) error {
	groupID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado",
		})
	}

	if !canSeeAll {
		var leaderID, supervisorID sql.NullString
		var groupZoneID sql.NullString
		err = q.QueryRow(
			`SELECT leader_id, supervisor_id, zone_id FROM discipleship_groups WHERE id = $1 AND church_id = $2`,
			groupID, churchID,
		).Scan(&leaderID, &supervisorID, &groupZoneID)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusNotFound, map[string]string{"error": "Grupo no encontrado"})
			}
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar acceso al grupo"})
		}

		hasAccess := false
		switch *hierarchyLevel {
		case 4, 5:
			hasAccess = true
		case 3:
			hasAccess = groupZoneID.Valid && userZoneID != nil && groupZoneID.String == *userZoneID
		case 2:
			hasAccess = supervisorID.Valid && supervisorID.String == callerID
		case 1:
			hasAccess = leaderID.Valid && leaderID.String == callerID
		}

		if !hasAccess {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes acceso a los vínculos de discipulado de este grupo",
			})
		}
	}

	rows, err := q.Query(`
		SELECT m.id, m.group_id, m.mentor_user_id, m.mentee_user_id, m.status,
		       to_char(m.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(m.ended_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       COALESCE(mentor.first_name || ' ' || mentor.last_name, 'Sin nombre'),
		       COALESCE(mentee.first_name || ' ' || mentee.last_name, 'Sin nombre')
		FROM discipleship_mentorships m
		LEFT JOIN users mentor ON mentor.id = m.mentor_user_id AND mentor.church_id = $2
		LEFT JOIN users mentee ON mentee.id = m.mentee_user_id AND mentee.church_id = $2
		WHERE m.group_id = $1 AND m.church_id = $2 AND m.status = 'active'
		ORDER BY m.started_at ASC
	`, groupID, churchID)
	if err != nil {
		c.Logger().Error("Error fetching group mentorships:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener los vínculos de discipulado"})
	}
	defer rows.Close()

	mentorships := []Mentorship{}
	for rows.Next() {
		var m Mentorship
		var endedAt sql.NullString
		if err := rows.Scan(&m.ID, &m.GroupID, &m.MentorUserID, &m.MenteeUserID, &m.Status,
			&m.StartedAt, &endedAt, &m.MentorName, &m.MenteeName); err != nil {
			c.Logger().Error("Error scanning mentorship:", err)
			continue
		}
		if endedAt.Valid {
			m.EndedAt = &endedAt.String
		}
		mentorships = append(mentorships, m)
	}
	if err := rows.Err(); err != nil {
		c.Logger().Error("Error iterating mentorships:", err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"mentorships": mentorships,
		"count":       len(mentorships),
	})
}
