package handlers

import (
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

type DiscipleshipAlertsHandler struct{}

func NewDiscipleshipAlertsHandler() *DiscipleshipAlertsHandler {
	return &DiscipleshipAlertsHandler{}
}

// GetAlerts obtiene alertas con filtros
func (h *DiscipleshipAlertsHandler) GetAlerts(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	resolved := c.QueryParam("resolved")
	zoneIDParam := c.QueryParam("zone_id")
	zoneNameParam := c.QueryParam("zone_name") // Compatibilidad
	priority := c.QueryParam("priority")

	// Determinar zone_id si viene zone_name (compatibilidad)
	var zoneID interface{}
	if zoneIDParam != "" {
		zoneID = zoneIDParam
	} else if zoneNameParam != "" {
		var foundZoneID string
		err = db.DB.QueryRow("SELECT id FROM zones WHERE name = $1", zoneNameParam).Scan(&foundZoneID)
		if err == nil {
			zoneID = foundZoneID
		}
	}

	query := `
		SELECT 
			a.id, a.alert_type, a.title, a.message, a.priority,
			a.related_group_id, a.related_user_id,
			a.zone_id, COALESCE(z.name, '') as zone_name,
			a.action_required, a.resolved, a.resolved_by, a.resolved_at,
			a.expires_at, a.created_at, a.updated_at,
			COALESCE(g.group_name, '') as group_name,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name
		FROM discipleship_alerts a
		LEFT JOIN zones z ON a.zone_id = z.id
		LEFT JOIN discipleship_groups g ON a.related_group_id = g.id
		LEFT JOIN users u ON a.related_user_id = u.id
		WHERE (a.expires_at IS NULL OR a.expires_at > NOW())
	`
	args := []interface{}{}
	argCount := 0

	if resolved != "" {
		argCount++
		query += fmt.Sprintf(" AND a.resolved = $%d", argCount)
		args = append(args, resolved == "true")
	}
	if zoneID != nil {
		argCount++
		query += fmt.Sprintf(" AND a.zone_id = $%d", argCount)
		args = append(args, zoneID)
	}
	if priority != "" {
		argCount++
		query += fmt.Sprintf(" AND a.priority = $%d", argCount)
		args = append(args, priority)
	}

	query += " ORDER BY a.priority ASC, a.created_at DESC LIMIT 100"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching alerts:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener alertas",
		})
	}
	defer rows.Close()

	type AlertWithDetails struct {
		models.DiscipleshipAlert
		GroupName string `json:"group_name,omitempty"`
		UserName  string `json:"user_name,omitempty"`
	}

	var alerts []AlertWithDetails
	for rows.Next() {
		var a AlertWithDetails
		err = rows.Scan(
			&a.ID, &a.AlertType, &a.Title, &a.Message, &a.Priority,
			&a.RelatedGroupID, &a.RelatedUserID,
			&a.ZoneID, &a.ZoneName,
			&a.ActionRequired, &a.Resolved, &a.ResolvedBy, &a.ResolvedAt,
			&a.ExpiresAt, &a.CreatedAt, &a.UpdatedAt,
			&a.GroupName, &a.UserName,
		)
		if err != nil {
			continue
		}
		alerts = append(alerts, a)
	}

	return c.JSON(http.StatusOK, alerts)
}

