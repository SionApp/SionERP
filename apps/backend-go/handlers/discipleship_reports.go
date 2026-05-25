package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"backend-sion/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

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
	db := config.GetDB()

	// Obtener supervisor del usuario
	var supervisorID sql.NullString
	db.DB.QueryRow(`
		SELECT supervisor_id FROM discipleship_hierarchy WHERE user_id = $1
	`, userID).Scan(&supervisorID)

	reportDataJSON, _ := json.Marshal(req.ReportData)

	var reportID string
	err := db.DB.QueryRow(`
		INSERT INTO discipleship_reports (
			reporter_id, supervisor_id, report_type, report_level,
			period_start, period_end, report_data, status, submitted_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', NOW())
		RETURNING id
	`, userID, supervisorID, req.ReportType, req.ReportLevel,
		req.PeriodStart, req.PeriodEnd, reportDataJSON).Scan(&reportID)

	if err != nil {
		c.Logger().Error("Error creating report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear reporte",
		})
	}

	// Auto-update automatic goal progress from report data (fire-and-forget)
	go autoUpdateGoalProgressFromReport(db, userID, reportID, req.ReportData)

	// Notify supervisor of new report (fire-and-forget)
	if supervisorID.Valid && supervisorID.String != "" {
		db2 := db
		repID := reportID
		supID := supervisorID.String
		go func() {
			utils.CreateNotification(db2, models.NotificationInput{
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
		LEFT JOIN users u ON r.reporter_id = u.id
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	// Filtrar según jerarquía de discipulado:
	// - Cola de aprobación (status=submitted): SIEMPRE filtrar por supervisor_id = yo,
	//   sin importar si es admin/pastor. El Pastor solo aprueba lo que un Coordinador
	//   le reportó directamente — no ve reportes de Líderes que van al Auxiliar.
	// - Otros status: admins ven todo; el resto ve sus reportes + los que supervisan.
	userID := c.Get("user_id").(string)
	if status == "submitted" {
		argCount++
		query += fmt.Sprintf(" AND r.supervisor_id = $%d AND r.reporter_id != $%d", argCount, argCount)
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

	rows, err := db.DB.Query(query, args...)
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

	var reports []ReportWithDetails
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
func autoUpdateGoalProgressFromReport(db *config.Database, reporterID, reportID string, reportData map[string]interface{}) {
	rows, err := db.DB.Query(`
		SELECT ga.id, ga.goal_id, dg.goal_type
		FROM goal_assignments ga
		JOIN discipleship_goals dg ON ga.goal_id = dg.id
		WHERE ga.assigned_to = $1
		  AND ga.status = 'active'
		  AND dg.measurement_type = 'automatic'
	`, reporterID)
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

		tx, err := db.DB.Begin()
		if err != nil {
			continue
		}

		// Insert / update progress (idempotent per assignment + report)
		_, err = tx.Exec(`
			INSERT INTO goal_manual_progress (assignment_id, reporter_id, report_id, value_reported)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (assignment_id, report_id) DO UPDATE
				SET value_reported = EXCLUDED.value_reported
		`, a.id, reporterID, reportID, value)
		if err != nil {
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

		// Step B: walk up the ancestor chain and recompute each as SUM of its children
		tx.Exec(`
			WITH RECURSIVE ancestors AS (
				SELECT parent_assignment_id AS id
				FROM goal_assignments WHERE id = $1 AND parent_assignment_id IS NOT NULL
				UNION ALL
				SELECT ga.parent_assignment_id
				FROM goal_assignments ga
				JOIN ancestors anc ON ga.id = anc.id
				WHERE ga.parent_assignment_id IS NOT NULL
			)
			UPDATE goal_assignments ga
			SET current_value = COALESCE(
				(SELECT SUM(c.current_value) FROM goal_assignments c WHERE c.parent_assignment_id = ga.id), 0),
				updated_at = NOW()
			FROM ancestors anc WHERE ga.id = anc.id
		`, a.id)

		// Step C: sync root total into discipleship_goals.current_value
		tx.Exec(`
			UPDATE discipleship_goals g
			SET current_value = COALESCE(
				(SELECT SUM(current_value) FROM goal_assignments WHERE goal_id = g.id AND parent_assignment_id IS NULL), 0)
			WHERE g.id = $1
		`, a.goalID)

		tx.Commit()
	}
}

// ApproveReport aprueba un reporte
func (h *DiscipleshipReportsHandler) ApproveReport(c echo.Context) error {
	reportID := c.Param("id")
	userID := c.Get("user_id").(string)
	db := config.GetDB()

	// Verificar que el usuario es supervisor del reporte
	var supervisorID, reporterID string
	err := db.DB.QueryRow(`
		SELECT supervisor_id, reporter_id FROM discipleship_reports WHERE id = $1
	`, reportID).Scan(&supervisorID, &reporterID)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Reporte no encontrado",
		})
	}

	// Verificar permisos
	var userRole string
	db.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)

	if supervisorID != userID && !utils.IsAdminRole(userRole) {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para aprobar este reporte",
		})
	}

	_, err = db.DB.Exec(fmt.Sprintf(`
		UPDATE discipleship_reports SET
			status = '%s',
			approved_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, utils.ReportStatusApproved), reportID)

	if err != nil {
		c.Logger().Error("Error approving report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al aprobar reporte",
		})
	}

	// Notify reporter that their report was approved (fire-and-forget)
	repID := reportID
	repOrID := reporterID
	go func() {
		utils.CreateNotification(db, models.NotificationInput{
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

	db := config.GetDB()

	// Resolve reporter_id before UPDATE (mirrors ApproveReport pattern)
	var reporterID string
	err := db.DB.QueryRow(`
		SELECT reporter_id FROM discipleship_reports WHERE id = $1
	`, reportID).Scan(&reporterID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Reporte no encontrado",
		})
	}

	_, err = db.DB.Exec(`
		UPDATE discipleship_reports SET
			status = 'revision_required',
			updated_at = NOW()
		WHERE id = $1
	`, reportID)

	if err != nil {
		c.Logger().Error("Error rejecting report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al rechazar reporte",
		})
	}

	// Notify reporter that their report needs revision (fire-and-forget)
	repID := reportID
	repOrID := reporterID
	go func() {
		utils.CreateNotification(db, models.NotificationInput{
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
