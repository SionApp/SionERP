package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// Handler struct
// ─────────────────────────────────────────────────────────────────────────────

type MusicHandler struct{}

func NewMusicHandler() *MusicHandler {
	return &MusicHandler{}
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowed values
// ─────────────────────────────────────────────────────────────────────────────

var validFunciones = map[string]bool{
	"corista":   true,
	"musico":    true,
	"tecnico":   true,
	"danzarina": true,
}

var validAssignmentStates = map[string]bool{
	"asignado":   true,
	"confirmado": true,
	"no_puedo":   true,
}

var validEventTypes = map[string]bool{
	"viernes":  true,
	"domingo":  true,
	"especial": true,
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

// ValidateFunciones validates a slice of funciones against the allowed set.
// Returns an error if any value is invalid or the slice is empty.
func ValidateFunciones(funciones []string) error {
	if len(funciones) == 0 {
		return fmt.Errorf("funciones no puede estar vacío")
	}
	for _, f := range funciones {
		if !validFunciones[f] {
			return fmt.Errorf("función inválida: %q — valores permitidos: corista, musico, tecnico, danzarina", f)
		}
	}
	return nil
}

// NormalizeSongName returns lower(trim(name)) — the key used for deduplication.
func NormalizeSongName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// ─────────────────────────────────────────────────────────────────────────────
// Access helper
// ─────────────────────────────────────────────────────────────────────────────

type musicAccessInfo struct {
	userID   string
	level    int
	memberID string // own music_members.id (empty if not a member)
}

// getMusicAccessInfo resolves the caller's music module access.
//   - pastor/admin bypass → level 5 (director), no memberID restriction.
//   - module_user_roles entry → uses stored role_level.
//   - No entry → level 0 (read-only; full restriction for self-view enforced by handlers).
func getMusicAccessInfo(c echo.Context) (musicAccessInfo, error) {
	userID, _ := c.Get("user_id").(string)
	if userID == "" {
		return musicAccessInfo{}, fmt.Errorf("user not authenticated")
	}

	// pastor/admin bypass (middleware already set module_role_level=5 for these)
	moduleLevel, _ := c.Get("module_role_level").(int)
	if moduleLevel >= 5 {
		return musicAccessInfo{userID: userID, level: 5}, nil
	}

	// Check system role as additional bypass
	dbRole, _ := c.Get("db_role").(string)
	if utils.GetRoleLevel(dbRole) >= utils.LevelPastor {
		return musicAccessInfo{userID: userID, level: 5}, nil
	}

	// Use level resolved by RequireModuleLevel middleware
	if moduleLevel == 0 {
		// Not set by middleware (e.g. public GET routes) — read from DB
		db, err := getDBOrError(c)
		if err != nil {
			return musicAccessInfo{userID: userID, level: 0}, nil
		}
		var lvl int
		err = db.DB.QueryRow(
			`SELECT role_level FROM module_user_roles WHERE user_id = $1 AND module_key = 'music' LIMIT 1`,
			userID,
		).Scan(&lvl)
		if err != nil {
			lvl = 0
		}
		moduleLevel = lvl
	}

	// Resolve own member_id if nivel 1 (servidor)
	info := musicAccessInfo{userID: userID, level: moduleLevel}
	if moduleLevel < 5 {
		db, err := getDBOrError(c)
		if err == nil {
			var mid string
			err2 := db.DB.QueryRow(
				`SELECT id FROM music_members WHERE user_id = $1 LIMIT 1`, userID,
			).Scan(&mid)
			if err2 == nil {
				info.memberID = mid
			}
		}
	}
	return info, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Quarter generation helper
// ─────────────────────────────────────────────────────────────────────────────

// QuarterMonths returns the three calendar months for a quarter (1-based).
// Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12.
func QuarterMonths(quarter int) (startMonth, endMonth time.Month) {
	switch quarter {
	case 1:
		return time.January, time.March
	case 2:
		return time.April, time.June
	case 3:
		return time.July, time.September
	case 4:
		return time.October, time.December
	default:
		return time.January, time.March
	}
}

// GenerateQuarterDates returns all Fridays and Sundays in the given year/quarter.
func GenerateQuarterDates(year, quarter int) []struct {
	Date      time.Time
	EventType string
} {
	startMonth, endMonth := QuarterMonths(quarter)
	var results []struct {
		Date      time.Time
		EventType string
	}

	start := time.Date(year, startMonth, 1, 0, 0, 0, 0, time.UTC)
	// end = last day of endMonth
	end := time.Date(year, endMonth+1, 0, 0, 0, 0, 0, time.UTC)

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		switch d.Weekday() {
		case time.Friday:
			results = append(results, struct {
				Date      time.Time
				EventType string
			}{Date: d, EventType: "viernes"})
		case time.Sunday:
			results = append(results, struct {
				Date      time.Time
				EventType string
			}{Date: d, EventType: "domingo"})
		}
	}
	return results
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

type memberRow struct {
	ID         string   `json:"id"`
	UserID     string   `json:"user_id"`
	Funciones  []string `json:"funciones"`
	Instrument *string  `json:"instrument"`
	IsActive   bool     `json:"is_active"`
	CreatedAt  string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
}

func (h *MusicHandler) GetMembers(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	rows, err := db.DB.Query(`
		SELECT id, user_id, funciones, instrument, is_active,
		       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_members
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener miembros"})
	}
	defer rows.Close()

	members := []memberRow{}
	for rows.Next() {
		var m memberRow
		var funciones []byte
		if err := rows.Scan(&m.ID, &m.UserID, &funciones, &m.Instrument, &m.IsActive, &m.CreatedAt, &m.UpdatedAt); err != nil {
			continue
		}
		// Parse PostgreSQL array literal {val1,val2}
		m.Funciones = parsePGArray(string(funciones))
		members = append(members, m)
	}
	return c.JSON(http.StatusOK, members)
}

func (h *MusicHandler) CreateMember(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	var req struct {
		UserID     string   `json:"user_id"`
		Funciones  []string `json:"funciones"`
		Instrument *string  `json:"instrument"`
		IsActive   *bool    `json:"is_active"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.UserID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "user_id es requerido"})
	}
	if err := ValidateFunciones(req.Funciones); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	var id string
	err = db.DB.QueryRow(`
		INSERT INTO music_members (user_id, funciones, instrument, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.UserID, sliceToPGArray(req.Funciones), req.Instrument, isActive).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "El usuario ya es miembro del equipo de música"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear miembro"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Miembro creado exitosamente"})
}

func (h *MusicHandler) UpdateMember(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	memberID := c.Param("id")
	var req struct {
		Funciones  []string `json:"funciones"`
		Instrument *string  `json:"instrument"`
		IsActive   *bool    `json:"is_active"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Funciones != nil {
		if err := ValidateFunciones(req.Funciones); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
	}

	res, err := db.DB.Exec(`
		UPDATE music_members
		SET funciones   = COALESCE($2, funciones),
		    instrument  = $3,
		    is_active   = COALESCE($4, is_active),
		    updated_at  = now()
		WHERE id = $1
	`, memberID, sliceToPGArrayOrNull(req.Funciones), req.Instrument, req.IsActive)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar miembro"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Miembro no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Miembro actualizado"})
}

