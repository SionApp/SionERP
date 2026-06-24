package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-sion/config"
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
		// Not set by middleware (e.g. public GET routes) — read from DB (global pool, not tenant data)
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

	// Resolve own member_id if nivel 1 (servidor) — scoped to church via music_members.church_id
	info := musicAccessInfo{userID: userID, level: moduleLevel}
	if moduleLevel < 5 {
		churchID, _ := c.Get("church_id").(string)
		db, err := getDBOrError(c)
		if err == nil {
			var mid string
			var err2 error
			if churchID != "" {
				err2 = db.DB.QueryRow(
					`SELECT id FROM music_members WHERE user_id = $1 AND church_id = $2 LIMIT 1`, userID, churchID,
				).Scan(&mid)
			} else {
				err2 = db.DB.QueryRow(
					`SELECT id FROM music_members WHERE user_id = $1 LIMIT 1`, userID,
				).Scan(&mid)
			}
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
	Name       string   `json:"name"`
	Email      *string  `json:"email"`
	Funciones  []string `json:"funciones"`
	Instrument *string  `json:"instrument"`
	IsActive   bool     `json:"is_active"`
	IsDirector bool     `json:"is_director"`
	CreatedAt  string   `json:"created_at"`
	UpdatedAt  string   `json:"updated_at"`
}

// musicDirectorLevel is the module role_level that grants director privileges.
const musicDirectorLevel = 5

// musicServidorLevel is the module role_level for a regular servidor.
const musicServidorLevel = 1

// upsertMusicModuleRole writes the caller's music module role (director vs servidor).
// module_user_roles is NOT tenant-scoped — uses global pool.
func upsertMusicModuleRole(db *sql.DB, userID string, isDirector bool, assignedBy string) {
	if db == nil || userID == "" {
		return
	}
	level := musicServidorLevel
	roleName := "Servidor"
	if isDirector {
		level = musicDirectorLevel
		roleName = "Director"
	}
	var assigner interface{}
	if assignedBy != "" {
		assigner = assignedBy
	}
	_, _ = db.Exec(`
		INSERT INTO module_user_roles (user_id, module_key, role_level, role_name, assigned_by)
		VALUES ($1, 'music', $2, $3, $4)
		ON CONFLICT (user_id, module_key)
		DO UPDATE SET role_level = EXCLUDED.role_level,
		              role_name  = EXCLUDED.role_name,
		              updated_at = now()
	`, userID, level, roleName, assigner)
}

func (h *MusicHandler) GetMembers(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	rows, err := q.Query(`
		SELECT mm.id, mm.user_id,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
		       u.email,
		       mm.funciones, mm.instrument, mm.is_active,
		       COALESCE(mur.role_level >= 5, false) AS is_director,
		       to_char(mm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(mm.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_members mm
		JOIN users u ON u.id = mm.user_id AND u.church_id = $1
		LEFT JOIN module_user_roles mur
		       ON mur.user_id = mm.user_id AND mur.module_key = 'music'
		WHERE mm.church_id = $1
		ORDER BY name ASC
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener miembros"})
	}
	defer rows.Close()

	members := []memberRow{}
	for rows.Next() {
		var m memberRow
		var funciones []byte
		var email sql.NullString
		if err := rows.Scan(&m.ID, &m.UserID, &m.Name, &email, &funciones, &m.Instrument, &m.IsActive, &m.IsDirector, &m.CreatedAt, &m.UpdatedAt); err != nil {
			continue
		}
		if email.Valid {
			m.Email = &email.String
		}
		// Parse PostgreSQL array literal {val1,val2}
		m.Funciones = parsePGArray(string(funciones))
		members = append(members, m)
	}
	return c.JSON(http.StatusOK, members)
}

func (h *MusicHandler) CreateMember(c echo.Context) error {
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
		UserID     string   `json:"user_id"`
		Funciones  []string `json:"funciones"`
		Instrument *string  `json:"instrument"`
		IsActive   *bool    `json:"is_active"`
		IsDirector *bool    `json:"is_director"`
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
	err = q.QueryRow(`
		INSERT INTO music_members (user_id, funciones, instrument, is_active, church_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, req.UserID, sliceToPGArray(req.Funciones), req.Instrument, isActive, churchID).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "El usuario ya es miembro del equipo de música"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear miembro"})
	}

	// Assign the module role (director vs servidor) — module_user_roles is global (not tenant-scoped)
	isDirector := req.IsDirector != nil && *req.IsDirector
	upsertMusicModuleRole(config.GetDB().DB, req.UserID, isDirector, callerID)

	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Miembro creado exitosamente"})
}

func (h *MusicHandler) UpdateMember(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	callerID, _ := c.Get("user_id").(string)
	memberID := c.Param("id")
	var req struct {
		Funciones  []string `json:"funciones"`
		Instrument *string  `json:"instrument"`
		IsActive   *bool    `json:"is_active"`
		IsDirector *bool    `json:"is_director"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.Funciones != nil {
		if err := ValidateFunciones(req.Funciones); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
	}

	res, err := q.Exec(`
		UPDATE music_members
		SET funciones   = COALESCE($2, funciones),
		    instrument  = $3,
		    is_active   = COALESCE($4, is_active),
		    updated_at  = now()
		WHERE id = $1 AND church_id = $5
	`, memberID, sliceToPGArrayOrNull(req.Funciones), req.Instrument, req.IsActive, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al actualizar miembro"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Miembro no encontrado"})
	}

	// Update the module role only when the flag is explicitly provided.
	// module_user_roles is global — use global pool.
	if req.IsDirector != nil {
		var userID string
		if scanErr := q.QueryRow(`SELECT user_id::text FROM music_members WHERE id = $1 AND church_id = $2`, memberID, churchID).Scan(&userID); scanErr == nil {
			upsertMusicModuleRole(config.GetDB().DB, userID, *req.IsDirector, callerID)
		}
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Miembro actualizado"})
}

func (h *MusicHandler) DeleteMember(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	memberID := c.Param("id")
	// Clean up the music module role for this user (best-effort) — module_user_roles is global
	var userID string
	if scanErr := q.QueryRow(`SELECT user_id::text FROM music_members WHERE id = $1 AND church_id = $2`, memberID, churchID).Scan(&userID); scanErr == nil && userID != "" {
		_, _ = config.GetDB().DB.Exec(`DELETE FROM module_user_roles WHERE user_id = $1 AND module_key = 'music'`, userID)
	}
	res, err := q.Exec(`DELETE FROM music_members WHERE id = $1 AND church_id = $2`, memberID, churchID)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	from := c.QueryParam("from")
	to := c.QueryParam("to")

	query := `
		SELECT id, to_char(event_date,'YYYY-MM-DD'), event_type,
		       title, notes, published,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_events
		WHERE church_id = $1
	`
	args := []interface{}{churchID}
	if from != "" {
		args = append(args, from)
		query += fmt.Sprintf(` AND event_date >= $%d`, len(args))
	}
	if to != "" {
		args = append(args, to)
		query += fmt.Sprintf(` AND event_date <= $%d`, len(args))
	}
	query += ` ORDER BY event_date ASC`

	rows, err := q.Query(query, args...)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	var e eventRow
	err = q.QueryRow(`
		SELECT id, to_char(event_date,'YYYY-MM-DD'), event_type,
		       title, notes, published,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_events WHERE id = $1 AND church_id = $2
	`, id, churchID).Scan(&e.ID, &e.EventDate, &e.EventType, &e.Title, &e.Notes, &e.Published, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener evento"})
	}
	return c.JSON(http.StatusOK, e)
}

func (h *MusicHandler) CreateEvent(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
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
	err = q.QueryRow(`
		INSERT INTO music_events (event_date, event_type, title, notes, church_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, req.EventDate, req.EventType, req.Title, req.Notes, churchID).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "Ya existe un evento de ese tipo en esa fecha"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear evento"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Evento creado"})
}

