package handlers

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// Music module — instrument catalog (administered per church).
// The category drives the UI's visual identity (icon + color).
// ─────────────────────────────────────────────────────────────────────────────

var validInstrumentCategories = map[string]bool{
	"voz":       true,
	"cuerdas":   true,
	"teclas":    true,
	"percusion": true,
	"viento":    true,
	"tecnico":   true,
	"otro":      true,
}

type instrumentDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Category  string `json:"category"`
	IsActive  bool   `json:"is_active"`
	SortOrder int    `json:"sort_order"`
}

type instrumentRequest struct {
	Name      string `json:"name"`
	Category  string `json:"category"`
	IsActive  *bool  `json:"is_active"`
	SortOrder *int   `json:"sort_order"`
}

// GetInstruments lists the catalog. ?active=true filters to active only.
func (h *MusicHandler) GetInstruments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	onlyActive := c.QueryParam("active") == "true"
	rows, err := q.Query(`
		SELECT id::text, name, category, is_active, sort_order
		FROM music_instruments
		WHERE church_id = $1
		  AND ($2 = false OR is_active = true)
		ORDER BY sort_order ASC, name ASC
	`, churchID, onlyActive)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudieron listar los instrumentos"})
	}
	defer rows.Close()

	out := []instrumentDTO{}
	for rows.Next() {
		var d instrumentDTO
		if err := rows.Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.SortOrder); err != nil {
			continue
		}
		out = append(out, d)
	}
	return c.JSON(http.StatusOK, out)
}

// CreateInstrument adds a catalog entry (director, level 5).
func (h *MusicHandler) CreateInstrument(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req instrumentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "el nombre es requerido"})
	}
	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "otro"
	}
	if !validInstrumentCategories[category] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "categoría inválida"})
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	var d instrumentDTO
	err = q.QueryRow(`
		INSERT INTO music_instruments (name, category, sort_order, church_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text, name, category, is_active, sort_order
	`, req.Name, category, sortOrder, churchID).Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.SortOrder)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "ese instrumento ya existe"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo crear el instrumento"})
	}
	return c.JSON(http.StatusCreated, d)
}

// UpdateInstrument edits name/category/active/order (director, level 5).
func (h *MusicHandler) UpdateInstrument(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	id := c.Param("id")
	var req instrumentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if req.Category != "" && !validInstrumentCategories[req.Category] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "categoría inválida"})
	}

	var d instrumentDTO
	// COALESCE keeps existing values when a field is omitted.
	err = q.QueryRow(`
		UPDATE music_instruments SET
			name       = COALESCE(NULLIF(TRIM($2), ''), name),
			category   = COALESCE(NULLIF($3, ''), category),
			is_active  = COALESCE($4, is_active),
			sort_order = COALESCE($5, sort_order)
		WHERE id = $1 AND church_id = $6
		RETURNING id::text, name, category, is_active, sort_order
	`, id, req.Name, req.Category, req.IsActive, req.SortOrder, churchID).
		Scan(&d.ID, &d.Name, &d.Category, &d.IsActive, &d.SortOrder)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "instrumento no encontrado"})
		}
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "ese instrumento ya existe"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo actualizar el instrumento"})
	}
	return c.JSON(http.StatusOK, d)
}

// DeleteInstrument removes a catalog entry (director, level 5).
func (h *MusicHandler) DeleteInstrument(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM music_instruments WHERE id = $1 AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo eliminar el instrumento"})
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "instrumento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "instrumento eliminado"})
}
