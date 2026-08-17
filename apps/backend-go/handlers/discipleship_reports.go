package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"backend-sion/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type DiscipleshipReportsHandler struct{}

func NewDiscipleshipReportsHandler() *DiscipleshipReportsHandler {
	return &DiscipleshipReportsHandler{}
}

// =====================================================
// REPORTES CONSOLIDADOS
// =====================================================

// CreateReport crea un reporte consolidado
func (h *DiscipleshipReportsHandler) CreateReport(c echo.Context) error {
	var req models.CreateReportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	userID := c.Get("user_id").(string)
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Obtener supervisor del usuario (scoped to church)
	var supervisorID sql.NullString
	q.QueryRow(`
		SELECT supervisor_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2
	`, userID, churchID).Scan(&supervisorID)

	reportDataJSON, _ := json.Marshal(req.ReportData)

	var reportID string
	err = q.QueryRow(`
		INSERT INTO discipleship_reports (
			reporter_id, supervisor_id, report_type, report_level,
			period_start, period_end, report_data, status, submitted_at, church_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', NOW(), $8)
		RETURNING id
	`, userID, supervisorID, req.ReportType, req.ReportLevel,
		req.PeriodStart, req.PeriodEnd, reportDataJSON, churchID).Scan(&reportID)

	if err != nil {
		c.Logger().Error("Error creating report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear reporte",
		})
	}

	// Write-through: update report_compliance for this user+week inside the same
	// tenant-scoped transaction. This flips a missed row to late/on_time immediately
	// when someone submits after the Saturday sweep has already run.
	//
	// Status logic:
	//   - on_time: submitted at or before Saturday 23:59:59
	//   - late:    submitted after Saturday 23:59:59 (sweep already ran, status was missed)
	//
	// CASE guard in ON CONFLICT:
	//   - missed   → flip to on_time/late (the backfill scenario)
	//   - on_time  → keep on_time (already submitted; no downgrade)
	//   - late     → keep late    (no downgrade)
	//   - pending  → set to on_time/late
	if req.PeriodStart != "" {
		isoW, wMonday, wSaturday, wDue, parseErr := isoWeekFromDateStr(req.PeriodStart)
		if parseErr == nil {
			submitStatus := "on_time"
			if time.Now().After(timeAtEndOfDay(wDue)) {
				submitStatus = "late"
			}

			_, _ = q.Exec(`
				INSERT INTO report_compliance
					(church_id, user_id, iso_week, period_start, period_end, due_date, status, report_id)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (church_id, user_id, iso_week) DO UPDATE
				SET
					status = CASE
						WHEN report_compliance.status = 'missed'             THEN $7
						WHEN report_compliance.status IN ('on_time', 'late') THEN report_compliance.status
						ELSE $7
					END,
					report_id  = EXCLUDED.report_id,
					updated_at = now()
			`, churchID, userID, isoW, wMonday, wSaturday, wDue, submitStatus, reportID)

			// Recompute missed_count (the count decrements when missed→late/on_time).
			var missed int
			_ = q.QueryRow(`
				SELECT COUNT(*)
				FROM report_compliance
				WHERE church_id = $1 AND user_id = $2 AND status = 'missed'
			`, churchID, userID).Scan(&missed)

			_, _ = q.Exec(`
				UPDATE report_compliance
				SET missed_count = $1, updated_at = now()
				WHERE church_id = $2 AND user_id = $3
			`, missed, churchID, userID)
		}
	}

	// Auto-update automatic goal progress from report data (fire-and-forget)
	// Uses the global pool since it runs in a goroutine after the request completes
	db := config.GetDB()
	go autoUpdateGoalProgressFromReport(db, userID, reportID, req.ReportData, churchID)

	// Notify supervisor of new report (fire-and-forget)
	if supervisorID.Valid && supervisorID.String != "" {
		db2 := db
		repID := reportID
		supID := supervisorID.String
		cID := churchID
		go func() {
			utils.CreateNotification(db2, models.NotificationInput{
				ChurchID:          cID,
				UserID:            supID,
				Type:              "info",
				Title:             "Nuevo reporte para revisar",
				Message:           "Un líder a tu cargo envió un reporte.",
				ActionURL:         utils.Ptr("/dashboard/discipleship?tab=reports"),
				ActionText:        utils.Ptr("Ver reportes"),
				RelatedEntityType: utils.Ptr("report"),
				RelatedEntityID:   &repID,
			})
		}()
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":   "Reporte enviado exitosamente",
		"report_id": reportID,
	})
}