func (h *MusicHandler) UpdateEvent(c echo.Context) error {
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

	res, err := q.Exec(`
		UPDATE music_events
		SET event_date = COALESCE($2, event_date),
		    event_type = COALESCE($3, event_type),
		    title      = $4,
		    notes      = $5,
		    published  = COALESCE($6, published),
		    updated_at = now()
		WHERE id = $1 AND church_id = $7
	`, id, req.EventDate, req.EventType, req.Title, req.Notes, req.Published, churchID)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM music_events WHERE id = $1 AND church_id = $2`, id, churchID)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
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

	// BatchCreateQuarterEvents runs within the TenantTx — use q directly (already inside tx)
	inserted := 0
	for _, d := range dates {
		dateStr := d.Date.Format("2006-01-02")
		res, err := q.Exec(`
			INSERT INTO music_events (event_date, event_type, church_id)
			VALUES ($1, $2, $3)
			ON CONFLICT (event_date, event_type, church_id) DO NOTHING
		`, dateStr, d.EventType, churchID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al insertar evento"})
		}
		n, _ := res.RowsAffected()
		inserted += int(n)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"year":         req.Year,
		"quarter":      req.Quarter,
		"total_dates":  len(dates),
		"new_rows":     inserted,
		"skipped_rows": len(dates) - inserted,
		"message":      fmt.Sprintf("%d eventos creados, %d ya existían", inserted, len(dates)-inserted),
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

type assignmentRow struct {
	ID         string  `json:"id"`
	EventID    string  `json:"event_id"`
	MemberID   string  `json:"member_id"`
	MemberName string  `json:"member_name"`
	Instrument *string `json:"instrument"`
	Funcion    string  `json:"funcion"`
	State      string  `json:"state"`
	AssignedBy *string `json:"assigned_by"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

func (h *MusicHandler) GetAssignments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	eventID := c.Param("id")
	rows, err := q.Query(`
		SELECT ma.id, ma.event_id, ma.member_id,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS member_name,
		       mm.instrument,
		       ma.funcion, ma.state,
		       ma.assigned_by::text,
		       to_char(ma.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(ma.updated_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_assignments ma
		JOIN music_members mm ON mm.id = ma.member_id AND mm.church_id = $2
		JOIN users u ON u.id = mm.user_id AND u.church_id = $2
		WHERE ma.event_id = $1
		ORDER BY ma.funcion, ma.created_at
	`, eventID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignaciones"})
	}
	defer rows.Close()

	assignments := []assignmentRow{}
	for rows.Next() {
		var a assignmentRow
		var assignedBy sql.NullString
		if err := rows.Scan(&a.ID, &a.EventID, &a.MemberID, &a.MemberName, &a.Instrument, &a.Funcion, &a.State,
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	eventID := c.Param("id")
	callerID, _ := c.Get("user_id").(string)

	var req struct {
		MemberID string `json:"member_id"`
		UserID   string `json:"user_id"`
		Funcion  string `json:"funcion"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.MemberID == "" && req.UserID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "member_id o user_id es requerido"})
	}
	if !validFunciones[req.Funcion] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "funcion inválida"})
	}

	// Use global pool for resolveOrCreateMember since it manages music_members + module_user_roles
	globalDB := config.GetDB().DB

	// Resolve member: when only user_id is given, find-or-create the music_member
	memberID := req.MemberID
	if memberID == "" {
		mid, resolveErr := resolveOrCreateMemberForChurch(globalDB, req.UserID, req.Funcion, churchID)
		if resolveErr != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "No se pudo dar de alta al integrante"})
		}
		memberID = mid
	} else {
		// Existing member chosen directly — make sure they hold this funcion too.
		ensureMemberFuncion(globalDB, memberID, req.Funcion)
	}

	// Resolve culto date for unavailability check
	var cultoDate string
	err = q.QueryRow(`SELECT to_char(event_date,'YYYY-MM-DD') FROM music_events WHERE id = $1 AND church_id = $2`, eventID, churchID).Scan(&cultoDate)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Evento no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar evento"})
	}

	// Check unavailability (INV-3: advisory only — never 4xx)
	unavailabilityWarning := CheckMemberUnavailability(globalDB, memberID, cultoDate)

	var assignedByVal interface{}
	if callerID != "" {
		assignedByVal = callerID
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO music_assignments (event_id, member_id, funcion, state, assigned_by)
		VALUES ($1, $2, $3, 'asignado', $4)
		RETURNING id
	`, eventID, memberID, req.Funcion, assignedByVal).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return c.JSON(http.StatusConflict, map[string]string{"error": "El miembro ya está asignado a este evento"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear asignación"})
	}

	assignment := assignmentRow{
		ID:       id,
		EventID:  eventID,
		MemberID: memberID,
		Funcion:  req.Funcion,
		State:    "asignado",
	}
	if callerID != "" {
		assignment.AssignedBy = &callerID
	}
	_ = q.QueryRow(`
		SELECT TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), mm.instrument
		FROM music_members mm JOIN users u ON u.id = mm.user_id AND u.church_id = $2
		WHERE mm.id = $1 AND mm.church_id = $2
	`, memberID, churchID).Scan(&assignment.MemberName, &assignment.Instrument)

	// Notify the servidor that they have been assigned (advisory — never blocks).
	emitAssignmentNotification(globalDB, id, unavailabilityWarning)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"assignment":             assignment,
		"unavailability_warning": unavailabilityWarning,
		"message":                "Asignación creada",
	})
}

func (h *MusicHandler) UpdateAssignment(c echo.Context) error {
	q, err := validateTx(c)
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

	// Read previous state to fire director notifications only on a real transition.
	var prevState string
	if req.State != nil {
		_ = q.QueryRow(`SELECT state FROM music_assignments WHERE id = $1`, id).Scan(&prevState)
	}

	res, err := q.Exec(`
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

	// Notify the director on a real state transition (advisory, never blocks).
	globalDB := config.GetDB().DB
	if req.State != nil && prevState != *req.State {
		switch *req.State {
		case "no_puedo":
			emitNoPuedoNotifications(globalDB, id)
		case "confirmado":
			emitConfirmedNotification(globalDB, id)
		}
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Asignación actualizada"})
}

func (h *MusicHandler) DeleteAssignment(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	id := c.Param("id")
	res, err := q.Exec(`DELETE FROM music_assignments WHERE id = $1`, id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar asignación"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Asignación eliminada"})
}

// resolveOrCreateMember returns the music_member id for the given userID,
// creating the member (auto-onboard) with the given funcion if none exists.
// Uses global pool — operates on music_members + module_user_roles.
func resolveOrCreateMember(db *sql.DB, userID, funcion string) (string, error) {
	return resolveOrCreateMemberForChurch(db, userID, funcion, "")
}

// resolveOrCreateMemberForChurch is the church-scoped variant used by migrated handlers.
func resolveOrCreateMemberForChurch(db *sql.DB, userID, funcion, churchID string) (string, error) {
	if db == nil || userID == "" {
		return "", fmt.Errorf("user_id requerido")
	}
	var memberID string
	var err error
	if churchID != "" {
		err = db.QueryRow(`SELECT id FROM music_members WHERE user_id = $1 AND church_id = $2`, userID, churchID).Scan(&memberID)
	} else {
		err = db.QueryRow(`SELECT id FROM music_members WHERE user_id = $1`, userID).Scan(&memberID)
	}
	if err == nil {
		// Member already exists — ensure the funcion is in their array.
		ensureMemberFuncion(db, memberID, funcion)
		return memberID, nil
	}
	if err != sql.ErrNoRows {
		return "", err
	}
	// Create the member with this single funcion.
	if churchID != "" {
		err = db.QueryRow(`
			INSERT INTO music_members (user_id, funciones, is_active, church_id)
			VALUES ($1, $2, true, $3)
			RETURNING id
		`, userID, sliceToPGArray([]string{funcion}), churchID).Scan(&memberID)
	} else {
		err = db.QueryRow(`
			INSERT INTO music_members (user_id, funciones, is_active)
			VALUES ($1, $2, true)
			RETURNING id
		`, userID, sliceToPGArray([]string{funcion})).Scan(&memberID)
	}
	if err != nil {
		return "", err
	}
	// Default module role: servidor (level 1). module_user_roles is global.
	upsertMusicModuleRole(db, userID, false, "")
	return memberID, nil
}

// ensureMemberFuncion adds funcion to the member's funciones array if missing.
func ensureMemberFuncion(db *sql.DB, memberID, funcion string) {
	if db == nil || memberID == "" {
		return
	}
	_, _ = db.Exec(`
		UPDATE music_members
		SET funciones = array_append(funciones, $2), updated_at = now()
		WHERE id = $1 AND NOT ($2 = ANY(funciones))
	`, memberID, funcion)
}

// CheckMemberUnavailability returns true if the member has an unavailability
// range covering cultoDate (format "YYYY-MM-DD"). Advisory only — caller
// decides whether to warn; never a hard block.
func CheckMemberUnavailability(db *sql.DB, memberID, cultoDate string) bool {
	if db == nil {
		return false
	}
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
	Link           *string `json:"link"`
	CreatedAt      string  `json:"created_at"`
	HistoricalKey  *string `json:"historical_key,omitempty"`
}

func (h *MusicHandler) GetSongs(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	qParam := c.QueryParam("q")

	query := `
		SELECT s.id, s.name, s.name_normalized, s.author, s.default_key, s.link,
		       to_char(s.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       es.tono AS historical_key
		FROM music_songs s
		LEFT JOIN LATERAL (
		    SELECT mes.tono
		    FROM music_event_songs mes
		    JOIN music_events me ON me.id = mes.event_id AND me.church_id = $1
		    WHERE mes.song_id = s.id
		    ORDER BY me.event_date DESC
		    LIMIT 1
		) es ON true
		WHERE s.church_id = $1
	`
	args := []interface{}{churchID}
	if qParam != "" {
		args = append(args, strings.ToLower(strings.TrimSpace(qParam)))
		query += fmt.Sprintf(` AND s.name_normalized ILIKE '%%' || $%d || '%%'`, len(args))
	}
	query += ` ORDER BY s.name ASC`
	if qParam == "" {
		query += ` LIMIT 50`
	}

	rows, err := q.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener canciones"})
	}
	defer rows.Close()

	songs := []songRow{}
	for rows.Next() {
		var s songRow
		var historicalKey sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.NameNormalized, &s.Author, &s.DefaultKey, &s.Link, &s.CreatedAt, &historicalKey); err != nil {
			continue
		}
		if historicalKey.Valid {
			s.HistoricalKey = &historicalKey.String
		}
		songs = append(songs, s)
	}
	return c.JSON(http.StatusOK, songs)
}

type eventSongRow struct {
	ID         string  `json:"id"`
	EventID    string  `json:"event_id"`
	SongID     string  `json:"song_id"`
	SongName   string  `json:"song_name"`
	Tono       *string `json:"tono"`
	OrderIndex int     `json:"order_index"`
	Link       *string `json:"link"`
	Notes      *string `json:"notes"`
}

// GetEventSongs returns the repertorio (setlist) for an event, ordered.
func (h *MusicHandler) GetEventSongs(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	eventID := c.Param("id")
	rows, err := q.Query(`
		SELECT mes.id, mes.event_id, mes.song_id, s.name, mes.tono, mes.order_index, s.link, mes.notes
		FROM music_event_songs mes
		JOIN music_songs s ON s.id = mes.song_id AND s.church_id = $2
		WHERE mes.event_id = $1
		ORDER BY mes.order_index ASC, s.name ASC
	`, eventID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener repertorio"})
	}
	defer rows.Close()

	songs := []eventSongRow{}
	for rows.Next() {
		var es eventSongRow
		var tono, link, notes sql.NullString
		if err := rows.Scan(&es.ID, &es.EventID, &es.SongID, &es.SongName, &tono, &es.OrderIndex, &link, &notes); err != nil {
			continue
		}
		if tono.Valid {
			es.Tono = &tono.String
		}
		if link.Valid {
			es.Link = &link.String
		}
		if notes.Valid {
			es.Notes = &notes.String
		}
		songs = append(songs, es)
	}
	return c.JSON(http.StatusOK, songs)
}

// AddSongToEvent upserts a song by normalized name, then links it to the event.
func (h *MusicHandler) AddSongToEvent(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	eventID := c.Param("id")
	var req struct {
		Name       string  `json:"name"`
		Tono       *string `json:"tono"`
		OrderIndex *int    `json:"order_index"`
		Author     *string `json:"author"`
		Link       *string `json:"link"`
		Notes      *string `json:"notes"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if strings.TrimSpace(req.Name) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "name es requerido"})
	}

	normalized := NormalizeSongName(req.Name)

	// Upsert song by normalized name within this church
	var songID string
	err = q.QueryRow(`
		INSERT INTO music_songs (name, name_normalized, author, link, church_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (name_normalized, church_id) DO UPDATE
		SET name   = EXCLUDED.name,
		    author = COALESCE(EXCLUDED.author, music_songs.author),
		    link   = COALESCE(EXCLUDED.link, music_songs.link)
		RETURNING id
	`, strings.TrimSpace(req.Name), normalized, req.Author, req.Link, churchID).Scan(&songID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al registrar canción"})
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	}

	// Link to event
	es := eventSongRow{EventID: eventID, SongID: songID, OrderIndex: orderIndex}
	var tono, link, notes sql.NullString
	err = q.QueryRow(`
		INSERT INTO music_event_songs (event_id, song_id, tono, order_index, notes)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (event_id, song_id) DO UPDATE
		SET tono        = EXCLUDED.tono,
		    order_index = EXCLUDED.order_index,
		    notes       = COALESCE(EXCLUDED.notes, music_event_songs.notes)
		RETURNING id,
		          (SELECT name FROM music_songs WHERE id = $2),
		          tono,
		          (SELECT link FROM music_songs WHERE id = $2),
		          notes
	`, eventID, songID, req.Tono, orderIndex, req.Notes).Scan(&es.ID, &es.SongName, &tono, &link, &notes)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al agregar canción al evento"})
	}
	if tono.Valid {
		es.Tono = &tono.String
	}
	if link.Valid {
		es.Link = &link.String
	}
	if notes.Valid {
		es.Notes = &notes.String
	}

	return c.JSON(http.StatusCreated, es)
}

