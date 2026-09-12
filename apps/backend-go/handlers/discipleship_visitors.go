package handlers

import (
	"backend-sion/config"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// ─── Types ──────────────────────────────────────────────────────────────────

type Visitor struct {
	ID              string  `json:"id"`
	GroupID         *string `json:"group_id"`
	FirstName       string  `json:"first_name"`
	LastName        string  `json:"last_name"`
	Phone           *string `json:"phone"`
	InvitedBy       *string `json:"invited_by"`
	InvitedByName   string  `json:"invited_by_name"`
	FirstVisitDate  string  `json:"first_visit_date"`
	Status          string  `json:"status"`
	ConvertedUserID *string `json:"converted_user_id"`
	Notes           *string `json:"notes"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

type CreateVisitorRequest struct {
	GroupID        string `json:"group_id" validate:"required"`
	FirstName      string `json:"first_name" validate:"required"`
	LastName       string `json:"last_name"`
	Phone          string `json:"phone"`
	InvitedBy      string `json:"invited_by"`
	FirstVisitDate string `json:"first_visit_date"`
	Notes          string `json:"notes"`
}

type UpdateVisitorRequest struct {
	Status          string `json:"status" validate:"required,oneof=new following_up converted inactive"`
	ConvertedUserID string `json:"converted_user_id"`
	Notes           string `json:"notes"`
}

// ConvertVisitorRequest — POST /discipleship/visitors/:id/convert body.
// Design G4: identity matching is staff-driven, never implicit.
//   - UserID set  → link an existing member (verified in-church + active;
//     name/phone/email/role are never overwritten).
//   - UserID empty → create a new member; Email is optional (synthetic
//     `convert+<visitor_id>@no-email.local` is used when omitted).
type ConvertVisitorRequest struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

// errAssignmentTaggedToAnotherJourney is the sentinel ensurePathAssignment
// returns when step 5's fallback SELECT finds an assignment row tagged to a
// DIFFERENT journey than the one being processed — an integrity anomaly
// (uq_discipleship_journey_user makes this unreachable in normal operation),
// mapped by callers to 409, never silently passed through.
var errAssignmentTaggedToAnotherJourney = errors.New("education_assignments row is tagged to a different journey")

// ─── Handlers ───────────────────────────────────────────────────────────────

// GetGroupVisitors — GET /discipleship/groups/:id/visitors
func (h *DiscipleshipHandler) GetGroupVisitors(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	groupID := c.Param("id")

	rows, err := q.Query(`
		SELECT v.id, v.group_id, v.first_name, v.last_name, v.phone, v.invited_by,
			COALESCE(u.first_name || ' ' || u.last_name, '') as invited_by_name,
			v.first_visit_date::text, v.status, v.converted_user_id, v.notes,
			v.created_at::text, v.updated_at::text
		FROM discipleship_visitors v
		LEFT JOIN users u ON v.invited_by = u.id AND u.church_id = v.church_id
		WHERE v.church_id = $1 AND v.group_id = $2
		ORDER BY v.first_visit_date DESC
	`, churchID, groupID)
	if err != nil {
		c.Logger().Error("Error fetching visitors:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener visitantes"})
	}
	defer rows.Close()

	visitors := []Visitor{}
	for rows.Next() {
		var v Visitor
		if err := rows.Scan(&v.ID, &v.GroupID, &v.FirstName, &v.LastName, &v.Phone, &v.InvitedBy,
			&v.InvitedByName, &v.FirstVisitDate, &v.Status, &v.ConvertedUserID, &v.Notes,
			&v.CreatedAt, &v.UpdatedAt); err != nil {
			continue
		}
		visitors = append(visitors, v)
	}
	if err := rows.Err(); err != nil {
		c.Logger().Error("Error iterating visitors:", err)
	}
	return c.JSON(http.StatusOK, visitors)
}

// CreateVisitor — POST /discipleship/groups/:id/visitors
func (h *DiscipleshipHandler) CreateVisitor(c echo.Context) error {
	var req CreateVisitorRequest
	req.GroupID = c.Param("id")
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}
	req.GroupID = c.Param("id") // el bind puede pisarlo si el body trae group_id; la ruta manda
	if req.FirstName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "El nombre es requerido"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	var exists bool
	q.QueryRow("SELECT EXISTS(SELECT 1 FROM discipleship_groups WHERE id = $1 AND church_id = $2)", req.GroupID, churchID).Scan(&exists)
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "grupo no encontrado"})
	}

	var newID string
	err = q.QueryRow(`
		INSERT INTO discipleship_visitors (
			church_id, group_id, first_name, last_name, phone, invited_by, first_visit_date, notes
		) VALUES ($1, $2, $3, $4, $5, $6, COALESCE(NULLIF($7, '')::date, CURRENT_DATE), $8)
		RETURNING id
	`, churchID, req.GroupID, req.FirstName, nullIfEmpty(req.LastName), nullIfEmpty(req.Phone),
		nullIfEmpty(req.InvitedBy), req.FirstVisitDate, nullIfEmpty(req.Notes),
	).Scan(&newID)
	if err != nil {
		c.Logger().Error("Error creating visitor:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al registrar el visitante"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"id": newID, "message": "Visitante registrado exitosamente"})
}

// ensurePathAssignment implements design G2: the ONE helper both entry doors
// (ConvertVisitor, the manual door in discipleship_journey.go) call to
// enroll a journey into the church's curriculum pointer. No branch may
// return a 2xx with an empty assignment id — TenantTx (middleware/tenant.go)
// rolls back the whole request on any non-2xx, so every failure path here
// returns a non-nil error and every success path returns a non-nil id.
//
// Contract: pathConfigured == true implies assignmentID != nil. Callers MUST
// assert this before responding 2xx (defensive — this function itself never
// violates it, but the invariant is cheap to double-check at the call site).
//
//  1. Already tagged to this journey → idempotent short-circuit (re-running
//     conversion/manual-entry never creates a second tagged row — G1).
//  2. No curriculum pointer configured → degrade, never fail.
//  3. INSERT the tagged assignment; ON CONFLICT DO NOTHING covers the case
//     where (church, curriculum, assigned_to) already has a row.
//  4. ADOPT an untagged self-enrollment on the same curriculum — never
//     overwrites a non-NULL tag (WHERE source_module IS NULL).
//  5. FALLBACK SELECT: the row exists tagged to ANOTHER journey (or step 4
//     lost a race) → 409 via errAssignmentTaggedToAnotherJourney, or a
//     genuinely lost race → error (500).
func ensurePathAssignment(q config.Querier, churchID, journeyID, userID, actorID string) (*string, bool, error) {
	var existingID string
	err := q.QueryRow(`
		SELECT id FROM education_assignments
		WHERE church_id = $1 AND source_module = 'discipleship' AND source_ref_id = $2
	`, churchID, journeyID).Scan(&existingID)
	if err == nil {
		return &existingID, true, nil
	}
	if err != sql.ErrNoRows {
		return nil, false, fmt.Errorf("ensurePathAssignment: check existing tag: %w", err)
	}

	var curriculumID sql.NullString
	err = q.QueryRow(`
		SELECT conversion_path_curriculum_id FROM discipleship_settings WHERE church_id = $1
	`, churchID).Scan(&curriculumID)
	if err != nil && err != sql.ErrNoRows {
		return nil, false, fmt.Errorf("ensurePathAssignment: read pointer: %w", err)
	}
	if !curriculumID.Valid {
		return nil, false, nil
	}

	var insertedID string
	err = q.QueryRow(`
		INSERT INTO education_assignments (church_id, curriculum_id, assigned_to, assigned_by, source_module, source_ref_id)
		VALUES ($1, $2, $3, $4, 'discipleship', $5)
		ON CONFLICT ON CONSTRAINT uq_education_assignments DO NOTHING
		RETURNING id
	`, churchID, curriculumID.String, userID, nullIfEmpty(actorID), journeyID).Scan(&insertedID)
	if err == nil {
		return &insertedID, true, nil
	}
	if err != sql.ErrNoRows {
		return nil, false, fmt.Errorf("ensurePathAssignment: insert tagged assignment: %w", err)
	}

	var adoptedID string
	err = q.QueryRow(`
		UPDATE education_assignments
		SET source_module = 'discipleship', source_ref_id = $4
		WHERE church_id = $1 AND curriculum_id = $2 AND assigned_to = $3 AND source_module IS NULL
		RETURNING id
	`, churchID, curriculumID.String, userID, journeyID).Scan(&adoptedID)
	if err == nil {
		return &adoptedID, true, nil
	}
	if err != sql.ErrNoRows {
		return nil, false, fmt.Errorf("ensurePathAssignment: adopt untagged assignment: %w", err)
	}

	var fallbackID string
	var fallbackRef sql.NullString
	err = q.QueryRow(`
		SELECT id, source_ref_id FROM education_assignments
		WHERE church_id = $1 AND curriculum_id = $2 AND assigned_to = $3
	`, churchID, curriculumID.String, userID).Scan(&fallbackID, &fallbackRef)
	if err == sql.ErrNoRows {
		return nil, false, fmt.Errorf("ensurePathAssignment: lost race — no assignment row found after insert/adopt attempts")
	}
	if err != nil {
		return nil, false, fmt.Errorf("ensurePathAssignment: fallback select: %w", err)
	}
	if fallbackRef.Valid && fallbackRef.String == journeyID {
		return &fallbackID, true, nil
	}
	return nil, false, errAssignmentTaggedToAnotherJourney
}

// ConvertVisitor — POST /discipleship/visitors/:id/convert
// Gated DiscipleshipLevelAuxiliary (supervisor or above — product decision
// r2, changed from the design's original Leader assumption). Provisions a
// real users row (or links an existing one), upserts the journey anchor,
// and enrolls via ensurePathAssignment — all in the single per-request tx
// TenantTx already manages, so any failure rolls the whole conversion back.
func (h *DiscipleshipHandler) ConvertVisitor(c echo.Context) error {
	var req ConvertVisitorRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	actorID, _ := c.Get("user_id").(string)
	visitorID := c.Param("id")

	var firstName, lastName string
	var phone, existingUserID sql.NullString
	err = q.QueryRow(`
		SELECT first_name, last_name, phone, converted_user_id
		FROM discipleship_visitors
		WHERE id = $1 AND church_id = $2
	`, visitorID, churchID).Scan(&firstName, &lastName, &phone, &existingUserID)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "visitante no encontrado"})
	}
	if err != nil {
		c.Logger().Error("Error fetching visitor for conversion:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener el visitante"})
	}

	// Idempotency (spec: "Double conversion is idempotent"): a visitor already
	// linked to a user reuses that link unconditionally — no duplicate user is
	// ever created, and the caller's payload for THIS call is not required to
	// match the first call's.
	var userID string
	switch {
	case existingUserID.Valid:
		userID = existingUserID.String
	case strings.TrimSpace(req.UserID) != "":
		// Link existing — design G4: verify in-church + active; never touch
		// first_name/last_name/phone/email/role on the linked row.
		var isActive bool
		err = q.QueryRow(`SELECT is_active FROM users WHERE id = $1 AND church_id = $2`, req.UserID, churchID).Scan(&isActive)
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "el miembro seleccionado no existe en esta iglesia"})
		}
		if err != nil {
			c.Logger().Error("Error validating linked user for conversion:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al validar el miembro"})
		}
		if !isActive {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "el miembro seleccionado no está activo"})
		}
		userID = req.UserID
	default:
		// Create-new. Email lowercased before insert (the surviving
		// users_church_id_email_key constraint is case-sensitive — the
		// functional LOWER(email) index was dropped in
		// 20260624000200_phase2a_tenant_schema_group_a.sql).
		email := strings.ToLower(strings.TrimSpace(req.Email))
		if email == "" {
			email = fmt.Sprintf("convert+%s@no-email.local", visitorID)
		}
		phoneVal := "N/A"
		if phone.Valid && strings.TrimSpace(phone.String) != "" {
			phoneVal = phone.String
		}
		idNumber := "CONVERT-" + visitorID
		if len(idNumber) > 40 {
			idNumber = idNumber[:40]
		}
		err = q.QueryRow(`
			INSERT INTO users (church_id, first_name, last_name, phone, address, id_number, email, role, is_active, is_active_member)
			VALUES ($1, $2, $3, $4, 'N/A', $5, $6, 'member', true, true)
			ON CONFLICT ON CONSTRAINT users_church_id_email_key DO UPDATE SET email = EXCLUDED.email
			RETURNING id
		`, churchID, firstName, lastName, phoneVal, idNumber, email).Scan(&userID)
		if err != nil {
			c.Logger().Error("Error creating user from visitor:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear el usuario"})
		}
	}

	// Anchor upsert (design G2): always-RETURNING DO UPDATE, never DO NOTHING
	// — re-conversion means the person is back, so activity flips to active
	// without creating a second anchor.
	var journeyID string
	err = q.QueryRow(`
		INSERT INTO discipleship_journey (church_id, user_id, origin, converted_at)
		VALUES ($1, $2, 'conversion', now())
		ON CONFLICT ON CONSTRAINT uq_discipleship_journey_user DO UPDATE
			SET activity_status = 'active',
			    activity_changed_at = CASE WHEN discipleship_journey.activity_status <> 'active'
			                              THEN now() ELSE discipleship_journey.activity_changed_at END
		RETURNING id
	`, churchID, userID).Scan(&journeyID)
	if err != nil {
		c.Logger().Error("Error upserting journey anchor on conversion:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al registrar el camino de discipulado"})
	}

	assignmentID, pathConfigured, err := ensurePathAssignment(q, churchID, journeyID, userID, actorID)
	if err != nil {
		if errors.Is(err, errAssignmentTaggedToAnotherJourney) {
			return c.JSON(http.StatusConflict, map[string]string{"error": "este usuario ya tiene una asignación de camino vinculada a otro registro de discipulado"})
		}
		c.Logger().Error("Error ensuring path assignment on conversion:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al inscribir en el curso del camino"})
	}
	if pathConfigured && assignmentID == nil {
		c.Logger().Error("ensurePathAssignment invariant violated: pathConfigured true with nil assignmentID")
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error interno al inscribir en el curso"})
	}

	if _, err := q.Exec(`
		UPDATE discipleship_visitors SET status = 'converted', converted_user_id = $3, updated_at = NOW()
		WHERE id = $1 AND church_id = $2
	`, visitorID, churchID, userID); err != nil {
		c.Logger().Error("Error marking visitor converted:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al marcar el visitante como convertido"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"user_id":         userID,
		"journey_id":      journeyID,
		"assignment_id":   assignmentID,
		"path_configured": pathConfigured,
		"message":         "Visitante convertido exitosamente",
	})
}

// UpdateVisitor — PUT /discipleship/visitors/:id (cambiar estado de seguimiento / notas)
func (h *DiscipleshipHandler) UpdateVisitor(c echo.Context) error {
	var req UpdateVisitorRequest
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
	visitorID := c.Param("id")

	// converted_user_id is COALESCEd for the same reason notes is: the status
	// dropdown in GroupVisitors.tsx sends only { status }, so an unconditional
	// assignment silently NULLed the conversion link on every later status
	// change — losing the only record of which user a converted visitor became.
	result, err := q.Exec(`
		UPDATE discipleship_visitors SET
			status = $3,
			converted_user_id = COALESCE($4, converted_user_id),
			notes = COALESCE($5, notes),
			updated_at = NOW()
		WHERE id = $1 AND church_id = $2
	`, visitorID, churchID, req.Status, nullIfEmpty(req.ConvertedUserID), nullIfEmpty(req.Notes))
	if err != nil {
		c.Logger().Error("Error updating visitor:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar el visitante"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "visitante no encontrado"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Visitante actualizado exitosamente"})
}
