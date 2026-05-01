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
	if !utils.IsAdminRole(userRole) {
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