func (h *MusicHandler) RemoveEventSong(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	eventID := c.Param("eventId")
	songID := c.Param("songId")

	res, err := q.Exec(`
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	limitParam := c.QueryParam("limit")
	limit := 50
	if limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 {
			limit = l
		}
	}

	rows, err := q.Query(`
		SELECT
		    s.id,
		    s.name,
		    s.name_normalized,
		    COUNT(DISTINCT mes.event_id)                                    AS times_played,
		    to_char(MAX(me.event_date), 'YYYY-MM-DD')                       AS last_played_date,
		    (
		        SELECT mes2.tono
		        FROM music_event_songs mes2
		        JOIN music_events me2 ON me2.id = mes2.event_id AND me2.church_id = $1
		        WHERE mes2.song_id = s.id
		        ORDER BY me2.event_date DESC
		        LIMIT 1
		    )                                                               AS historical_key
		FROM music_songs s
		LEFT JOIN music_event_songs mes ON mes.song_id = s.id
		LEFT JOIN music_events me ON me.id = mes.event_id AND me.church_id = $1
		WHERE s.church_id = $1
		GROUP BY s.id, s.name, s.name_normalized
		ORDER BY times_played DESC, last_played_date DESC NULLS LAST
		LIMIT $2
	`, churchID, limit)
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
// UNAVAILABILITY — CRUD + self-view (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

type unavailabilityRow struct {
	ID        string  `json:"id"`
	MemberID  string  `json:"member_id"`
	StartDate string  `json:"start_date"`
	EndDate   *string `json:"end_date"`
	Reason    *string `json:"reason"`
	CreatedAt string  `json:"created_at"`
}

// GetUnavailability returns unavailability rows.
// Director (level 5): all rows, optional ?member_id= filter.
// Servidor: only own member's rows.
func (h *MusicHandler) GetUnavailability(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	info, err := getMusicAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	query := `
		SELECT id, member_id,
		       to_char(start_date,'YYYY-MM-DD'),
		       to_char(end_date,'YYYY-MM-DD'),
		       reason,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_unavailability
		WHERE 1=1
	`
	args := []interface{}{}

	if info.level >= 5 {
		// Director: filter by route param :id (the member whose unavailability we want)
		if memberIDFilter := c.Param("id"); memberIDFilter != "" {
			args = append(args, memberIDFilter)
			query += fmt.Sprintf(` AND member_id = $%d`, len(args))
		}
	} else {
		// Servidor: own rows only — route :id is ignored for security
		if info.memberID == "" {
			return c.JSON(http.StatusOK, []unavailabilityRow{})
		}
		args = append(args, info.memberID)
		query += fmt.Sprintf(` AND member_id = $%d`, len(args))
	}

	query += ` ORDER BY start_date DESC`

	rows, err := q.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener disponibilidad"})
	}
	defer rows.Close()

	result := []unavailabilityRow{}
	for rows.Next() {
		var u unavailabilityRow
		var endDate, reason sql.NullString
		if err := rows.Scan(&u.ID, &u.MemberID, &u.StartDate, &endDate, &reason, &u.CreatedAt); err != nil {
			continue
		}
		if endDate.Valid {
			u.EndDate = &endDate.String
		}
		if reason.Valid {
			u.Reason = &reason.String
		}
		result = append(result, u)
	}
	return c.JSON(http.StatusOK, result)
}

// CreateUnavailability inserts a new unavailability range.
// Servidor: can only create for themselves.
// Director: can create for any member_id.
func (h *MusicHandler) CreateUnavailability(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	info, err := getMusicAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	var req struct {
		MemberID  string  `json:"member_id"`
		StartDate string  `json:"start_date"`
		EndDate   *string `json:"end_date"`
		Reason    *string `json:"reason"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Payload inválido"})
	}
	if req.StartDate == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "start_date es requerido"})
	}

	// Resolve effective member_id: route param :id is the target member
	routeMemberID := c.Param("id")
	var effectiveMemberID string
	if info.level < 5 {
		// Servidor: always use own member_id (ignore route param — security)
		if info.memberID == "" {
			return c.JSON(http.StatusForbidden, map[string]string{"error": "No sos miembro del equipo de música"})
		}
		effectiveMemberID = info.memberID
	} else {
		// Director: prefer route param :id, fall back to body member_id
		if routeMemberID != "" {
			effectiveMemberID = routeMemberID
		} else {
			effectiveMemberID = req.MemberID
		}
	}
	if effectiveMemberID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "member_id es requerido"})
	}

	var id string
	err = q.QueryRow(`
		INSERT INTO music_unavailability (member_id, start_date, end_date, reason)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, effectiveMemberID, req.StartDate, req.EndDate, req.Reason).Scan(&id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al crear rango de indisponibilidad"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Indisponibilidad registrada"})
}

// DeleteUnavailability deletes an unavailability row.
// Own record: any music member.
// Other records: director only.
func (h *MusicHandler) DeleteUnavailability(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	info, err := getMusicAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	unavailID := c.Param("id")

	// Fetch the row to check ownership
	var ownerMemberID string
	err = q.QueryRow(
		`SELECT member_id FROM music_unavailability WHERE id = $1`, unavailID,
	).Scan(&ownerMemberID)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Registro no encontrado"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar registro"})
	}

	// Enforce ownership: non-director can only delete own rows
	if info.level < 5 && ownerMemberID != info.memberID {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "No tenés permiso para eliminar este registro"})
	}

	res, err := q.Exec(`DELETE FROM music_unavailability WHERE id = $1`, unavailID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar registro"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Registro no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Indisponibilidad eliminada"})
}

// GetMeAssignments returns assignments for the caller's own member record.
func (h *MusicHandler) GetMeAssignments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	info, err := getMusicAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}
	if info.memberID == "" {
		return c.JSON(http.StatusOK, []interface{}{})
	}

	type meAssignmentRow struct {
		ID         string `json:"id"`
		EventID    string `json:"event_id"`
		EventDate  string `json:"event_date"`
		EventType  string `json:"event_type"`
		Funcion    string `json:"funcion"`
		Instrument string `json:"instrument"`
		State      string `json:"state"`
		CreatedAt  string `json:"created_at"`
	}

	rows, err := q.Query(`
		SELECT ma.id, ma.event_id,
		       to_char(me.event_date,'YYYY-MM-DD'),
		       me.event_type,
		       ma.funcion,
		       COALESCE(mm.instrument,''),
		       ma.state,
		       to_char(ma.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_assignments ma
		JOIN music_events me ON me.id = ma.event_id
		JOIN music_members mm ON mm.id = ma.member_id
		WHERE ma.member_id = $1
		ORDER BY me.event_date DESC
	`, info.memberID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignaciones"})
	}
	defer rows.Close()

	result := []meAssignmentRow{}
	for rows.Next() {
		var a meAssignmentRow
		if err := rows.Scan(&a.ID, &a.EventID, &a.EventDate, &a.EventType, &a.Funcion, &a.Instrument, &a.State, &a.CreatedAt); err != nil {
			continue
		}
		result = append(result, a)
	}
	return c.JSON(http.StatusOK, result)
}

// GetMeUnavailability returns unavailability rows for the caller's own member record.
func (h *MusicHandler) GetMeUnavailability(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	info, err := getMusicAccessInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}
	if info.memberID == "" {
		return c.JSON(http.StatusOK, []unavailabilityRow{})
	}

	rows, err := q.Query(`
		SELECT id, member_id,
		       to_char(start_date,'YYYY-MM-DD'),
		       to_char(end_date,'YYYY-MM-DD'),
		       reason,
		       to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM music_unavailability
		WHERE member_id = $1
		ORDER BY start_date DESC
	`, info.memberID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener disponibilidad"})
	}
	defer rows.Close()

	result := []unavailabilityRow{}
	for rows.Next() {
		var u unavailabilityRow
		var endDate, reason sql.NullString
		if err := rows.Scan(&u.ID, &u.MemberID, &u.StartDate, &endDate, &reason, &u.CreatedAt); err != nil {
			continue
		}
		if endDate.Valid {
			u.EndDate = &endDate.String
		}
		if reason.Valid {
			u.Reason = &reason.String
		}
		result = append(result, u)
	}
	return c.JSON(http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLACEMENT SUGGESTIONS (Phase 6)
// ─────────────────────────────────────────────────────────────────────────────

// GetSuggestions returns candidate members for replacing the given assignment.
func (h *MusicHandler) GetSuggestions(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	assignmentID := c.Param("id")

	// Resolve assignment to get funcion + event_id + culto_date
	var funcion, eventID, cultoDate string
	err = q.QueryRow(`
		SELECT ma.funcion, ma.event_id, to_char(me.event_date,'YYYY-MM-DD')
		FROM music_assignments ma
		JOIN music_events me ON me.id = ma.event_id AND me.church_id = $2
		WHERE ma.id = $1
	`, assignmentID, churchID).Scan(&funcion, &eventID, &cultoDate)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignación"})
	}

	// Single set-based query — no per-member loop
	rows, err := q.Query(`
		SELECT m.id,
		       u.first_name,
		       u.last_name,
		       m.funciones,
		       m.instrument
		FROM music_members m
		JOIN users u ON u.id = m.user_id AND u.church_id = $4
		WHERE m.church_id = $4
		  AND m.is_active = true
		  AND $1 = ANY(m.funciones)
		  AND m.id NOT IN (
		      SELECT member_id FROM music_assignments
		      WHERE event_id = $2
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM music_unavailability mu
		      WHERE mu.member_id = m.id
		        AND mu.start_date <= $3::date
		        AND (mu.end_date IS NULL OR mu.end_date >= $3::date)
		  )
		ORDER BY u.first_name, u.last_name
	`, funcion, eventID, cultoDate, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener sugerencias"})
	}
	defer rows.Close()

	type suggestionRow struct {
		ID         string   `json:"id"`
		FirstName  string   `json:"first_name"`
		LastName   string   `json:"last_name"`
		Funciones  []string `json:"funciones"`
		Instrument *string  `json:"instrument"`
	}
	suggestions := []suggestionRow{}
	for rows.Next() {
		var s suggestionRow
		var funciones []byte
		if err := rows.Scan(&s.ID, &s.FirstName, &s.LastName, &funciones, &s.Instrument); err != nil {
			continue
		}
		s.Funciones = parsePGArray(string(funciones))
		suggestions = append(suggestions, s)
	}
	return c.JSON(http.StatusOK, suggestions)
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ROUTING — exported logic for testability (Phase 8/9)
// ─────────────────────────────────────────────────────────────────────────────

// NoPuedoTarget describes how no_puedo notification recipients are resolved.
// UseAssignedBy=true means route to the single assigned_by director.
// UseAssignedBy=false means fallback to all current directors.
type NoPuedoTarget struct {
	UseAssignedBy bool
	AssignedByID  string // only set when UseAssignedBy=true
}

// ResolveNoPuedoTarget applies Design Decision 2:
//   - If assignedByID is non-empty AND isStillDirector is true → route to that director.
//   - Otherwise → fallback (all current directors).
//
// This is a pure function — no DB access — exported for unit testing.
func ResolveNoPuedoTarget(assignedByID string, isStillDirector bool) NoPuedoTarget {
	if assignedByID != "" && isStillDirector {
		return NoPuedoTarget{UseAssignedBy: true, AssignedByID: assignedByID}
	}
	return NoPuedoTarget{UseAssignedBy: false}
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — no_puedo emit helper (Phase 8)
// These helpers use the global pool (*sql.DB) — they run fire-and-forget
// after the response and don't need the tenant tx.
// ─────────────────────────────────────────────────────────────────────────────

// emitNoPuedoNotifications inserts notification rows when an assignment becomes no_puedo.
func emitNoPuedoNotifications(db *sql.DB, assignmentID string) {
	if db == nil {
		return
	}

	var assignedBy sql.NullString
	var memberUserID, eventDate, funcion string
	err := db.QueryRow(`
		SELECT ma.assigned_by::text,
		       mm.user_id::text,
		       to_char(me.event_date,'YYYY-MM-DD'),
		       ma.funcion
		FROM music_assignments ma
		JOIN music_members mm ON mm.id = ma.member_id
		JOIN music_events me ON me.id = ma.event_id
		WHERE ma.id = $1
	`, assignmentID).Scan(&assignedBy, &memberUserID, &eventDate, &funcion)
	if err != nil {
		return
	}

	var firstName, lastName string
	_ = db.QueryRow(
		`SELECT first_name, last_name FROM users WHERE id = $1`, memberUserID,
	).Scan(&firstName, &lastName)

	msg := fmt.Sprintf("%s %s no puede en el culto del %s (%s)", firstName, lastName, eventDate, funcion)

	for _, recipientID := range directorRecipients(db, assignedBy) {
		if _, err := db.Exec(`
			INSERT INTO notifications (user_id, type, title, message, action_url,
			                           related_entity_type, related_entity_id, read)
			VALUES ($1, 'warning', 'Cambio de disponibilidad', $2, '/dashboard/music',
			        'music_assignment', $3, false)
		`, recipientID, msg, assignmentID); err != nil {
			log.Printf("[music] no_puedo notification insert failed: %v", err)
		}
	}
}

// directorRecipients returns the user ids that should receive a director-facing
// notification for an assignment: the assigner if they're still a director,
// otherwise every current music director.
func directorRecipients(db *sql.DB, assignedBy sql.NullString) []string {
	if assignedBy.Valid && assignedBy.String != "" {
		var dirLevel int
		err := db.QueryRow(`
			SELECT role_level FROM module_user_roles
			WHERE user_id = $1 AND module_key = 'music' LIMIT 1
		`, assignedBy.String).Scan(&dirLevel)
		if err == nil && dirLevel >= 5 {
			return []string{assignedBy.String}
		}
	}
	var recipients []string
	rows, err := db.Query(`
		SELECT DISTINCT user_id::text FROM module_user_roles
		WHERE module_key = 'music' AND role_level >= 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var uid string
			if scanErr := rows.Scan(&uid); scanErr == nil {
				recipients = append(recipients, uid)
			}
		}
	}
	return recipients
}

