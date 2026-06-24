package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// Events module — church events + RSVP/registration.
// ─────────────────────────────────────────────────────────────────────────────

type EventsHandler struct{}

func NewEventsHandler() *EventsHandler { return &EventsHandler{} }

var validEventCategories = map[string]bool{
	"service": true, "conference": true, "worship": true,
	"youth": true, "children": true, "community": true,
}

var validRegistrationStatus = map[string]bool{
	"going": true, "maybe": true, "cancelled": true,
}

type eventDTO struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	EventDate      string `json:"event_date"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	Location       string `json:"location"`
	Category       string `json:"category"`
	IsRecurring    bool   `json:"is_recurring"`
	IsPublished    bool   `json:"is_published"`
	MaxAttendees   *int   `json:"max_attendees"`
	Organizer      string `json:"organizer"`
	ImageURL       string `json:"image_url"`
	AttendeesCount int    `json:"attendees_count"`
	MyStatus       string `json:"my_status"` // '' when the caller isn't registered
	CreatedAt      string `json:"created_at"`
}

type eventRequest struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	EventDate    string `json:"event_date"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	Location     string `json:"location"`
	Category     string `json:"category"`
	IsRecurring  *bool  `json:"is_recurring"`
	IsPublished  *bool  `json:"is_published"`
	MaxAttendees *int   `json:"max_attendees"`
	Organizer    string `json:"organizer"`
	ImageURL     string `json:"image_url"`
}

func scanEvent(rows interface {
	Scan(dest ...any) error
}) (eventDTO, error) {
	var d eventDTO
	var maxAtt sql.NullInt64
	err := rows.Scan(
		&d.ID, &d.Title, &d.Description, &d.EventDate, &d.StartTime, &d.EndTime,
		&d.Location, &d.Category, &d.IsRecurring, &d.IsPublished, &maxAtt,
		&d.Organizer, &d.ImageURL, &d.AttendeesCount, &d.MyStatus, &d.CreatedAt,
	)
	if err != nil {
		return d, err
	}
	if maxAtt.Valid {
		v := int(maxAtt.Int64)
		d.MaxAttendees = &v
	}
	return d, nil
}

// eventSelect — $1 = caller user_id, $2 = church_id
const eventSelect = `
	SELECT e.id::text, e.title, COALESCE(e.description,''),
	       to_char(e.event_date,'YYYY-MM-DD'),
	       COALESCE(e.start_time,''), COALESCE(e.end_time,''), COALESCE(e.location,''),
	       e.category, e.is_recurring, e.is_published, e.max_attendees,
	       COALESCE(e.organizer,''), COALESCE(e.image_url,''),
	       (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'going'),
	       COALESCE((SELECT status FROM event_registrations r WHERE r.event_id = e.id AND r.user_id = $1), ''),
	       to_char(e.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	FROM events e`

// GetEvents lists events. ?published=true returns only published; ?upcoming=true
// only future events. Each row carries attendees_count and the caller's my_status.
func (h *EventsHandler) GetEvents(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID, _ := c.Get("user_id").(string)
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	onlyPublished := c.QueryParam("published") == "true"
	onlyUpcoming := c.QueryParam("upcoming") == "true"

	query := eventSelect + `
		WHERE e.church_id = $2
		  AND ($3 = false OR e.is_published = true)
		  AND ($4 = false OR e.event_date >= CURRENT_DATE)
		ORDER BY e.event_date ASC, e.start_time ASC`

	rows, err := q.Query(query, userID, churchID, onlyPublished, onlyUpcoming)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudieron listar los eventos"})
	}
	defer rows.Close()

	out := []eventDTO{}
	for rows.Next() {
		d, scanErr := scanEvent(rows)
		if scanErr != nil {
			continue
		}
		out = append(out, d)
	}
	return c.JSON(http.StatusOK, out)
}

func (h *EventsHandler) GetEventByID(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID, _ := c.Get("user_id").(string)
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	row := q.QueryRow(eventSelect+` WHERE e.church_id = $2 AND e.id = $3`, userID, churchID, c.Param("id"))
	d, scanErr := scanEvent(row)
	if scanErr != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "evento no encontrado"})
	}
	return c.JSON(http.StatusOK, d)
}

func validateEventRequest(req *eventRequest, requireTitleDate bool) (string, bool) {
	req.Title = strings.TrimSpace(req.Title)
	if requireTitleDate && req.Title == "" {
		return "el título es requerido", false
	}
	if requireTitleDate && strings.TrimSpace(req.EventDate) == "" {
		return "la fecha es requerida", false
	}
	if req.Category != "" && !validEventCategories[req.Category] {
		return "categoría inválida", false
	}
	return "", true
}

