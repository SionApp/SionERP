package handlers

import (
	"backend-sion/config"
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
)

// ─────────────────────────────────────────────────────────────────────────────
// Reports module — on-the-fly analytics + a traceability log of generations.
// (Distinct from discipleship weekly reports.)
// ─────────────────────────────────────────────────────────────────────────────

type ReportsAnalyticsHandler struct{}

func NewReportsAnalyticsHandler() *ReportsAnalyticsHandler { return &ReportsAnalyticsHandler{} }

type labelValue struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

// scanLabelValues runs a `SELECT label, count` query into a []labelValue.
// Uses *sql.DB (global pool) for fire-and-forget goroutine compatibility.
// For handler queries, use the Querier variant below.
func scanLabelValues(db *sql.DB, query string, args ...any) []labelValue {
	out := []labelValue{}
	rows, err := db.Query(query, args...)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var lv labelValue
		if err := rows.Scan(&lv.Label, &lv.Value); err != nil {
			continue
		}
		out = append(out, lv)
	}
	return out
}

// scanLabelValuesQ runs a `SELECT label, count` query via Querier (tenant tx).
func scanLabelValuesQ(q config.Querier, query string, args ...any) []labelValue {
	out := []labelValue{}
	rows, err := q.Query(query, args...)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var lv labelValue
		if err := rows.Scan(&lv.Label, &lv.Value); err != nil {
			continue
		}
		out = append(out, lv)
	}
	return out
}

// GetUsersReport — totals + breakdown by role, active/baptized, new this month.
func (h *ReportsAnalyticsHandler) GetUsersReport(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var total, active, baptized, newThisMonth int
	_ = q.QueryRow(`
		SELECT count(*),
		       count(*) FILTER (WHERE is_active_member),
		       count(*) FILTER (WHERE baptized),
		       count(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', now()))
		FROM users WHERE church_id = $1
	`, churchID).Scan(&total, &active, &baptized, &newThisMonth)

	byRole := scanLabelValuesQ(q,
		`SELECT role::text, count(*) FROM users WHERE church_id = $1 GROUP BY role::text ORDER BY count(*) DESC`,
		churchID)

	return c.JSON(http.StatusOK, map[string]any{
		"total":          total,
		"active_members": active,
		"baptized":       baptized,
		"new_this_month": newThisMonth,
		"by_role":        byRole,
	})
}

// GetGrowthReport — new users per month. Defaults to the last 12 months;
// accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD to filter by a custom range (#2).
func (h *ReportsAnalyticsHandler) GetGrowthReport(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	from, to := c.QueryParam("from"), c.QueryParam("to")
	var monthly []labelValue
	if from != "" && to != "" {
		monthly = scanLabelValuesQ(q, `
			SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m, count(*)
			FROM users
			WHERE church_id = $1
			  AND created_at >= $2::date
			  AND created_at < ($3::date + interval '1 day')
			GROUP BY 1 ORDER BY 1
		`, churchID, from, to)
	} else {
		monthly = scanLabelValuesQ(q, `
			SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m, count(*)
			FROM users
			WHERE church_id = $1
			  AND created_at >= now() - interval '12 months'
			GROUP BY 1 ORDER BY 1
		`, churchID)
	}
	return c.JSON(http.StatusOK, map[string]any{"monthly": monthly})
}

// GetGrowthComparison — issue #6: compara el total de usuarios nuevos entre
// dos rangos de fechas (?a_from&a_to&b_from&b_to) y devuelve la variación %.
func (h *ReportsAnalyticsHandler) GetGrowthComparison(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	aFrom, aTo := c.QueryParam("a_from"), c.QueryParam("a_to")
	bFrom, bTo := c.QueryParam("b_from"), c.QueryParam("b_to")
	if aFrom == "" || aTo == "" || bFrom == "" || bTo == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "faltan fechas de ambos períodos"})
	}

	countInRange := func(from, to string) int {
		var n int
		_ = q.QueryRow(`
			SELECT count(*) FROM users
			WHERE church_id = $1 AND created_at >= $2::date AND created_at < ($3::date + interval '1 day')
		`, churchID, from, to).Scan(&n)
		return n
	}

	totalA := countInRange(aFrom, aTo)
	totalB := countInRange(bFrom, bTo)

	var changePct float64
	if totalA > 0 {
		changePct = (float64(totalB) - float64(totalA)) / float64(totalA) * 100
	} else if totalB > 0 {
		changePct = 100
	}

	return c.JSON(http.StatusOK, map[string]any{
		"period_a_total": totalA,
		"period_b_total": totalB,
		"change_pct":     changePct,
	})
}