// GetReports obtiene reportes con filtros
func (h *DiscipleshipReportsHandler) GetReports(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	db := config.GetDB()
	_, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)

	status := c.QueryParam("status")
	reportType := c.QueryParam("type")
	reporterID := c.QueryParam("reporter_id")

	query := `
		SELECT
			r.id, r.reporter_id, r.supervisor_id, r.report_type, r.report_level,
			r.period_start, r.period_end, r.status, r.report_data,
			r.submitted_at, r.approved_at, r.created_at, r.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as reporter_name
		FROM discipleship_reports r
		LEFT JOIN users u ON r.reporter_id = u.id AND u.church_id = $1
		WHERE r.church_id = $1
	`
	args := []interface{}{churchID}
	argCount := 1

	// Filtrar según jerarquía de discipulado:
	// - Cola de aprobación (status=submitted): filtrar por supervisor_id = yo.
	//   Para canSeeAll (admin/pastor) también se incluyen reportes sin supervisor
	//   asignado (supervisor_id IS NULL) para que no queden huérfanos sin revisar.
	// - Otros status: admins ven todo; el resto ve sus reportes + los que supervisan.
	userID := c.Get("user_id").(string)
	if status == "submitted" {
		argCount++
		if canSeeAll {
			query += fmt.Sprintf(" AND (r.supervisor_id = $%d OR r.supervisor_id IS NULL) AND r.reporter_id != $%d", argCount, argCount)
		} else {
			query += fmt.Sprintf(" AND r.supervisor_id = $%d AND r.reporter_id != $%d", argCount, argCount)
		}
		args = append(args, userID)
	} else if !canSeeAll {
		argCount++
		query += fmt.Sprintf(" AND (r.reporter_id = $%d OR r.supervisor_id = $%d)", argCount, argCount)
		args = append(args, userID)
	}

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND r.status = $%d", argCount)
		args = append(args, status)
	}
	if reportType != "" {
		argCount++
		query += fmt.Sprintf(" AND r.report_type = $%d", argCount)
		args = append(args, reportType)
	}
	if reporterID != "" {
		argCount++
		query += fmt.Sprintf(" AND r.reporter_id = $%d", argCount)
		args = append(args, reporterID)
	}

	query += " ORDER BY r.submitted_at DESC LIMIT 50"

	rows, err := q.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching reports:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener reportes",
		})
	}
	defer rows.Close()

	type ReportWithDetails struct {
		models.DiscipleshipReport
		ReporterName string `json:"reporter_name"`
	}

	// []ReportWithDetails{}, no var-declared nil: un slice nil serializa como
	// JSON null, y el frontend hace data.slice(...) sobre la respuesta — "cola
	// vacía" real (0 filas) tiraba null.slice() del lado del cliente.
	reports := []ReportWithDetails{}
	for rows.Next() {
		var r ReportWithDetails
		var reportDataJSON []byte
		err := rows.Scan(
			&r.ID, &r.ReporterID, &r.SupervisorID, &r.ReportType, &r.ReportLevel,
			&r.PeriodStart, &r.PeriodEnd, &r.Status, &reportDataJSON,
			&r.SubmittedAt, &r.ApprovedAt, &r.CreatedAt, &r.UpdatedAt,
			&r.ReporterName,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(reportDataJSON, &r.ReportData)
		reports = append(reports, r)
	}

	return c.JSON(http.StatusOK, reports)
}