// CreateEvent — staff+.
func (h *EventsHandler) CreateEvent(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req eventRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if msg, ok := validateEventRequest(&req, true); !ok {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": msg})
	}
	if req.Category == "" {
		req.Category = "service"
	}
	callerID, _ := c.Get("user_id").(string)

	var id string
	err = q.QueryRow(`
		INSERT INTO events (title, description, event_date, start_time, end_time, location,
		                    category, is_recurring, is_published, max_attendees, organizer,
		                    image_url, created_by, church_id)
		VALUES ($1, NULLIF($2,''), $3, NULLIF($4,''), NULLIF($5,''), NULLIF($6,''),
		        $7, COALESCE($8,false), COALESCE($9,false), $10, NULLIF($11,''), NULLIF($12,''),
		        NULLIF($13,'')::uuid, $14)
		RETURNING id::text
	`, req.Title, req.Description, req.EventDate, req.StartTime, req.EndTime, req.Location,
		req.Category, req.IsRecurring, req.IsPublished, req.MaxAttendees, req.Organizer,
		req.ImageURL, callerID, churchID).Scan(&id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo crear el evento"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"id": id, "message": "Evento creado"})
}

// UpdateEvent — staff+. COALESCE keeps existing values when a field is omitted.
func (h *EventsHandler) UpdateEvent(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	var req eventRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if msg, ok := validateEventRequest(&req, false); !ok {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": msg})
	}

	res, err := q.Exec(`
		UPDATE events SET
			title         = COALESCE(NULLIF(TRIM($2),''), title),
			description   = COALESCE($3, description),
			event_date    = COALESCE(NULLIF($4,'')::date, event_date),
			start_time    = COALESCE($5, start_time),
			end_time      = COALESCE($6, end_time),
			location      = COALESCE($7, location),
			category      = COALESCE(NULLIF($8,''), category),
			is_recurring  = COALESCE($9, is_recurring),
			is_published  = COALESCE($10, is_published),
			max_attendees = COALESCE($11, max_attendees),
			organizer     = COALESCE($12, organizer),
			image_url     = COALESCE($13, image_url),
			updated_at    = now()
		WHERE id = $1 AND church_id = $14
	`, c.Param("id"), req.Title, req.Description, req.EventDate, req.StartTime, req.EndTime,
		req.Location, req.Category, req.IsRecurring, req.IsPublished, req.MaxAttendees,
		req.Organizer, req.ImageURL, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo actualizar el evento"})
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "evento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Evento actualizado"})
}

// DeleteEvent — staff+.
func (h *EventsHandler) DeleteEvent(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	res, err := q.Exec(`DELETE FROM events WHERE id = $1 AND church_id = $2`, c.Param("id"), churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo eliminar el evento"})
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "evento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Evento eliminado"})
}

// Register — the caller RSVPs (status going/maybe/cancelled). Any member.
func (h *EventsHandler) Register(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	callerID, _ := c.Get("user_id").(string)
	if callerID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "no autenticado"})
	}
	var body struct {
		Status string `json:"status"`
	}
	_ = c.Bind(&body)
	if body.Status == "" {
		body.Status = "going"
	}
	if !validRegistrationStatus[body.Status] {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "estado inválido"})
	}
	eventID := c.Param("id")

	// Verify the event belongs to this church
	var exists bool
	q.QueryRow("SELECT EXISTS(SELECT 1 FROM events WHERE id = $1 AND church_id = $2)", eventID, churchID).Scan(&exists)
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "evento no encontrado"})
	}

	_, err = q.Exec(`
		INSERT INTO event_registrations (event_id, user_id, status)
		VALUES ($1, $2, $3)
		ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status
	`, eventID, callerID, body.Status)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo registrar la inscripción"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Inscripción actualizada", "status": body.Status})
}

// Unregister — the caller cancels their RSVP entirely.
func (h *EventsHandler) Unregister(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	callerID, _ := c.Get("user_id").(string)
	_, err = q.Exec(
		`DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
		c.Param("id"), callerID,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo cancelar la inscripción"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Inscripción cancelada"})
}

// GetRegistrations — attendee list for an event (staff+).
func (h *EventsHandler) GetRegistrations(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	rows, err := q.Query(`
		SELECT er.user_id::text,
		       TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) AS name,
		       COALESCE(u.email,''), er.status,
		       to_char(er.created_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM event_registrations er
		JOIN users u ON u.id = er.user_id AND u.church_id = $2
		WHERE er.event_id = $1
		ORDER BY er.status, name
	`, c.Param("id"), churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudieron listar las inscripciones"})
	}
	defer rows.Close()

	type regDTO struct {
		UserID    string `json:"user_id"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		Status    string `json:"status"`
		CreatedAt string `json:"created_at"`
	}
	out := []regDTO{}
	for rows.Next() {
		var r regDTO
		if scanErr := rows.Scan(&r.UserID, &r.Name, &r.Email, &r.Status, &r.CreatedAt); scanErr != nil {
			continue
		}
		out = append(out, r)
	}
	return c.JSON(http.StatusOK, out)
}