// emitConfirmedNotification tells the director that a servidor confirmed.
func emitConfirmedNotification(db *sql.DB, assignmentID string) {
	if db == nil {
		return
	}
	var assignedBy sql.NullString
	var memberUserID, eventDate, funcion string
	err := db.QueryRow(`
		SELECT ma.assigned_by::text, mm.user_id::text,
		       to_char(me.event_date,'YYYY-MM-DD'), ma.funcion
		FROM music_assignments ma
		JOIN music_members mm ON mm.id = ma.member_id
		JOIN music_events me ON me.id = ma.event_id
		WHERE ma.id = $1
	`, assignmentID).Scan(&assignedBy, &memberUserID, &eventDate, &funcion)
	if err != nil {
		return
	}
	var firstName, lastName string
	_ = db.QueryRow(`SELECT first_name, last_name FROM users WHERE id = $1`, memberUserID).
		Scan(&firstName, &lastName)
	msg := fmt.Sprintf("%s %s confirmó para el culto del %s (%s)", firstName, lastName, eventDate, funcion)

	for _, recipientID := range directorRecipients(db, assignedBy) {
		if _, err := db.Exec(`
			INSERT INTO notifications (user_id, type, title, message, action_url,
			                           related_entity_type, related_entity_id, read)
			VALUES ($1, 'success', 'Confirmación de música', $2, '/dashboard/music',
			        'music_assignment', $3, false)
		`, recipientID, msg, assignmentID); err != nil {
			log.Printf("[music] confirmed notification insert failed: %v", err)
		}
	}
}

