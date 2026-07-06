package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

// ReportComplianceHandler serves the /discipleship/compliance/* endpoints.
type ReportComplianceHandler struct{}

func NewReportComplianceHandler() *ReportComplianceHandler {
	return &ReportComplianceHandler{}
}

// isoWeekLabel formats a time.Time as an ISO-8601 week string "YYYY-Www".
// Uses Go stdlib time.ISOWeek() which implements the ISO-8601 Jan4 method,
// matching the frontend getIsoWeek() utility in src/lib/iso-week.ts.
func isoWeekLabel(t time.Time) string {
	y, w := t.ISOWeek()
	return fmt.Sprintf("%04d-W%02d", y, w)
}

// GetMyCompliance returns the compliance row for the requesting user for a given
// ISO week. Defaults to the current ISO week when ?iso_week= is not provided.
//
// GET /api/v1/discipleship/compliance/me?iso_week=YYYY-Www
//
// Response (row found):
//
//	{ iso_week, status, missed_count, report_id, due_date }
//
// Response (no row):
//
//	{ iso_week, status: "pending", missed_count: 0 }
func (h *ReportComplianceHandler) GetMyCompliance(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing user context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	week := c.QueryParam("iso_week")
	if week == "" {
		week = isoWeekLabel(time.Now())
	}

	var status string
	var missedCount int
	var reportID sql.NullString
	var dueDate sql.NullString

	err = q.QueryRow(`
		SELECT status, missed_count, report_id::text, due_date::text
		FROM report_compliance
		WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
	`, churchID, userID, week).Scan(&status, &missedCount, &reportID, &dueDate)

	if err == sql.ErrNoRows {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"iso_week":     week,
			"status":       "pending",
			"missed_count": 0,
		})
	}
	if err != nil {
		c.Logger().Error("GetMyCompliance query error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener cumplimiento",
		})
	}

	resp := map[string]interface{}{
		"iso_week":     week,
		"status":       status,
		"missed_count": missedCount,
	}
	if reportID.Valid {
		resp["report_id"] = reportID.String
	}
	if dueDate.Valid {
		resp["due_date"] = dueDate.String
	}
	return c.JSON(http.StatusOK, resp)
}

// GetSubordinatesCompliance returns per-user per-week compliance rows for all
// direct subordinates of the requesting user in the discipleship hierarchy.
//
// GET /api/v1/discipleship/compliance/subordinates?weeks=8
//
// Default look-back window: 8 weeks.
// Returns rows: { user_id, user_name, iso_week, period_start, status, missed_count }
func (h *ReportComplianceHandler) GetSubordinatesCompliance(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing user context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	weeks := 8
	if w := c.QueryParam("weeks"); w != "" {
		if parsed, err := strconv.Atoi(w); err == nil && parsed > 0 {
			weeks = parsed
		}
	}

	// A General Supervisor (L3) is responsible for the LEADERS under their
	// auxiliaries, not just the auxiliaries themselves — show the full leaf
	// subtree. Everyone else sees their direct subordinates (supervisor_id = me).
	var level int
	q.QueryRow(
		`SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2`,
		userID, churchID,
	).Scan(&level)

	scope := `h.supervisor_id = $2`
	if level == 3 {
		scope = `h.user_id IN (` + subtreeLeaderIDsSubquery(1, 2) + `)`
	}

	rows, err := q.Query(fmt.Sprintf(`
		SELECT
			u.id                                          AS user_id,
			COALESCE(u.first_name || ' ' || u.last_name, u.email) AS user_name,
			rc.iso_week,
			rc.period_start::text,
			rc.status,
			rc.missed_count
		FROM discipleship_hierarchy h
		JOIN users u ON u.id = h.user_id AND u.church_id = $1
		JOIN report_compliance rc ON rc.user_id = h.user_id AND rc.church_id = $1
		WHERE h.church_id = $1
		  AND %s
		  AND rc.period_start >= (CURRENT_DATE - ($3 || ' weeks')::interval)::date
		ORDER BY rc.period_start DESC, user_name ASC
	`, scope), churchID, userID, strconv.Itoa(weeks))

	if err != nil {
		c.Logger().Error("GetSubordinatesCompliance query error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener cumplimiento de subordinados",
		})
	}
	defer rows.Close()

	type row struct {
		UserID      string `json:"user_id"`
		UserName    string `json:"user_name"`
		IsoWeek     string `json:"iso_week"`
		PeriodStart string `json:"period_start"`
		Status      string `json:"status"`
		MissedCount int    `json:"missed_count"`
	}

	var result []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.UserID, &r.UserName, &r.IsoWeek, &r.PeriodStart, &r.Status, &r.MissedCount); err != nil {
			continue
		}
		result = append(result, r)
	}

	if result == nil {
		result = []row{}
	}
	return c.JSON(http.StatusOK, result)
}
