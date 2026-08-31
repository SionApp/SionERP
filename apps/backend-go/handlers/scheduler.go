package handlers

import (
	"backend-sion/config"
	"backend-sion/emails"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
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

// StartReportReminderScheduler lanza la goroutine que fira todos los viernes
// a las 12:00 hora local del servidor y avisa PREVENTIVAMENTE a quien todavía
// no envió el reporte de la semana en curso — antes de que se cumpla el
// vencimiento (sábado 23:00), no después. Issue #34.
func StartReportReminderScheduler() {
	go func() {
		for {
			next := nextFridayAt12(time.Now())
			log.Printf("[scheduler] próximo recordatorio preventivo: %s", next.Format("Mon 02/01 15:04"))
			time.Sleep(time.Until(next))

			db := config.GetDB()
			if db == nil || db.DB == nil {
				log.Println("[scheduler] DB no disponible, omitiendo recordatorio")
				continue
			}

			count, err := runReminderSweep(db.DB, time.Now())
			if err != nil {
				log.Printf("[scheduler] error en sweep de recordatorios: %v", err)
			} else {
				log.Printf("[scheduler] recordatorios preventivos creados: %d", count)
			}
		}
	}()
}

// nextFridayAt12 — mismo patrón que nextSaturdayAt23, un día antes del
// vencimiento (sábado) para dar tiempo real a reaccionar.
func nextFridayAt12(from time.Time) time.Time {
	const fri = time.Friday
	days := (int(fri) - int(from.Weekday()) + 7) % 7
	if days == 0 && (from.Hour() > 12 || (from.Hour() == 12 && from.Minute() >= 1)) {
		days = 7
	}
	t := from.AddDate(0, 0, days)
	return time.Date(t.Year(), t.Month(), t.Day(), 12, 0, 0, 0, from.Location())
}

// runReminderSweep recorre todas las iglesias y avisa a los usuarios de
// jerarquía 1-4 que todavía no enviaron el reporte de la semana EN CURSO
// (la que todavía no venció). Devuelve la cantidad de recordatorios creados.
func runReminderSweep(db *sql.DB, now time.Time) (int, error) {
	monday, saturday, week := justEndedWeekBounds(now) // misma semana, todavía no vencida un viernes

	rows, err := db.Query(`SELECT id FROM churches`)
	if err != nil {
		return 0, fmt.Errorf("runReminderSweep: fetching churches: %w", err)
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
		n, err := sweepChurchReminders(db, cid, monday, saturday, week)
		if err != nil {
			log.Printf("[scheduler] church %s reminder sweep error: %v", cid, err)
			continue
		}
		total += n
	}
	return total, nil
}

// sweepChurchReminders recorre los usuarios activos de jerarquía 1-4 de una
// iglesia y, para quien todavía no reportó esta semana y no fue avisado
// todavía, crea una alerta 'report_reminder' + una fila report_compliance en
// 'pending' con reminder_sent=true. Cuando corra sweepChurch el sábado, esa
// fila 'pending' se transiciona normalmente a on_time/late/missed (el guard
// de status solo protege on_time/late, no pending).
func sweepChurchReminders(db *sql.DB, churchID string, monday, saturday time.Time, week string) (int, error) {
	due := saturday

	rows, err := db.Query(`
		SELECT h.user_id, h.hierarchy_level
		FROM discipleship_hierarchy h
		JOIN users u ON u.id = h.user_id AND u.church_id = $1
		WHERE h.church_id = $1
		  AND u.is_active = true
		  AND h.hierarchy_level BETWEEN 1 AND 4
	`, churchID)
	if err != nil {
		return 0, fmt.Errorf("sweepChurchReminders(%s): fetching hierarchy: %w", churchID, err)
	}
	defer rows.Close()

	type hierarchyUser struct {
		uid   string
		level int
	}
	var users []hierarchyUser
	for rows.Next() {
		var u hierarchyUser
		if rows.Scan(&u.uid, &u.level) == nil {
			users = append(users, u)
		}
	}
	rows.Close()

	created := 0
	for _, u := range users {
		var alreadySubmitted bool
		_ = db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM discipleship_reports
				WHERE church_id = $1 AND reporter_id = $2 AND report_level = $3
				  AND status IN ('submitted', 'approved')
				  AND period_start = $4 AND period_end = $5
			)
		`, churchID, u.uid, u.level, monday, saturday).Scan(&alreadySubmitted)
		if alreadySubmitted {
			continue
		}

		var alreadyReminded bool
		_ = db.QueryRow(`
			SELECT reminder_sent FROM report_compliance
			WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
		`, churchID, u.uid, week).Scan(&alreadyReminded)
		if alreadyReminded {
			continue
		}

		_, _ = db.Exec(`
			INSERT INTO report_compliance
				(church_id, user_id, iso_week, period_start, period_end, due_date, status, reminder_sent)
			VALUES ($1, $2, $3, $4, $5, $6, 'pending', true)
			ON CONFLICT (church_id, user_id, iso_week) DO UPDATE
			SET reminder_sent = true, updated_at = now()
		`, churchID, u.uid, week, monday, saturday, due)

		_, _ = db.Exec(`
			INSERT INTO discipleship_alerts
				(alert_type, title, message, priority,
				 related_user_id, addressed_to, action_required, church_id)
			VALUES ('report_reminder', $1, $2, 4, $3, $3, true, $4)
		`,
			"Tu reporte semanal vence mañana",
			fmt.Sprintf("Todavía no enviaste el reporte de la semana %s. Vence el sábado.", week),
			u.uid,
			churchID,
		)
		created++
	}

	return created, nil
}

// notificationQueueInterval: cada cuánto se procesa notification_queue.
// 5 minutos alcanza — el único productor hoy (escalamiento semanal) no es
// urgente al segundo, y evita golpear la API de Resend en un loop ajustado.
const notificationQueueInterval = 5 * time.Minute

// StartNotificationQueueWorker lanza la goroutine que procesa
// notification_queue cada 5 minutos: toma las filas 'pending' de canal
// 'email' y las manda con el EmailService (Resend) ya usado para invitaciones.
// Si el email no está configurado (mismo IsEmailEnabled() que usa invite.go),
// no hace nada — no falla, solo espera a que se configure.
func StartNotificationQueueWorker() {
	go func() {
		for {
			db := config.GetDB()
			if db != nil && db.DB != nil {
				if err := processNotificationQueue(db.DB); err != nil {
					log.Printf("[scheduler] error procesando notification_queue (email): %v", err)
				}
				if err := processPushQueue(db.DB); err != nil {
					log.Printf("[scheduler] error procesando notification_queue (push): %v", err)
				}
			}
			time.Sleep(notificationQueueInterval)
		}
	}()
}

func processNotificationQueue(db *sql.DB) error {
	emailConfig := config.GetEmailConfig()
	if !emailConfig.IsEmailEnabled() {
		return nil // sin proveedor configurado, nada que hacer todavía
	}
	emailService := emails.NewEmailService(emailConfig.APIKey, emailConfig.FromEmail, emailConfig.FrontendURL)

	rows, err := db.Query(`
		SELECT nq.id, nq.church_id, u.email, nq.subject, nq.body,
		       nq.tone, COALESCE(nq.action_url, ''), COALESCE(nq.action_label, '')
		FROM notification_queue nq
		JOIN users u ON u.id = nq.user_id
		WHERE nq.status = 'pending' AND nq.channel = 'email'
		ORDER BY nq.created_at
		LIMIT 50
	`)
	if err != nil {
		return fmt.Errorf("processNotificationQueue: querying pending: %w", err)
	}
	defer rows.Close()

	type pending struct {
		id, churchID, email, subject, body string
		tone, actionURL, actionLabel       string
	}
	var items []pending
	for rows.Next() {
		var p pending
		if rows.Scan(&p.id, &p.churchID, &p.email, &p.subject, &p.body,
			&p.tone, &p.actionURL, &p.actionLabel) == nil {
			items = append(items, p)
		}
	}
	rows.Close()

	// Cache de marca por iglesia: un batch suele tener varias filas de la
	// misma iglesia (ej. un escalamiento a varios supervisores), no tiene
	// sentido repetir la misma consulta para cada una.
	brandCache := map[string]emails.ChurchBranding{}
	brandFor := func(churchID string) emails.ChurchBranding {
		if b, ok := brandCache[churchID]; ok {
			return b
		}
		var b emails.ChurchBranding
		_ = db.QueryRow(
			`SELECT COALESCE(name, ''), COALESCE(logo_url, ''), COALESCE(primary_color, '')
			 FROM church_info WHERE church_id = $1`, churchID,
		).Scan(&b.Name, &b.LogoURL, &b.PrimaryColor)
		brandCache[churchID] = b
		return b
	}

	for _, p := range items {
		sendErr := emailService.SendQueuedNotification(p.email, emails.QueuedEmailData{
			Church:      brandFor(p.churchID),
			Subject:     p.subject,
			Body:        p.body,
			Tone:        p.tone,
			ActionURL:   p.actionURL,
			ActionLabel: p.actionLabel,
		})
		if sendErr != nil {
			_, _ = db.Exec(
				"UPDATE notification_queue SET status = 'failed', error = $1 WHERE id = $2",
				sendErr.Error(), p.id,
			)
			continue
		}
		_, _ = db.Exec(
			"UPDATE notification_queue SET status = 'sent', sent_at = now() WHERE id = $1", p.id,
		)
	}
	return nil
}

// processPushQueue toma las filas 'pending' de canal 'push' y las empuja a los
// navegadores suscritos del usuario (sendWebPushToUser). Si el push no está
// configurado (sin llaves VAPID) no hace nada — igual que el email sin Resend.
// Una fila cuyo usuario no tiene ninguna suscripción viva se marca 'sent'
// igual: la cola cumplió su parte, no hay a quién entregar y no es un error.
func processPushQueue(db *sql.DB) error {
	if !config.GetPushConfig().IsPushEnabled() {
		return nil
	}

	rows, err := db.Query(`
		SELECT id, user_id, subject, body
		FROM notification_queue
		WHERE status = 'pending' AND channel = 'push'
		ORDER BY created_at
		LIMIT 50
	`)
	if err != nil {
		return fmt.Errorf("processPushQueue: querying pending: %w", err)
	}
	type pending struct {
		id, userID, subject, body string
	}
	var items []pending
	for rows.Next() {
		var p pending
		if rows.Scan(&p.id, &p.userID, &p.subject, &p.body) == nil {
			items = append(items, p)
		}
	}
	rows.Close()

	for _, p := range items {
		_, sendErr := sendWebPushToUser(db, p.userID, p.subject, p.body, "/")
		if sendErr != nil {
			_, _ = db.Exec(
				"UPDATE notification_queue SET status = 'failed', error = $1 WHERE id = $2",
				sendErr.Error(), p.id,
			)
			continue
		}
		_, _ = db.Exec(
			"UPDATE notification_queue SET status = 'sent', sent_at = now() WHERE id = $1", p.id,
		)
	}
	return nil
}

// reportScheduleCheckInterval: cada cuánto se revisan report_schedules
// vencidos. Una hora alcanza — la granularidad real es weekly/monthly.
const reportScheduleCheckInterval = 1 * time.Hour

// StartReportScheduleDispatcher lanza la goroutine que, cada hora, busca
// report_schedules activos con next_run_at vencido, avisa a los destinatarios
// vía notification_queue (issue #52) y reprograma la próxima corrida.
// Issue #67.
func StartReportScheduleDispatcher() {
	go func() {
		for {
			db := config.GetDB()
			if db != nil && db.DB != nil {
				if n, err := runReportScheduleSweep(db.DB, time.Now()); err != nil {
					log.Printf("[scheduler] error en dispatcher de reportes programados: %v", err)
				} else if n > 0 {
					log.Printf("[scheduler] reportes programados despachados: %d", n)
				}
			}
			time.Sleep(reportScheduleCheckInterval)
		}
	}()
}

func runReportScheduleSweep(db *sql.DB, now time.Time) (int, error) {
	rows, err := db.Query(`
		SELECT id, church_id, report_type, format, title, frequency, recipient_user_ids
		FROM report_schedules
		WHERE active = true AND next_run_at <= $1
	`, now)
	if err != nil {
		return 0, fmt.Errorf("runReportScheduleSweep: querying due schedules: %w", err)
	}

	type due struct {
		id, churchID, reportType, format, title, frequency string
		recipients                                         []string
	}
	var items []due
	for rows.Next() {
		var d due
		if scanErr := rows.Scan(&d.id, &d.churchID, &d.reportType, &d.format, &d.title,
			&d.frequency, pq.Array(&d.recipients)); scanErr == nil {
			items = append(items, d)
		}
	}
	rows.Close()

	frontendURL := config.GetEmailConfig().FrontendURL
	dispatched := 0
	for _, d := range items {
		subject := fmt.Sprintf("Reporte programado listo: %s", d.title)
		body := fmt.Sprintf(
			"Tu reporte \"%s\" (%s) ya está disponible. Entrá a Reportes en el sistema para verlo y exportarlo en %s.",
			d.title, d.reportType, d.format,
		)
		for _, uid := range d.recipients {
			_, _ = db.Exec(`
				INSERT INTO notification_queue (church_id, user_id, channel, subject, body, tone, action_url, action_label)
				VALUES ($1, $2, 'email', $3, $4, 'success', $5, 'Ver reporte')
			`, d.churchID, uid, subject, body, frontendURL+"/dashboard/reports")
		}
		_, _ = db.Exec(`
			INSERT INTO report_generations (report_type, format, title, church_id)
			VALUES ($1, $2, $3, $4)
		`, d.reportType, d.format, d.title, d.churchID)
		_, _ = db.Exec(`
			UPDATE report_schedules SET next_run_at = $1 WHERE id = $2
		`, nextRunFor(d.frequency, now), d.id)
		dispatched++
	}
	return dispatched, nil
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

				// Además de la alerta in-app, encolar un email al supervisor —
				// esto puede pasar desapercibido si no abre la app seguido.
				var supEmail string
				if err := db.QueryRow(
					"SELECT email FROM users WHERE id = $1 AND church_id = $2", u.sup.String, churchID,
				).Scan(&supEmail); err == nil && supEmail != "" {
					_, _ = db.Exec(`
						INSERT INTO notification_queue (church_id, user_id, channel, subject, body, tone, action_url, action_label)
						VALUES ($1, $2, 'email', $3, $4, 'warning', $5, 'Ver seguimiento')
					`,
						churchID, u.sup.String,
						"Incumplimiento de reportes (3+ semanas)",
						fmt.Sprintf("%s acumula %d semanas sin enviar su reporte semanal. Requiere seguimiento.", u.name, missed),
						config.GetEmailConfig().FrontendURL+"/dashboard/discipleship",
					)
				}

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

// TriggerReminderCheck fuerza manualmente el sweep de recordatorios
// preventivos (issue #34), sin esperar al viernes 12:00.
func (h *SchedulerHandler) TriggerReminderCheck(c echo.Context) error {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "Base de datos no disponible",
		})
	}

	count, err := runReminderSweep(db.DB, time.Now())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error en sweep de recordatorios: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"reminders_created": count,
		"message":           fmt.Sprintf("Sweep completado. %d recordatorios nuevos creados.", count),
		"checked_at":        time.Now().Format(time.RFC3339),
	})
}

// TriggerNotificationQueueProcess fuerza manualmente el procesamiento de
// notification_queue (issue #52), sin esperar los 5 minutos del worker.
func (h *SchedulerHandler) TriggerNotificationQueueProcess(c echo.Context) error {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "Base de datos no disponible",
		})
	}

	if err := processNotificationQueue(db.DB); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error procesando cola de notificaciones: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Cola de notificaciones procesada",
	})
}
