package handlers

import (
	"net/http"

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

	result, err := q.Exec(`
		UPDATE discipleship_visitors SET
			status = $3,
			converted_user_id = $4,
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
