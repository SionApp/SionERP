package handlers

import (
	"backend-sion/config"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// StartWeeklyReportScheduler launches the goroutine that fires every Saturday
// at 23:00 server local time and sweeps compliance for ALL churches.
func StartWeeklyReportScheduler() {
	go func() {
		for {
			next := nextSaturdayAt23(time.Now())
			log.Printf("[scheduler] próxima revisión de cumplimiento: %s", next.Format("Mon 02/01 15:04"))
			time.Sleep(time.Until(next))

			db := config.GetDB()
			if db == nil || db.DB == nil {
				log.Println("[scheduler] DB no disponible, omitiendo revisión")
				continue
			}

			count, err := runComplianceSweep(db.DB, time.Now())
			if err != nil {
				log.Printf("[scheduler] error en sweep de cumplimiento: %v", err)
			} else {
				log.Printf("[scheduler] alertas de cumplimiento creadas: %d", count)
			}
		}
	}()
}

// TenantPurgeGraceDays: días desde que un tenant queda status='cancelled'
// hasta que StartTenantPurgeScheduler borra sus datos automáticamente.
// Decisión de negocio, no técnica — 30 días es el default de la industria.
const TenantPurgeGraceDays = 30

// tenantPurgeCheckInterval: cada cuánto corre el chequeo. Diario alcanza —
// no hace falta más granularidad para un borrado con 30 días de margen.
const tenantPurgeCheckInterval = 24 * time.Hour

// StartTenantPurgeScheduler lanza la goroutine que, una vez por día, busca
// tenants cancelados hace más de TenantPurgeGraceDays y todavía no
// purgados, y les borra los datos (purgeChurchData) dentro de una
// transacción. Si algo falla en un tenant, loguea y sigue con el resto —
// un tenant con error no bloquea el borrado de los demás.
func StartTenantPurgeScheduler() {
	go func() {
		for {
			db := config.GetDB()
			if db == nil || db.DB == nil {
				log.Println("[scheduler] purga de tenants: DB no disponible, omitiendo")
			} else if err := runTenantPurgeSweep(db.DB); err != nil {
				log.Printf("[scheduler] error en sweep de purga de tenants: %v", err)
			}
			time.Sleep(tenantPurgeCheckInterval)
		}
	}()
}

// runTenantPurgeSweep busca churches elegibles y las purga una por una.
func runTenantPurgeSweep(db *sql.DB) error {
	rows, err := db.Query(`
		SELECT id, name FROM public.churches
		WHERE status = 'cancelled'
		  AND cancelled_at IS NOT NULL
		  AND cancelled_at <= NOW() - ($1 || ' days')::interval
		  AND deleted_at IS NULL
	`, TenantPurgeGraceDays)
	if err != nil {
		return fmt.Errorf("runTenantPurgeSweep: query candidates: %w", err)
	}

	type candidate struct{ id, name string }
	var candidates []candidate
	for rows.Next() {
		var c candidate
		if scanErr := rows.Scan(&c.id, &c.name); scanErr == nil {
			candidates = append(candidates, c)
		}
	}
	if closeErr := rows.Close(); closeErr != nil {
		return fmt.Errorf("runTenantPurgeSweep: closing rows: %w", closeErr)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("runTenantPurgeSweep: iterating candidates: %w", err)
	}

	for _, c := range candidates {
		counts, purgeErr := purgeChurchData(db, c.id)
		if purgeErr != nil {
			log.Printf("[scheduler] purga de tenant %s (%s) falló, NO se borró nada: %v", c.id, c.name, purgeErr)
			continue
		}

		var totalRows int64
		for _, n := range counts {
			totalRows += n
		}

		if _, err := db.Exec(`UPDATE public.churches SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`, c.id); err != nil {
			log.Printf("[scheduler] tenant %s (%s): datos purgados (%d filas) pero no se pudo marcar deleted_at: %v", c.id, c.name, totalRows, err)
			continue
		}

		log.Printf("[scheduler] tenant %s (%s) purgado: %d filas borradas en %d tablas", c.id, c.name, totalRows, len(counts))
	}

	return nil
}

// nextSaturdayAt23 returns the next Saturday at 23:00 local time after `from`.
// If `from` is already Saturday but before 23:00, it returns today's 23:00.
// If `from` is Saturday at or after 23:01, it returns next Saturday's 23:00.
func nextSaturdayAt23(from time.Time) time.Time {
	const sat = time.Saturday
	days := (int(sat) - int(from.Weekday()) + 7) % 7
	if days == 0 && (from.Hour() > 23 || (from.Hour() == 23 && from.Minute() >= 1)) {
		days = 7
	}
	t := from.AddDate(0, 0, days)
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 0, 0, 0, from.Location())
}