func (h *MusicHandler) DeleteMember(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	memberID := c.Param("id")
	res, err := db.DB.Exec(`DELETE FROM music_members WHERE id = $1`, memberID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar miembro"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Miembro no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Miembro eliminado"})
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

type eventRow struct {
	ID        string  `json:"id"`
	EventDate string  `json:"event_date"`
	EventType string  `json:"event_type"`
	Title     *string `json:"title"`
	Notes     *string `json:"notes"`
	Published bool    `json:"published"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

func (h *MusicHandler) GetEvents(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	from := c.QueryParam("from")
	to := c.QueryParam("to")

	query := `
		SELECT id, to_char(event_date,'YYYY-MM-DD'), event_type,
		       title, notes, published,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_events
		WHERE 1=1
	`
	args := []interface{}{}
	if from != "" {
		args = append(args, from)
		query += fmt.Sprintf(` AND event_date >= $%d`, len(args))
	}
	if to != "" {
		args = append(args, to)
		query += fmt.Sprintf(` AND event_date <= $%d`, len(args))
	}
	query += ` ORDER BY event_date ASC`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener eventos"})
	}
	defer rows.Close()

	events := []eventRow{}
	for rows.Next() {
		var e eventRow
		if err := rows.Scan(&e.ID, &e.EventDate, &e.EventType, &e.Title, &e.Notes, &e.Published, &e.CreatedAt, &e.UpdatedAt); err != nil {
			continue
		}
		events = append(events, e)
	}
	return c.JSON(http.StatusOK, events)
}

func (h *MusicHandler) GetEventByID(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	var e eventRow
	err = db.DB.QueryRow(`
		SELECT id, to_char(event_date,'YYYY-MM-DD'), event_type,
		       title, notes, published,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_events WHERE id = $1
	`, id).Scan(&e.ID, &e.EventDate, &e.EventType, &e.Title, &e.Notes, &e.Published, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener evento"})
	}
	return c.JSON(http.StatusOK, e)
}

func (h *MusicHandler) CreateEvent(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	var req struct {
		EventDate string  `json:"event_date"`
		EventType string  `json:"event_type"`
		Title     *string `json:"title"`
		Notes     *string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.EventDate == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "event_date es requerido"})
	}
	if !validEventTypes[req.EventType] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "event_type inválido — valores: viernes, domingo, especial"})
	}

	var id string
	err = db.DB.QueryRow(`
		INSERT INTO music_events (event_date, event_type, title, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, req.EventDate, req.EventType, req.Title, req.Notes).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un evento de ese tipo en esa fecha"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear evento"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Evento creado"})
}