// extractGoalValueFromReport maps a goal_type to the corresponding numeric value
// in the report_data JSONB. Returns (value, true) when a mapping exists, or (0, false)
// for types that are always manual (e.g. "personalizado").
func extractGoalValueFromReport(goalType string, reportData map[string]interface{}) (float64, bool) {
	num := func(key string) float64 {
		v, ok := reportData[key]
		if !ok {
			return 0
		}
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		case bool:
			if n {
				return 1
			}
			return 0
		}
		return 0
	}

	switch goalType {
	case "attendance":
		return num("attendance_nd") + num("attendance_dm") + num("attendance_friends") + num("attendance_kids"), true
	case "growth":
		return num("leader_new_disciples_care"), true
	case "conversions":
		return num("group_evangelism") + num("leader_evangelism"), true
	case "baptisms":
		return num("leader_new_disciples_care"), true
	case "new_groups", "multiplications":
		return num("is_multiplying"), true // boolean → 1 if multiplying this week
	case "spiritual_health":
		return num("spiritual_journal_days"), true
	default:
		// "personalizado" and any unknown types: always manual, no auto extraction
		return 0, false
	}
}

// autoUpdateGoalProgressFromReport finds active automatic goal assignments for the reporter,
// extracts the relevant value from their report_data, and runs the 3-step upward aggregation.
// Designed to run as a goroutine (fire-and-forget).
// Uses the global pool (*config.Database) since it runs after the tenant tx has committed.
func autoUpdateGoalProgressFromReport(db *config.Database, reporterID, reportID string, reportData map[string]interface{}, churchID string) {
	rows, err := db.DB.Query(`
		SELECT ga.id, ga.goal_id, dg.goal_type
		FROM goal_assignments ga
		JOIN discipleship_goals dg ON ga.goal_id = dg.id AND dg.church_id = $2
		WHERE ga.assigned_to = $1
		  AND ga.status = 'active'
		  AND dg.measurement_type = 'automatic'
	`, reporterID, churchID)
	if err != nil {
		return
	}
	defer rows.Close()

	type autoAssignment struct {
		id, goalID, goalType string
	}
	var assignments []autoAssignment
	for rows.Next() {
		var a autoAssignment
		if err := rows.Scan(&a.id, &a.goalID, &a.goalType); err != nil {
			continue
		}
		assignments = append(assignments, a)
	}
	rows.Close()

	for _, a := range assignments {
		value, ok := extractGoalValueFromReport(a.goalType, reportData)
		if !ok {
			continue
		}

		// Solo las HOJAS de la cascada toman su valor de un reporte directo. Un
		// nodo intermedio (ej. un supervisor auxiliar) es una suma de sus hijos,
		// NO su propio reporte — si un supervisor que además es asignado manda su
		// reporte de supervisión, su valor extraído (a menudo 0, porque el
		// reporte de supervisión no trae los campos de asistencia que agrega un
		// objetivo de tipo attendance) pisaría la suma cascadeada de sus líderes.
		// Los intermedios se recalculan solos por el Step B de las hojas.
		var childCount int
		db.DB.QueryRow(`SELECT COUNT(*) FROM goal_assignments WHERE parent_assignment_id = $1`, a.id).Scan(&childCount)
		if childCount > 0 {
			continue
		}

		tx, err := db.DB.Begin()
		if err != nil {
			log.Printf("[autoUpdateGoalProgressFromReport] begin tx failed for assignment %s: %v", a.id, err)
			continue
		}

		// Insert / update progress (idempotent per assignment + report)
		_, err = tx.Exec(`
			INSERT INTO goal_manual_progress (assignment_id, reporter_id, report_id, value_reported, church_id)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (assignment_id, report_id) DO UPDATE
				SET value_reported = EXCLUDED.value_reported
		`, a.id, reporterID, reportID, value, churchID)
		if err != nil {
			log.Printf("[autoUpdateGoalProgressFromReport] insert progress failed for assignment %s: %v", a.id, err)
			tx.Rollback()
			continue
		}

		// Step A: recompute leaf assignment from all its progress entries
		tx.Exec(`
			UPDATE goal_assignments
			SET current_value = COALESCE(
				(SELECT SUM(value_reported) FROM goal_manual_progress WHERE assignment_id = $1), 0),
				updated_at = NOW()
			WHERE id = $1
		`, a.id)

		// Step B: walk up the ancestor chain ONE LEVEL AT A TIME. A single
		// recursive-CTE UPDATE across every ancestor at once looks correct but
		// isn't: every row's SET subquery reads the table's snapshot from the
		// START of that statement, so a grandparent's SUM sees its child's OLD
		// value, not the value this same statement is also writing to that
		// child — only the immediate parent ever ends up correct, everything
		// above it silently stays 0. Sequential single-level UPDATEs each see
		// the prior UPDATE's committed write within the same tx, so the sum
		// actually climbs the tree instead of stalling one hop up.
		var parentID sql.NullString
		tx.QueryRow(`SELECT parent_assignment_id FROM goal_assignments WHERE id = $1`, a.id).Scan(&parentID)
		for parentID.Valid {
			current := parentID.String
			tx.Exec(`
				UPDATE goal_assignments
				SET current_value = COALESCE(
					(SELECT SUM(current_value) FROM goal_assignments WHERE parent_assignment_id = $1), 0),
					updated_at = NOW()
				WHERE id = $1
			`, current)
			parentID = sql.NullString{}
			tx.QueryRow(`SELECT parent_assignment_id FROM goal_assignments WHERE id = $1`, current).Scan(&parentID)
		}

		// Step C: sync root total into discipleship_goals.current_value.
		// Unlike goal_assignments.progress_percentage (a GENERATED column that
		// recomputes itself), discipleship_goals.progress_percentage is a plain
		// column — GoalCard.tsx renders it directly, so it has to be set here too,
		// not just current_value.
		tx.Exec(`
			UPDATE discipleship_goals g
			SET current_value = COALESCE(
				(SELECT SUM(current_value) FROM goal_assignments WHERE goal_id = g.id AND parent_assignment_id IS NULL), 0),
				progress_percentage = CASE WHEN g.target_value > 0 THEN
					ROUND(COALESCE(
						(SELECT SUM(current_value) FROM goal_assignments WHERE goal_id = g.id AND parent_assignment_id IS NULL), 0
					)::numeric / g.target_value * 100, 2)
				ELSE 0 END
			WHERE g.id = $1 AND g.church_id = $2
		`, a.goalID, churchID)

		tx.Commit()
	}
}

