package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
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
// MÉTRICAS SEMANALES
// =====================================================

// CreateMetrics crea métricas semanales para un grupo
func (h *DiscipleshipReportsHandler) CreateMetrics(c echo.Context) error {
	var req models.CreateMetricsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	userID := c.Get("user_id").(string)
	db := config.GetDB()

	// Verificar que el usuario es líder del grupo
	var leaderID string
	err := db.DB.QueryRow(
		"SELECT leader_id FROM discipleship_groups WHERE id = $1",
		req.GroupID,
	).Scan(&leaderID)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Grupo no encontrado",
		})
	}

	// Verificar permisos (líder del grupo, supervisor, o pastor/staff)
	var userRole string
	db.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)

	if leaderID != userID && userRole != "pastor" && userRole != "staff" {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para reportar métricas de este grupo",
		})
	}

	// Verificar si ya existe un reporte para esta semana
	var existingID string
	err = db.DB.QueryRow(`
		SELECT id FROM discipleship_metrics 
		WHERE group_id = $1 AND week_date = $2
	`, req.GroupID, req.WeekDate).Scan(&existingID)

	if err == nil {
		// Ya existe, actualizar
		_, err = db.DB.Exec(`
			UPDATE discipleship_metrics SET
				attendance = $1, new_visitors = $2, returning_visitors = $3,
				conversions = $4, baptisms = $5, spiritual_temperature = $6,
				testimonies_count = $7, prayer_requests = $8, offering_amount = $9,
				leader_notes = $10, updated_at = NOW()
			WHERE id = $11
		`, req.Attendance, req.NewVisitors, req.ReturningVisitors,
			req.Conversions, req.Baptisms, req.SpiritualTemperature,
			req.TestimoniesCount, req.PrayerRequests, req.OfferingAmount,
			req.LeaderNotes, existingID)

		if err != nil {
			c.Logger().Error("Error updating metrics:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Error al actualizar métricas",
			})
		}

		return c.JSON(http.StatusOK, map[string]string{
			"message":    "Métricas actualizadas exitosamente",
			"metrics_id": existingID,
		})
	}

	// Crear nuevo registro
	var metricsID string
	err = db.DB.QueryRow(`
		INSERT INTO discipleship_metrics (
			group_id, week_date, attendance, new_visitors, returning_visitors,
			conversions, baptisms, spiritual_temperature, testimonies_count,
			prayer_requests, offering_amount, leader_notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`, req.GroupID, req.WeekDate, req.Attendance, req.NewVisitors,
		req.ReturningVisitors, req.Conversions, req.Baptisms,
		req.SpiritualTemperature, req.TestimoniesCount, req.PrayerRequests,
		req.OfferingAmount, req.LeaderNotes).Scan(&metricsID)

	if err != nil {
		c.Logger().Error("Error creating metrics:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear métricas",
		})
	}

	// Actualizar conteo de miembros en el grupo
	db.DB.Exec(`
		UPDATE discipleship_groups SET
			active_members = $1,
			updated_at = NOW()
		WHERE id = $2
	`, req.Attendance, req.GroupID)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":    "Métricas creadas exitosamente",
		"metrics_id": metricsID,
	})
}

// GetMetrics obtiene métricas con filtros
func (h *DiscipleshipReportsHandler) GetMetrics(c echo.Context) error {
	db := config.GetDB()

	groupID := c.QueryParam("group_id")
	dateFrom := c.QueryParam("date_from")
	dateTo := c.QueryParam("date_to")

	query := `
		SELECT 
			m.id, m.group_id, m.week_date, m.attendance, m.new_visitors,
			m.returning_visitors, m.conversions, m.baptisms,
			m.spiritual_temperature, m.testimonies_count, m.prayer_requests,
			m.offering_amount, m.leader_notes, m.created_at, m.updated_at,
			g.group_name
		FROM discipleship_metrics m
		LEFT JOIN discipleship_groups g ON m.group_id = g.id
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	if groupID != "" {
		argCount++
		query += fmt.Sprintf(" AND m.group_id = $%d", argCount)
		args = append(args, groupID)
	}
	if dateFrom != "" {
		argCount++
		query += fmt.Sprintf(" AND m.week_date >= $%d", argCount)
		args = append(args, dateFrom)
	}
	if dateTo != "" {
		argCount++
		query += fmt.Sprintf(" AND m.week_date <= $%d", argCount)
		args = append(args, dateTo)
	}

	query += " ORDER BY m.week_date DESC LIMIT 100"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching metrics:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener métricas",
		})
	}
	defer rows.Close()

	type MetricWithGroup struct {
		models.DiscipleshipMetrics
		GroupName string `json:"group_name"`
	}

	var metrics []MetricWithGroup
	for rows.Next() {
		var m MetricWithGroup
		var groupName sql.NullString
		err := rows.Scan(
			&m.ID, &m.GroupID, &m.WeekDate, &m.Attendance, &m.NewVisitors,
			&m.ReturningVisitors, &m.Conversions, &m.Baptisms,
			&m.SpiritualTemperature, &m.TestimoniesCount, &m.PrayerRequests,
			&m.OfferingAmount, &m.LeaderNotes, &m.CreatedAt, &m.UpdatedAt,
			&groupName,
		)
		if err != nil {
			continue
		}
		if groupName.Valid {
			m.GroupName = groupName.String
		}
		metrics = append(metrics, m)
	}

	return c.JSON(http.StatusOK, metrics)
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

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":   "Reporte enviado exitosamente",
		"report_id": reportID,
	})
}

// GetReports obtiene reportes con filtros
func (h *DiscipleshipReportsHandler) GetReports(c echo.Context) error {
	db := config.GetDB()
	userID := c.Get("user_id").(string)

	status := c.QueryParam("status")
	reportType := c.QueryParam("type")
	reporterID := c.QueryParam("reporter_id")

	// Verificar rol del usuario
	var userRole string
	db.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)

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

	// Si no es pastor/staff, solo puede ver sus propios reportes o los de sus subordinados
	if userRole != "pastor" && userRole != "staff" {
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

	if supervisorID != userID && userRole != "pastor" && userRole != "staff" {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para aprobar este reporte",
		})
	}

	_, err = db.DB.Exec(`
		UPDATE discipleship_reports SET
			status = 'approved',
			approved_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, reportID)

	if err != nil {
		c.Logger().Error("Error approving report:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al aprobar reporte",
		})
	}

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

	_, err := db.DB.Exec(`
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

	// TODO: Enviar notificación al reportador con el feedback

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Reporte marcado para revisión",
	})
}