// isoWeek formats a time.Time as an ISO-8601 week string "YYYY-Www".
// Uses Go stdlib time.ISOWeek() which implements the ISO-8601 Jan4 method —
// matches the frontend getIsoWeek() utility in src/lib/iso-week.ts.
// NOTE: isoWeekLabel() in report_compliance.go is the same function;
// both live in the same package so both are accessible. isoWeek is the
// scheduler-local alias kept for test clarity.
func isoWeek(t time.Time) string {
	y, w := t.ISOWeek()
	return fmt.Sprintf("%04d-W%02d", y, w)
}

// justEndedWeekBounds returns the Monday..Saturday of the ISO week that
// contains `now`. When fired at Saturday 23:00 this is the week that just closed.
//
// offset: Mon=0, Tue=1, … Sat=5, Sun=6 (so Monday is subtracted by Go weekday-1 with wrap).
func justEndedWeekBounds(now time.Time) (monday, saturday time.Time, week string) {
	// Go's time.Weekday: Sun=0, Mon=1, … Sat=6
	// We want Monday as day 0 of the ISO week.
	offset := (int(now.Weekday()) + 6) % 7 // Mon→0, Tue→1, …, Sun→6
	monday = time.Date(now.Year(), now.Month(), now.Day()-offset, 0, 0, 0, 0, now.Location())
	saturday = monday.AddDate(0, 0, 5)
	week = isoWeek(monday)
	return
}

// isoWeekFromDateStr parses a YYYY-MM-DD string and derives:
// - the ISO week label (YYYY-Www)
// - the Monday of that ISO week (period_start)
// - the Saturday of that ISO week (period_end / due_date)
// - the due date (Saturday of that week, same as period_end for v1)
// Returns an error if the string cannot be parsed.
func isoWeekFromDateStr(s string) (isoW string, monday, saturday, dueDate time.Time, err error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return "", time.Time{}, time.Time{}, time.Time{},
			fmt.Errorf("isoWeekFromDateStr: invalid date %q: %w", s, err)
	}
	// Back up to Monday of that ISO week.
	offset := (int(t.Weekday()) + 6) % 7
	monday = time.Date(t.Year(), t.Month(), t.Day()-offset, 0, 0, 0, 0, t.Location())
	saturday = monday.AddDate(0, 0, 5)
	dueDate = saturday
	isoW = isoWeek(monday)
	return
}

// timeAtEndOfDay returns 23:59:59 of the given date (same location).
// Used to determine whether a submission crossed the Saturday deadline.
func timeAtEndOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
}