// GetZoneRollup sums level-1 leader reports in the caller's zone for the given
// period (period_start..period_end). Used by the supervision report modal to
// pre-fill zone totals.
//
// GET /api/v1/discipleship/zone-rollup?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
//
// Response:
//
//	{
//	  zone_total_discipleships: int,
//	  zone_total_evangelism:    int,
//	  contributing_leaders:     int,   -- distinct reporters with a submitted/approved report
//	  unmapped_leaders:         int,   -- level-1 hierarchy users with NULL zone_id
//	  caller_unmapped:          bool   -- true when the caller has no zone_id
//	}
func (h *DiscipleshipReportsHandler) GetZoneRollup(c echo.Context) error {
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	userID := c.Get("user_id").(string)
	ps := c.QueryParam("period_start")
	pe := c.QueryParam("period_end")
	if ps == "" || pe == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "period_start and period_end are required (YYYY-MM-DD)",
		})
	}

	// Resolve caller's level + zone from their discipleship_hierarchy row (church-scoped).
	var level int
	var zoneID sql.NullString
	q.QueryRow(
		`SELECT hierarchy_level, zone_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2`,
		userID, churchID,
	).Scan(&level, &zoneID)

	if !zoneID.Valid || zoneID.String == "" {
		// Caller has no zone — return zeroes and flag so the UI can warn.
		return c.JSON(http.StatusOK, map[string]interface{}{
			"zone_total_discipleships": 0,
			"zone_total_evangelism":    0,
			"contributing_leaders":     0,
			"unmapped_leaders":         0,
			"caller_unmapped":          true,
		})
	}

	// Scope the rollup by the caller's responsibility subtree, not by zone_id —
	// a zone can hold multiple Generals, so zone_id would leak a sibling's leaders.
	//   L2 Auxiliary       → leaders directly under me
	//   L3 General         → leaders two hops under me (under my auxiliaries)
	//   L4 Coordinator / L5 → the whole zone (a coordinator owns the zone)
	sumBase := `
		SELECT
		  COALESCE(SUM((r.report_data->>'group_discipleships')::int), 0),
		  COALESCE(SUM(
		     COALESCE((r.report_data->>'group_evangelism')::int, 0) +
		     COALESCE((r.report_data->>'leader_evangelism')::int, 0)
		  ), 0),
		  COUNT(DISTINCT r.reporter_id)
		FROM discipleship_reports r
		JOIN discipleship_hierarchy h
		  ON h.user_id = r.reporter_id AND h.church_id = r.church_id
		WHERE r.church_id = $1
		  AND r.report_level = 1
		  AND r.status IN ('submitted', 'approved')
		  AND r.period_start >= $2
		  AND r.period_end <= $3
		  AND `

	var disc, evang, contributing int
	switch level {
	case 2:
		q.QueryRow(sumBase+`r.reporter_id IN (`+directLeaderIDsSubquery(1, 4)+`)`,
			churchID, ps, pe, userID).Scan(&disc, &evang, &contributing)
	case 3:
		q.QueryRow(sumBase+`r.reporter_id IN (`+subtreeLeaderIDsSubquery(1, 4)+`)`,
			churchID, ps, pe, userID).Scan(&disc, &evang, &contributing)
	default:
		q.QueryRow(sumBase+`h.zone_id = $4`,
			churchID, ps, pe, zoneID.String).Scan(&disc, &evang, &contributing)
	}

	// Unmapped leaders: level-1 users in this church with no zone_id assigned.
	var unmapped int
	q.QueryRow(`
		SELECT COUNT(*)
		FROM discipleship_hierarchy h
		WHERE h.church_id = $1
		  AND h.hierarchy_level = 1
		  AND (h.zone_id IS NULL OR h.zone_id::text = '')
	`, churchID).Scan(&unmapped)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"zone_total_discipleships": disc,
		"zone_total_evangelism":    evang,
		"contributing_leaders":     contributing,
		"unmapped_leaders":         unmapped,
		"caller_unmapped":          false,
	})
}