func (h *MusicHandler) UpdateEvent(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	var req struct {
		EventDate *string `json:"event_date"`
		EventType *string `json:"event_type"`
		Title     *string `json:"title"`
		Notes     *string `json:"notes"`
		Published *bool   `json:"published"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.EventType != nil && !validEventTypes[*req.EventType] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "event_type inválido"})
	}

	res, err := db.DB.Exec(`
		UPDATE music_events
		SET event_date = COALESCE($2, event_date),
		    event_type = COALESCE($3, event_type),
		    title      = $4,
		    notes      = $5,
		    published  = COALESCE($6, published),
		    updated_at = now()
		WHERE id = $1
	`, id, req.EventDate, req.EventType, req.Title, req.Notes, req.Published)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar evento"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Evento actualizado"})
}

func (h *MusicHandler) DeleteEvent(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	res, err := db.DB.Exec(`DELETE FROM music_events WHERE id = $1`, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar evento"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Evento eliminado"})
}

// BatchCreateQuarterEvents creates all Fridays and Sundays for a given year+quarter.
// Idempotent: ON CONFLICT DO NOTHING.
func (h *MusicHandler) BatchCreateQuarterEvents(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	var req struct {
		Year    int `json:"year"`
		Quarter int `json:"quarter"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Year < 2000 || req.Year > 2100 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "year inválido"})
	}
	if req.Quarter < 1 || req.Quarter > 4 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "quarter debe ser 1-4"})
	}

	dates := GenerateQuarterDates(req.Year, req.Quarter)

	tx, err := db.DB.Begin()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al iniciar transacción"})
	}
	defer tx.Rollback()

	inserted := 0
	for _, d := range dates {
		dateStr := d.Date.Format("2006-01-02")
		res, err := tx.Exec(`
			INSERT INTO music_events (event_date, event_type)
			VALUES ($1, $2)
			ON CONFLICT (event_date, event_type) DO NOTHING
		`, dateStr, d.EventType)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al insertar evento"})
		}
		n, _ := res.RowsAffected()
		inserted += int(n)
	}

	if err := tx.Commit(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al confirmar transacción"})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"year":          req.Year,
		"quarter":       req.Quarter,
		"total_dates":   len(dates),
		"new_rows":      inserted,
		"skipped_rows":  len(dates) - inserted,
		"message":       fmt.Sprintf("%d eventos creados, %d ya existían", inserted, len(dates)-inserted),
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

type assignmentRow struct {
	ID                  string  `json:"id"`
	EventID             string  `json:"event_id"`
	MemberID            string  `json:"member_id"`
	Funcion             string  `json:"funcion"`
	State               string  `json:"state"`
	AssignedBy          *string `json:"assigned_by"`
	CreatedAt           string  `json:"created_at"`
	UpdatedAt           string  `json:"updated_at"`
}

func (h *MusicHandler) GetAssignments(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	eventID := c.Param("id")
	rows, err := db.DB.Query(`
		SELECT id, event_id, member_id, funcion, state,
		       assigned_by::text,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_assignments
		WHERE event_id = $1
		ORDER BY funcion, created_at
	`, eventID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignaciones"})
	}
	defer rows.Close()

	assignments := []assignmentRow{}
	for rows.Next() {
		var a assignmentRow
		var assignedBy sql.NullString
		if err := rows.Scan(&a.ID, &a.EventID, &a.MemberID, &a.Funcion, &a.State,
			&assignedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
			continue
		}
		if assignedBy.Valid {
			a.AssignedBy = &assignedBy.String
		}
		assignments = append(assignments, a)
	}
	return c.JSON(http.StatusOK, assignments)
}

func (h *MusicHandler) CreateAssignment(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	eventID := c.Param("id")
	callerID, _ := c.Get("user_id").(string)

	var req struct {
		MemberID string `json:"member_id"`
		Funcion  string `json:"funcion"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.MemberID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "member_id es requerido"})
	}
	if !validFunciones[req.Funcion] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "funcion inválida"})
	}

	// Resolve culto date for unavailability check
	var cultoDate string
	err = db.DB.QueryRow(`SELECT to_char(event_date,'YYYY-MM-DD') FROM music_events WHERE id = $1`, eventID).Scan(&cultoDate)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar evento"})
	}

	// Check unavailability (INV-3: advisory only — never 4xx)
	unavailabilityWarning := CheckMemberUnavailability(db.DB, req.MemberID, cultoDate)

	var assignedByVal interface{}
	if callerID != "" {
		assignedByVal = callerID
	}

	var id string
	err = db.DB.QueryRow(`
		INSERT INTO music_assignments (event_id, member_id, funcion, state, assigned_by)
		VALUES ($1, $2, $3, 'asignado', $4)
		RETURNING id
	`, eventID, req.MemberID, req.Funcion, assignedByVal).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "El miembro ya está asignado a este evento"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear asignación"})
	}

	resp := map[string]interface{}{
		"id":      id,
		"message": "Asignación creada",
	}
	if unavailabilityWarning {
		resp["unavailability_warning"] = true
	}
	return c.JSON(http.StatusCreated, resp)
}

func (h *MusicHandler) UpdateAssignment(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	var req struct {
		State   *string `json:"state"`
		Funcion *string `json:"funcion"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.State != nil && !validAssignmentStates[*req.State] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "state inválido — valores: asignado, confirmado, no_puedo"})
	}
	if req.Funcion != nil && !validFunciones[*req.Funcion] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "funcion inválida"})
	}

	res, err := db.DB.Exec(`
		UPDATE music_assignments
		SET state      = COALESCE($2, state),
		    funcion    = COALESCE($3, funcion),
		    updated_at = now()
		WHERE id = $1
	`, id, req.State, req.Funcion)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar asignación"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Asignación actualizada"})
}