// CreateAlert crea una nueva alerta
func (h *DiscipleshipAlertsHandler) CreateAlert(c echo.Context) error {
	var req models.CreateAlertRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	db, err := validateDB(c)
	if err != nil {
		return err
	}

	// Determinar zone_id: usar el que viene en el request o buscar por zone_name (compatibilidad)
	var zoneID interface{}
	if req.ZoneID != "" {
		zoneID = req.ZoneID
	} else if req.ZoneName != "" {
		// Compatibilidad: buscar zona por nombre
		var foundZoneID string
		err = db.DB.QueryRow("SELECT id FROM zones WHERE name = $1", req.ZoneName).Scan(&foundZoneID)
		if err == nil {
			zoneID = foundZoneID
		} else {
			zoneID = nil
		}
	} else {
		zoneID = nil
	}

	var alertID string
	err = db.DB.QueryRow(`
		INSERT INTO discipleship_alerts (
			alert_type, title, message, priority,
			related_group_id, related_user_id, zone_id, action_required
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, req.AlertType, req.Title, req.Message, req.Priority,
		nullIfEmpty(req.RelatedGroupID), nullIfEmpty(req.RelatedUserID),
		zoneID, req.ActionRequired).Scan(&alertID)

	if err != nil {
		c.Logger().Error("Error creating alert:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear alerta",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":  "Alerta creada exitosamente",
		"alert_id": alertID,
	})
}

// ResolveAlert marca una alerta como resuelta
func (h *DiscipleshipAlertsHandler) ResolveAlert(c echo.Context) error {
	alertID := c.Param("id")
	userID := c.Get("user_id").(string)
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	result, err := db.DB.Exec(`
		UPDATE discipleship_alerts SET
			resolved = true,
			resolved_by = $1,
			resolved_at = NOW(),
			updated_at = NOW()
		WHERE id = $2
	`, userID, alertID)

	if err != nil {
		c.Logger().Error("Error resolving alert:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al resolver alerta",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Alerta no encontrada",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Alerta resuelta exitosamente",
	})
}

// DeleteAlert elimina una alerta
func (h *DiscipleshipAlertsHandler) DeleteAlert(c echo.Context) error {
	alertID := c.Param("id")
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	result, err := db.DB.Exec("DELETE FROM discipleship_alerts WHERE id = $1", alertID)
	if err != nil {
		c.Logger().Error("Error deleting alert:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar alerta",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Alerta no encontrada",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Alerta eliminada exitosamente",
	})
}

// GenerateAutomaticAlerts genera alertas automáticas basadas en reglas
func (h *DiscipleshipAlertsHandler) GenerateAutomaticAlerts(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}
	alertsCreated := 0

	// 1. Grupos sin reportes en las últimas 2 semanas
	rows, err := db.DB.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.status = 'active'
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_metrics m
			WHERE m.group_id = g.id
			AND m.week_date >= CURRENT_DATE - INTERVAL '14 days'
		)
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.alert_type = 'no_reports'
			AND a.resolved = false
		)
	`)
	if err != nil {
		c.Logger().Error("Error querying groups for alerts:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al generar alertas",
		})
	}
	
	for rows.Next() {
		var groupID, groupName, leaderID string
		var zoneID sql.NullString
		err = rows.Scan(&groupID, &groupName, &leaderID, &zoneID)
		if err != nil {
			continue
		}

		var zoneIDValue interface{}
		if zoneID.Valid {
			zoneIDValue = zoneID.String
		} else {
			zoneIDValue = nil
		}

		_, _ = db.DB.Exec(`
			INSERT INTO discipleship_alerts (
				alert_type, title, message, priority,
				related_group_id, related_user_id, zone_id, action_required
			) VALUES (
				'no_reports',
				'Sin reportes recientes',
				$1,
				2,
				$2, $3, $4, true
			)
		`, fmt.Sprintf("El grupo '%s' no ha enviado reportes en las últimas 2 semanas", groupName),
			groupID, leaderID, zoneIDValue)
		alertsCreated++
	}
	rows.Close()

	// 2. Grupos con baja asistencia (menos del 50% de miembros)
	rows, err = db.DB.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id, g.member_count, 
			   COALESCE(AVG(m.attendance), 0) as avg_attendance
		FROM discipleship_groups g
		LEFT JOIN discipleship_metrics m ON g.id = m.group_id 
			AND m.week_date >= CURRENT_DATE - INTERVAL '28 days'
		WHERE g.status = 'active' AND g.member_count > 0
		GROUP BY g.id, g.group_name, g.leader_id, g.zone_id, g.member_count
		HAVING COALESCE(AVG(m.attendance), 0) < (g.member_count * 0.5)
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.alert_type = 'low_attendance'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
		)
	`)
	if err != nil {
		c.Logger().Error("Error querying groups for attendance alerts:", err)
		rows.Close()
		return c.JSON(http.StatusOK, map[string]interface{}{
			"message":        "Algunas alertas generadas",
			"alerts_created": alertsCreated,
		})
	}

	for rows.Next() {
		var groupID, groupName, leaderID string
		var zoneID sql.NullString
		var memberCount int
		var avgAttendance float64
		err = rows.Scan(&groupID, &groupName, &leaderID, &zoneID, &memberCount, &avgAttendance)
		if err != nil {
			continue
		}

		var zoneIDValue interface{}
		if zoneID.Valid {
			zoneIDValue = zoneID.String
		} else {
			zoneIDValue = nil
		}

		_, _ = db.DB.Exec(`
			INSERT INTO discipleship_alerts (
				alert_type, title, message, priority,
				related_group_id, related_user_id, zone_id, action_required
			) VALUES (
				'low_attendance',
				'Baja asistencia',
				$1,
				3,
				$2, $3, $4, true
			)
		`, fmt.Sprintf("El grupo '%s' tiene una asistencia promedio de %.0f de %d miembros", 
			groupName, avgAttendance, memberCount),
			groupID, leaderID, zoneIDValue)
		alertsCreated++
	}
	rows.Close()

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":        "Alertas automáticas generadas",
		"alerts_created": alertsCreated,
	})
}