// ApproveReport aprueba un reporte
func (h *DiscipleshipReportsHandler) ApproveReport(c echo.Context) error {
	reportID := c.Param("id")
	userID := c.Get("user_id").(string)

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Verificar que el usuario es supervisor del reporte (scoped to church).
	// supervisor_id es NULL para el reporte de un Coordinador (tope de la
	// jerarquía, sin fila de supervisor) — escanear a sql.NullString, no a
	// string: un Scan NULL→string falla y ese error caía en el mismo 404
	// "Reporte no encontrado" que "la fila no existe", escondiendo el bug real.
	var supervisorID sql.NullString
	var reporterID string
	err = q.QueryRow(`
		SELECT supervisor_id, reporter_id FROM discipleship_reports WHERE id = $1 AND church_id = $2
	`, reportID, churchID).Scan(&supervisorID, &reporterID)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Reporte no encontrado",
		})
	}

	// Verificar permisos
	var userRole string
	q.QueryRow("SELECT role FROM users WHERE id = $1 AND church_id = $2", userID, churchID).Scan(&userRole)

	if supervisorID.String != userID && !utils.IsAdminRole(userRole) {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para aprobar este reporte",
		})
	}

	_, err = q.Exec(fmt.Sprintf(`
		UPDATE discipleship_reports SET
			status = '%s',
			approved_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND church_id = $2
	`, utils.ReportStatusApproved), reportID, churchID)

	if err != nil {
		c.Logger().Error("Error approving report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al aprobar reporte",
		})
	}

	// Notify reporter that their report was approved (fire-and-forget)
	db := config.GetDB()
	repID := reportID
	repOrID := reporterID
	cID := churchID
	go func() {
		utils.CreateNotification(db, models.NotificationInput{
			ChurchID:          cID,
			UserID:            repOrID,
			Type:              "success",
			Title:             "Tu reporte fue aprobado",
			Message:           "Tu supervisor aprobó tu reporte.",
			ActionURL:         utils.Ptr("/dashboard/discipleship?tab=reports"),
			ActionText:        utils.Ptr("Ver mis reportes"),
			RelatedEntityType: utils.Ptr("report"),
			RelatedEntityID:   &repID,
		})
	}()

	// Notify the approver's OWN supervisor too — one level up from whoever
	// approved (e.g. the líder's report gets approved by the aux, the aux's
	// supervisor — the general — gets an FYI that a report moved through
	// their downline, even though they didn't touch it themselves).
	go func() {
		var grandSupervisorID sql.NullString
		db.DB.QueryRow(`
			SELECT supervisor_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2
		`, userID, cID).Scan(&grandSupervisorID)
		if grandSupervisorID.Valid && grandSupervisorID.String != "" {
			utils.CreateNotification(db, models.NotificationInput{
				ChurchID:          cID,
				UserID:            grandSupervisorID.String,
				Type:              "info",
				Title:             "Se recibió un reporte en tu equipo",
				Message:           "Un reporte fue revisado y aprobado en tu línea de supervisión.",
				ActionURL:         utils.Ptr("/dashboard/discipleship?tab=reports"),
				ActionText:        utils.Ptr("Ver reportes"),
				RelatedEntityType: utils.Ptr("report"),
				RelatedEntityID:   &repID,
			})
		}
	}()

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Reporte aprobado exitosamente",
	})
}