// emitAssignmentNotification notifies the servidor that they have been assigned
// to a culto, so they can confirm or decline.
func emitAssignmentNotification(db *sql.DB, assignmentID string, withWarning bool) {
	if db == nil {
		return
	}
	var memberUserID, eventDate, eventType, funcion string
	var title sql.NullString
	err := db.QueryRow(`
		SELECT mm.user_id::text,
		       to_char(me.event_date,'YYYY-MM-DD'),
		       me.event_type,
		       me.title,
		       ma.funcion
		FROM music_assignments ma
		JOIN music_members mm ON mm.id = ma.member_id
		JOIN music_events me ON me.id = ma.event_id
		WHERE ma.id = $1
	`, assignmentID).Scan(&memberUserID, &eventDate, &eventType, &title, &funcion)
	if err != nil {
		return
	}

	titleSuffix := ""
	if title.Valid && title.String != "" {
		titleSuffix = " — " + title.String
	}
	msg := fmt.Sprintf("Fuiste asignado al culto del %s (%s) como %s%s. Confirmá tu participación.",
		eventDate, eventType, funcion, titleSuffix)
	warning := ""
	if withWarning {
		warning = " (atención: tenés una indisponibilidad declarada para esa fecha)"
	}
	if _, err := db.Exec(`
		INSERT INTO notifications (user_id, type, title, message, action_url,
		                           related_entity_type, related_entity_id, read)
		VALUES ($1, 'info', 'Nueva asignación de música', $2, '/dashboard/music',
		        'music_assignment', $3, false)
	`, memberUserID, msg+warning, assignmentID); err != nil {
		log.Printf("[music] assignment notification insert failed: %v", err)
	}
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