// GetDemographicsReport — breakdown by age bucket, marital status and role.
func (h *ReportsAnalyticsHandler) GetDemographicsReport(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	byAge := scanLabelValuesQ(q, `
		SELECT bucket, count(*) FROM (
			SELECT CASE
				WHEN birth_date IS NULL THEN 'Sin dato'
				WHEN date_part('year', age(birth_date)) < 18 THEN '0-17'
				WHEN date_part('year', age(birth_date)) < 26 THEN '18-25'
				WHEN date_part('year', age(birth_date)) < 41 THEN '26-40'
				WHEN date_part('year', age(birth_date)) < 61 THEN '41-60'
				ELSE '60+'
			END AS bucket
			FROM users WHERE church_id = $1
		) t GROUP BY bucket ORDER BY bucket
	`, churchID)
	byMarital := scanLabelValuesQ(q,
		`SELECT COALESCE(NULLIF(marital_status,''),'Sin dato'), count(*) FROM users WHERE church_id = $1 GROUP BY 1 ORDER BY count(*) DESC`,
		churchID)
	byRole := scanLabelValuesQ(q,
		`SELECT role::text, count(*) FROM users WHERE church_id = $1 GROUP BY role::text ORDER BY count(*) DESC`,
		churchID)

	return c.JSON(http.StatusOK, map[string]any{
		"by_age":            byAge,
		"by_marital_status": byMarital,
		"by_role":           byRole,
	})
}

// GetActivitiesReport — event totals + top events by attendance.
func (h *ReportsAnalyticsHandler) GetActivitiesReport(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var totalEvents, upcoming, totalReg int
	_ = q.QueryRow(
		`SELECT count(*), count(*) FILTER (WHERE event_date >= CURRENT_DATE) FROM events WHERE church_id = $1`,
		churchID,
	).Scan(&totalEvents, &upcoming)
	_ = q.QueryRow(
		`SELECT count(*) FROM event_registrations er JOIN events e ON e.id = er.event_id AND e.church_id = $1 WHERE er.status = 'going'`,
		churchID,
	).Scan(&totalReg)

	topEvents := scanLabelValuesQ(q, `
		SELECT e.title,
		       (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'going')
		FROM events e
		WHERE e.church_id = $1
		ORDER BY 2 DESC, e.event_date DESC
		LIMIT 10
	`, churchID)

	return c.JSON(http.StatusOK, map[string]any{
		"total_events":        totalEvents,
		"upcoming_events":     upcoming,
		"total_registrations": totalReg,
		"top_events":          topEvents,
	})
}

// LogGeneration records a report generation (trazabilidad).
func (h *ReportsAnalyticsHandler) LogGeneration(c echo.Context) error {
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
		ReportType string `json:"report_type"`
		Format     string `json:"format"`
		Title      string `json:"title"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if req.Format == "" {
		req.Format = "csv"
	}
	_, err = q.Exec(`
		INSERT INTO report_generations (report_type, format, title, generated_by, church_id)
		VALUES ($1, $2, NULLIF($3,''), NULLIF($4,'')::uuid, $5)
	`, req.ReportType, req.Format, req.Title, callerID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo registrar la generación"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"message": "Registrado"})
}

// GetGenerations lists the report-generation history (trazabilidad).
func (h *ReportsAnalyticsHandler) GetGenerations(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	rows, err := q.Query(`
		SELECT rg.id::text, rg.report_type, rg.format, COALESCE(rg.title,''),
		       COALESCE(TRIM(u.first_name || ' ' || u.last_name), ''),
		       to_char(rg.generated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM report_generations rg
		LEFT JOIN users u ON u.id = rg.generated_by AND u.church_id = $1
		WHERE rg.church_id = $1
		ORDER BY rg.generated_at DESC
		LIMIT 100
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo listar el historial"})
	}
	defer rows.Close()

	type genDTO struct {
		ID          string `json:"id"`
		ReportType  string `json:"report_type"`
		Format      string `json:"format"`
		Title       string `json:"title"`
		GeneratedBy string `json:"generated_by"`
		GeneratedAt string `json:"generated_at"`
	}
	out := []genDTO{}
	for rows.Next() {
		var g genDTO
		if err := rows.Scan(&g.ID, &g.ReportType, &g.Format, &g.Title, &g.GeneratedBy, &g.GeneratedAt); err != nil {
			continue
		}
		out = append(out, g)
	}
	return c.JSON(http.StatusOK, out)
}