// RejectReport rechaza un reporte
func (h *DiscipleshipReportsHandler) RejectReport(c echo.Context) error {
	reportID := c.Param("id")

	var req struct {
		Feedback string `json:"feedback"`
	}
	c.Bind(&req)

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	// Resolve reporter_id before UPDATE (scoped to church)
	var reporterID string
	err = q.QueryRow(`
		SELECT reporter_id FROM discipleship_reports WHERE id = $1 AND church_id = $2
	`, reportID, churchID).Scan(&reporterID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Reporte no encontrado",
		})
	}

	_, err = q.Exec(`
		UPDATE discipleship_reports SET
			status = 'revision_required',
			updated_at = NOW()
		WHERE id = $1 AND church_id = $2
	`, reportID, churchID)

	if err != nil {
		c.Logger().Error("Error rejecting report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al rechazar reporte",
		})
	}

	// Notify reporter that their report needs revision (fire-and-forget)
	db := config.GetDB()
	repID := reportID
	repOrID := reporterID
	cID2 := churchID
	go func() {
		utils.CreateNotification(db, models.NotificationInput{
			ChurchID:          cID2,
			UserID:            repOrID,
			Type:              "warning",
			Title:             "Tu reporte necesita revisión",
			Message:           "Tu supervisor solicitó cambios.",
			ActionURL:         utils.Ptr("/dashboard/discipleship?tab=reports"),
			ActionText:        utils.Ptr("Ver reporte"),
			RelatedEntityType: utils.Ptr("report"),
			RelatedEntityID:   &repID,
		})
	}()

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Reporte marcado para revisión",
	})
}