// runComplianceSweep fetches every church from the superuser pool, then
// calls sweepChurch for each one using the ISO week that just ended.
// Returns the total number of new alerts created across all churches.
//
// The scheduler runs OUTSIDE TenantTx (it is a background goroutine, not an
// HTTP request), so it uses the superuser pool directly. Per-church isolation
// is enforced by passing explicit church_id to every query inside sweepChurch.
func runComplianceSweep(db *sql.DB, now time.Time) (int, error) {
	monday, saturday, week := justEndedWeekBounds(now)

	rows, err := db.Query(`SELECT id FROM churches`)
	if err != nil {
		return 0, fmt.Errorf("runComplianceSweep: fetching churches: %w", err)
	}
	defer rows.Close()

	var churchIDs []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			churchIDs = append(churchIDs, id)
		}
	}
	rows.Close()

	total := 0
	for _, cid := range churchIDs {
		n, err := sweepChurch(db, cid, monday, saturday, week)
		if err != nil {
			log.Printf("[scheduler] church %s sweep error: %v", cid, err)
			continue
		}
		total += n
	}
	return total, nil
}

// sweepChurch processes compliance for a single church for the given ISO week.
// For every active discipleship hierarchy user at level 1-4 it:
//  1. Checks whether they submitted a report for this exact period.
//  2. UPSERTs a report_compliance row (CASE guard: never overwrite on_time/late → missed).
//  3. Recomputes missed_count via COUNT (ground truth, not blind increment).
//  4. Fires a missed_report alert (addressed to the user) if missed and not yet notified.
//  5. Fires an escalated_non_compliance alert (addressed to the supervisor) when
//     missed_count >= 3 and escalation has not been sent yet.
//
// Returns the count of new alerts created.
func sweepChurch(db *sql.DB, churchID string, monday, saturday time.Time, week string) (int, error) {
	due := saturday // v1: due_date == Saturday of the week

	// Fetch all active hierarchy users for this church, levels 1-4.
	rows, err := db.Query(`
		SELECT
			h.user_id,
			COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
			h.hierarchy_level,
			h.supervisor_id
		FROM discipleship_hierarchy h
		JOIN users u ON u.id = h.user_id AND u.church_id = $1
		WHERE h.church_id = $1
		  AND u.is_active = true
		  AND h.hierarchy_level BETWEEN 1 AND 4
	`, churchID)
	if err != nil {
		return 0, fmt.Errorf("sweepChurch(%s): fetching hierarchy: %w", churchID, err)
	}
	defer rows.Close()

	type hierarchyUser struct {
		uid   string
		name  string
		level int
		sup   sql.NullString
	}
	var users []hierarchyUser
	for rows.Next() {
		var u hierarchyUser
		if rows.Scan(&u.uid, &u.name, &u.level, &u.sup) == nil {
			users = append(users, u)
		}
	}
	rows.Close()

	created := 0
	for _, u := range users {
		// 1. Did this user submit a report for this exact period?
		var reportID sql.NullString
		var submittedAt sql.NullTime
		_ = db.QueryRow(`
			SELECT id, submitted_at
			FROM discipleship_reports
			WHERE church_id   = $1
			  AND reporter_id = $2
			  AND report_level = $3
			  AND status IN ('submitted', 'approved')
			  AND period_start = $4
			  AND period_end   = $5
			ORDER BY submitted_at DESC
			LIMIT 1
		`, churchID, u.uid, u.level, monday, saturday).Scan(&reportID, &submittedAt)

		// Determine compliance status for this week.
		status := "missed"
		var ridArg interface{} // nil → SQL NULL for report_id when no report exists
		if reportID.Valid {
			ridArg = reportID.String
			// Submitted after Saturday 23:59:59 → late; otherwise on_time.
			if submittedAt.Valid && submittedAt.Time.After(timeAtEndOfDay(due)) {
				status = "late"
			} else {
				status = "on_time"
			}
		}

		// 2. UPSERT compliance row.
		// CASE guard: never overwrite an existing on_time or late status back to missed.
		// This protects against a re-sweep clobbering a write-through flip.
		_, _ = db.Exec(`
			INSERT INTO report_compliance
				(church_id, user_id, iso_week, period_start, period_end, due_date, status, report_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (church_id, user_id, iso_week) DO UPDATE
			SET
				status = CASE
					WHEN report_compliance.status IN ('on_time', 'late') THEN report_compliance.status
					ELSE EXCLUDED.status
				END,
				report_id  = COALESCE(EXCLUDED.report_id, report_compliance.report_id),
				updated_at = now()
		`, churchID, u.uid, week, monday, saturday, due, status, ridArg)

		// 3. Recompute missed_count from ground truth (COUNT, not increment).
		// Updates only the current week's row to avoid a full-table update.
		var missed int
		_ = db.QueryRow(`
			SELECT COUNT(*)
			FROM report_compliance
			WHERE church_id = $1 AND user_id = $2 AND status = 'missed'
		`, churchID, u.uid).Scan(&missed)

		_, _ = db.Exec(`
			UPDATE report_compliance
			SET missed_count = $1, updated_at = now()
			WHERE church_id = $2 AND user_id = $3 AND iso_week = $4
		`, missed, churchID, u.uid, week)

		// 4. Failer nudge: fire once per (user, week) when status is missed.
		if status == "missed" {
			var notified bool
			_ = db.QueryRow(`
				SELECT notified_failer
				FROM report_compliance
				WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
			`, churchID, u.uid, week).Scan(&notified)

			if !notified {
				_, _ = db.Exec(`
					INSERT INTO discipleship_alerts
						(alert_type, title, message, priority,
						 related_user_id, addressed_to, action_required, church_id)
					VALUES ('missed_report', $1, $2, 3, $3, $3, true, $4)
				`,
					"Reporte semanal pendiente",
					fmt.Sprintf("No enviaste tu reporte de la semana %s. Enviálo cuanto antes.", week),
					u.uid,
					churchID,
				)
				_, _ = db.Exec(`
					UPDATE report_compliance
					SET notified_failer = true, updated_at = now()
					WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
				`, churchID, u.uid, week)
				created++
			}
		}

		// 5. Escalation to supervisor when missed_count >= 3, once per crossing event.
		// escalation_sent is per-row (per-week), so recovery + relapse re-arms naturally:
		// a future week's row will have escalation_sent=false when it crosses the threshold.
		if missed >= 3 && u.sup.Valid && u.sup.String != "" {
			var escalated bool
			_ = db.QueryRow(`
				SELECT escalation_sent
				FROM report_compliance
				WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
			`, churchID, u.uid, week).Scan(&escalated)

			if !escalated {
				_, _ = db.Exec(`
					INSERT INTO discipleship_alerts
						(alert_type, title, message, priority,
						 related_user_id, addressed_to, action_required, church_id)
					VALUES ('escalated_non_compliance', $1, $2, 1, $3, $4, true, $5)
				`,
					"Incumplimiento de reportes (3+ semanas)",
					fmt.Sprintf("%s acumula %d semanas sin reporte. Requiere seguimiento.", u.name, missed),
					u.uid,
					u.sup.String,
					churchID,
				)
				_, _ = db.Exec(`
					UPDATE report_compliance
					SET escalation_sent = true, updated_at = now()
					WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
				`, churchID, u.uid, week)
				created++
			}
		}
	}

	return created, nil
}

// SchedulerHandler exposes endpoints to administer the scheduler.
type SchedulerHandler struct{}

func NewSchedulerHandler() *SchedulerHandler {
	return &SchedulerHandler{}
}

// TriggerMissingReportsCheck allows manually triggering the compliance sweep
// without waiting for Saturday. Useful for testing and manual runs from the panel.
//
// POST /discipleship/trigger-report-check
func (h *SchedulerHandler) TriggerMissingReportsCheck(c echo.Context) error {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "Base de datos no disponible",
		})
	}

	count, err := runComplianceSweep(db.DB, time.Now())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error en sweep de cumplimiento: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"alerts_created": count,
		"message":        fmt.Sprintf("Sweep completado. %d alertas nuevas creadas.", count),
		"checked_at":     time.Now().Format(time.RFC3339),
	})
}