// ─────────────────────────────────────────────────────────────────────────────
// Report schedules — issue #67: programación automática de reportes.
// El "template" ES el schedule (tipo + formato + título + frecuencia +
// destinatarios); no hace falta una entidad separada. El envío real corre en
// scheduler.go, que reusa notification_queue en vez de generar un adjunto.
// ─────────────────────────────────────────────────────────────────────────────

type reportScheduleDTO struct {
	ID            string   `json:"id"`
	ReportType    string   `json:"report_type"`
	Format        string   `json:"format"`
	Title         string   `json:"title"`
	Frequency     string   `json:"frequency"`
	RecipientIDs  []string `json:"recipient_user_ids"`
	Active        bool     `json:"active"`
	NextRunAt     string   `json:"next_run_at"`
	CreatedByName string   `json:"created_by_name"`
}

// GetSchedules lists all report schedules for the church.
func (h *ReportsAnalyticsHandler) GetSchedules(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	rows, err := q.Query(`
		SELECT rs.id::text, rs.report_type, rs.format, rs.title, rs.frequency,
		       rs.recipient_user_ids, rs.active,
		       to_char(rs.next_run_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       COALESCE(TRIM(u.first_name || ' ' || u.last_name), '')
		FROM report_schedules rs
		LEFT JOIN users u ON u.id = rs.created_by AND u.church_id = $1
		WHERE rs.church_id = $1
		ORDER BY rs.created_at DESC
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo listar la programación"})
	}
	defer rows.Close()

	out := []reportScheduleDTO{}
	for rows.Next() {
		var s reportScheduleDTO
		var recipients pq.StringArray
		if err := rows.Scan(&s.ID, &s.ReportType, &s.Format, &s.Title, &s.Frequency,
			&recipients, &s.Active, &s.NextRunAt, &s.CreatedByName); err != nil {
			continue
		}
		s.RecipientIDs = []string(recipients)
		out = append(out, s)
	}
	return c.JSON(http.StatusOK, out)
}

type upsertScheduleRequest struct {
	ReportType   string   `json:"report_type"`
	Format       string   `json:"format"`
	Title        string   `json:"title"`
	Frequency    string   `json:"frequency"`
	RecipientIDs []string `json:"recipient_user_ids"`
	Active       *bool    `json:"active"`
}

func nextRunFor(frequency string, from time.Time) time.Time {
	if frequency == "monthly" {
		return from.AddDate(0, 1, 0)
	}
	return from.AddDate(0, 0, 7)
}

// CreateSchedule creates a new report schedule.
func (h *ReportsAnalyticsHandler) CreateSchedule(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	callerID, _ := c.Get("user_id").(string)

	var req upsertScheduleRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if req.ReportType == "" || req.Title == "" || req.Frequency == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "tipo, título y frecuencia son obligatorios"})
	}
	if req.Format == "" {
		req.Format = "pdf"
	}

	next := nextRunFor(req.Frequency, time.Now())
	_, err = q.Exec(`
		INSERT INTO report_schedules
			(church_id, report_type, format, title, frequency, recipient_user_ids, next_run_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8,'')::uuid)
	`, churchID, req.ReportType, req.Format, req.Title, req.Frequency,
		pq.Array(req.RecipientIDs), next, callerID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo crear la programación"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"message": "Programación creada"})
}

// UpdateSchedule edits an existing schedule (title, frequency, recipients, active).
func (h *ReportsAnalyticsHandler) UpdateSchedule(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	id := c.Param("id")

	var req upsertScheduleRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	result, err := q.Exec(`
		UPDATE report_schedules
		SET title = $1, format = $2, frequency = $3, recipient_user_ids = $4, active = $5
		WHERE id = $6::uuid AND church_id = $7
	`, req.Title, req.Format, req.Frequency, pq.Array(req.RecipientIDs), active, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo actualizar la programación"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "programación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Programación actualizada"})
}

// DeleteSchedule removes a report schedule.
func (h *ReportsAnalyticsHandler) DeleteSchedule(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	id := c.Param("id")

	result, err := q.Exec(`DELETE FROM report_schedules WHERE id = $1::uuid AND church_id = $2`, id, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo eliminar la programación"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "programación no encontrada"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Programación eliminada"})
}