func (h *MusicHandler) DeleteAssignment(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	res, err := db.DB.Exec(`DELETE FROM music_assignments WHERE id = $1`, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar asignación"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Asignación eliminada"})
}

// CheckMemberUnavailability returns true if the member has an unavailability
// range covering cultoDate (format "YYYY-MM-DD"). Advisory only — caller
// decides whether to warn; never a hard block.
func CheckMemberUnavailability(db *sql.DB, memberID, cultoDate string) bool {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM music_unavailability
		WHERE member_id = $1
		  AND start_date <= $2::date
		  AND (end_date IS NULL OR end_date >= $2::date)
	`, memberID, cultoDate).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

// ─────────────────────────────────────────────────────────────────────────────
// SONGS — catalog + event-song linking
// ─────────────────────────────────────────────────────────────────────────────

type songRow struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	NameNormalized string  `json:"name_normalized"`
	Author         *string `json:"author"`
	DefaultKey     *string `json:"default_key"`
	CreatedAt      string  `json:"created_at"`
	HistoricalKey  *string `json:"historical_key,omitempty"`
}

func (h *MusicHandler) GetSongs(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	q := c.QueryParam("q")

	query := `
		SELECT s.id, s.name, s.name_normalized, s.author, s.default_key,
		       to_char(s.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       es.tono AS historical_key
		FROM music_songs s
		LEFT JOIN LATERAL (
		    SELECT mes.tono
		    FROM music_event_songs mes
		    JOIN music_events me ON me.id = mes.event_id
		    WHERE mes.song_id = s.id
		    ORDER BY me.event_date DESC
		    LIMIT 1
		) es ON true
	`
	args := []interface{}{}
	if q != "" {
		args = append(args, strings.ToLower(strings.TrimSpace(q)))
		query += fmt.Sprintf(` WHERE s.name_normalized ILIKE '%%' || $%d || '%%'`, len(args))
	}
	query += ` ORDER BY s.name ASC`
	if q == "" {
		query += ` LIMIT 50`
	}

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener canciones"})
	}
	defer rows.Close()

	songs := []songRow{}
	for rows.Next() {
		var s songRow
		var historicalKey sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.NameNormalized, &s.Author, &s.DefaultKey, &s.CreatedAt, &historicalKey); err != nil {
			continue
		}
		if historicalKey.Valid {
			s.HistoricalKey = &historicalKey.String
		}
		songs = append(songs, s)
	}
	return c.JSON(http.StatusOK, songs)
}

// AddSongToEvent upserts a song by normalized name, then links it to the event.
func (h *MusicHandler) AddSongToEvent(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	eventID := c.Param("id")
	var req struct {
		Name       string  `json:"name"`
		Tono       *string `json:"tono"`
		OrderIndex *int    `json:"order_index"`
		Author     *string `json:"author"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Name) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name es requerido"})
	}

	normalized := NormalizeSongName(req.Name)

	// Upsert song by normalized name
	var songID string
	err = db.DB.QueryRow(`
		INSERT INTO music_songs (name, name_normalized, author)
		VALUES ($1, $2, $3)
		ON CONFLICT (name_normalized) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`, strings.TrimSpace(req.Name), normalized, req.Author).Scan(&songID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al registrar canción"})
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	}

	// Link to event
	var linkID string
	err = db.DB.QueryRow(`
		INSERT INTO music_event_songs (event_id, song_id, tono, order_index)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (event_id, song_id) DO UPDATE SET tono = EXCLUDED.tono, order_index = EXCLUDED.order_index
		RETURNING id
	`, eventID, songID, req.Tono, orderIndex).Scan(&linkID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al agregar canción al evento"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":      linkID,
		"song_id": songID,
		"message": "Canción agregada al evento",
	})
}

