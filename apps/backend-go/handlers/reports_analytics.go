package handlers

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v4"
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

// GetUsersReport — totals + breakdown by role, active/baptized, new this month.
func (h *ReportsAnalyticsHandler) GetUsersReport(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	var total, active, baptized, newThisMonth int
	_ = db.DB.QueryRow(`
		SELECT count(*),
		       count(*) FILTER (WHERE is_active_member),
		       count(*) FILTER (WHERE baptized),
		       count(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', now()))
		FROM users
	`).Scan(&total, &active, &baptized, &newThisMonth)

	byRole := scanLabelValues(db.DB,
		`SELECT role::text, count(*) FROM users GROUP BY role::text ORDER BY count(*) DESC`)

	return c.JSON(http.StatusOK, map[string]any{
		"total":          total,
		"active_members": active,
		"baptized":       baptized,
		"new_this_month": newThisMonth,
		"by_role":        byRole,
	})
}

// GetGrowthReport — new users per month over the last 12 months.
func (h *ReportsAnalyticsHandler) GetGrowthReport(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	monthly := scanLabelValues(db.DB, `
		SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m, count(*)
		FROM users
		WHERE created_at >= now() - interval '12 months'
		GROUP BY 1 ORDER BY 1
	`)
	return c.JSON(http.StatusOK, map[string]any{"monthly": monthly})
}

// GetDemographicsReport — breakdown by age bucket, marital status and role.
func (h *ReportsAnalyticsHandler) GetDemographicsReport(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	byAge := scanLabelValues(db.DB, `
		SELECT bucket, count(*) FROM (
			SELECT CASE
				WHEN birth_date IS NULL THEN 'Sin dato'
				WHEN date_part('year', age(birth_date)) < 18 THEN '0-17'
				WHEN date_part('year', age(birth_date)) < 26 THEN '18-25'
				WHEN date_part('year', age(birth_date)) < 41 THEN '26-40'
				WHEN date_part('year', age(birth_date)) < 61 THEN '41-60'
				ELSE '60+'
			END AS bucket
			FROM users
		) t GROUP BY bucket ORDER BY bucket
	`)
	byMarital := scanLabelValues(db.DB,
		`SELECT COALESCE(NULLIF(marital_status,''),'Sin dato'), count(*) FROM users GROUP BY 1 ORDER BY count(*) DESC`)
	byRole := scanLabelValues(db.DB,
		`SELECT role::text, count(*) FROM users GROUP BY role::text ORDER BY count(*) DESC`)

	return c.JSON(http.StatusOK, map[string]any{
		"by_age":            byAge,
		"by_marital_status": byMarital,
		"by_role":           byRole,
	})
}

// GetActivitiesReport — event totals + top events by attendance.
func (h *ReportsAnalyticsHandler) GetActivitiesReport(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	var totalEvents, upcoming, totalReg int
	_ = db.DB.QueryRow(
		`SELECT count(*), count(*) FILTER (WHERE event_date >= CURRENT_DATE) FROM events`,
	).Scan(&totalEvents, &upcoming)
	_ = db.DB.QueryRow(
		`SELECT count(*) FROM event_registrations WHERE status = 'going'`,
	).Scan(&totalReg)

	topEvents := scanLabelValues(db.DB, `
		SELECT e.title,
		       (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'going')
		FROM events e
		ORDER BY 2 DESC, e.event_date DESC
		LIMIT 10
	`)

	return c.JSON(http.StatusOK, map[string]any{
		"total_events":        totalEvents,
		"upcoming_events":     upcoming,
		"total_registrations": totalReg,
		"top_events":          topEvents,
	})
}

// LogGeneration records a report generation (trazabilidad).
func (h *ReportsAnalyticsHandler) LogGeneration(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
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
	_, err = db.DB.Exec(`
		INSERT INTO report_generations (report_type, format, title, generated_by)
		VALUES ($1, $2, NULLIF($3,''), NULLIF($4,'')::uuid)
	`, req.ReportType, req.Format, req.Title, callerID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo registrar la generación"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"message": "Registrado"})
}

// GetGenerations lists the report-generation history (trazabilidad).
func (h *ReportsAnalyticsHandler) GetGenerations(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	rows, err := db.DB.Query(`
		SELECT rg.id::text, rg.report_type, rg.format, COALESCE(rg.title,''),
		       COALESCE(TRIM(u.first_name || ' ' || u.last_name), ''),
		       to_char(rg.generated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM report_generations rg
		LEFT JOIN users u ON u.id = rg.generated_by
		ORDER BY rg.generated_at DESC
		LIMIT 100
	`)
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