func (h *MusicHandler) RemoveEventSong(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	eventID := c.Param("eventId")
	songID := c.Param("songId")

	res, err := db.DB.Exec(`
		DELETE FROM music_event_songs WHERE event_id = $1 AND song_id = $2
	`, eventID, songID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar canción del evento"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Relación evento-canción no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Canción eliminada del evento"})
}

// GetSongStats returns derived statistics for all songs (INV-4: computed at query time).
func (h *MusicHandler) GetSongStats(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	limitParam := c.QueryParam("limit")
	limit := 50
	if limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
			limit = l
		}
	}

	rows, err := db.DB.Query(`
		SELECT
		    s.id,
		    s.name,
		    s.name_normalized,
		    COUNT(DISTINCT mes.event_id)                                    AS times_played,
		    to_char(MAX(me.event_date), 'YYYY-MM-DD')                       AS last_played_date,
		    (
		        SELECT mes2.tono
		        FROM music_event_songs mes2
		        JOIN music_events me2 ON me2.id = mes2.event_id
		        WHERE mes2.song_id = s.id
		        ORDER BY me2.event_date DESC
		        LIMIT 1
		    )                                                               AS historical_key
		FROM music_songs s
		LEFT JOIN music_event_songs mes ON mes.song_id = s.id
		LEFT JOIN music_events me ON me.id = mes.event_id
		GROUP BY s.id, s.name, s.name_normalized
		ORDER BY times_played DESC, last_played_date DESC NULLS LAST
		LIMIT $1
	`, limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener estadísticas"})
	}
	defer rows.Close()

	type statRow struct {
		ID             string  `json:"id"`
		Name           string  `json:"name"`
		NameNormalized string  `json:"name_normalized"`
		TimesPlayed    int     `json:"times_played"`
		LastPlayedDate *string `json:"last_played_date"`
		HistoricalKey  *string `json:"historical_key"`
	}
	stats := []statRow{}
	for rows.Next() {
		var s statRow
		var lastDate sql.NullString
		var histKey sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.NameNormalized, &s.TimesPlayed, &lastDate, &histKey); err != nil {
			continue
		}
		if lastDate.Valid {
			s.LastPlayedDate = &lastDate.String
		}
		if histKey.Valid {
			s.HistoricalKey = &histKey.String
		}
		stats = append(stats, s)
	}
	return c.JSON(http.StatusOK, stats)
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — PostgreSQL array <-> Go slice
// ─────────────────────────────────────────────────────────────────────────────

// parsePGArray parses a PostgreSQL array literal like {val1,val2} into a string slice.
func parsePGArray(s string) []string {
	s = strings.TrimSpace(s)
	if s == "{}" || s == "" {
		return []string{}
	}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, `"`)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// sliceToPGArray converts a string slice to a PostgreSQL array literal {val1,val2}.
func sliceToPGArray(s []string) string {
	if len(s) == 0 {
		return "{}"
	}
	quoted := make([]string, len(s))
	for i, v := range s {
		quoted[i] = v
	}
	return "{" + strings.Join(quoted, ",") + "}"
}

// sliceToPGArrayOrNull returns the array string or nil if the slice is nil (for COALESCE).
func sliceToPGArrayOrNull(s []string) interface{} {
	if s == nil {
		return nil
	}
	return sliceToPGArray(s)
}
