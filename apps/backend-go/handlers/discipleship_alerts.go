package handlers

import (
	"backend-sion/config"
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	db := config.GetDB()
	// userZoneID no longer used for GetAlerts case 3 (replaced by subtree scoping).
	userID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, db)

	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado",
		})
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
		err = q.QueryRow("SELECT id FROM zones WHERE name = $1 AND church_id = $2", zoneNameParam, churchID).Scan(&foundZoneID)
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
		LEFT JOIN zones z ON a.zone_id = z.id AND z.church_id = $1
		LEFT JOIN discipleship_groups g ON a.related_group_id = g.id AND g.church_id = $1
		LEFT JOIN users u ON a.related_user_id = u.id AND u.church_id = $1
		WHERE a.church_id = $1
		AND (a.expires_at IS NULL OR a.expires_at > NOW())
	`
	args := []interface{}{churchID}
	argCount := 1

	// Filtrar según nivel jerárquico
	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			argCount++
			query += fmt.Sprintf(" AND (a.related_user_id = $%d", argCount)
			args = append(args, userID)
			argCount++
			query += fmt.Sprintf(" OR a.related_group_id IN (SELECT id FROM discipleship_groups WHERE leader_id = $%d AND church_id = $1))", argCount)
			args = append(args, userID)
		case 2:
			argCount++
			query += fmt.Sprintf(" AND (a.related_group_id IN (SELECT id FROM discipleship_groups WHERE supervisor_id = $%d AND church_id = $1)", argCount)
			args = append(args, userID)
			argCount++
			query += fmt.Sprintf(" OR a.addressed_to = $%d)", argCount)
			args = append(args, userID)
		case 3:
			// General Supervisor (L3) — groups in their 2-hop leader subtree.
			// Old zone_id arm closed the ACTIVE DATA LEAK (sibling General's groups).
			// Keep addressed_to arm so escalated alerts directed to this General still appear.
			argCount++
			supPos := argCount
			query += fmt.Sprintf(
				" AND (a.related_group_id IN (SELECT id FROM discipleship_groups WHERE leader_id IN (%s) AND church_id = $1) OR a.addressed_to = $%d)",
				subtreeLeaderIDsSubquery(1, supPos),
				supPos+1,
			)
			argCount++
			args = append(args, userID, userID)
		case 4, 5:
			// Coordinador/Pastoral: see all alerts in their church scope.
			// Also surface alerts explicitly addressed to them (e.g. escalations).
			argCount++
			query += fmt.Sprintf(" AND (1=1 OR a.addressed_to = $%d)", argCount)
			args = append(args, userID)
		}
	}

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

	rows, err := q.Query(query, args...)
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

	// []AlertWithDetails{}, no nil: mismo motivo que GetReports — un slice nil
	// serializa como JSON null y el frontend hace data.slice(...) sobre esto.
	alerts := []AlertWithDetails{}
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

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	// Determinar zone_id: usar el que viene en el request o buscar por zone_name (compatibilidad)
	var zoneID interface{}
	if req.ZoneID != "" {
		zoneID = req.ZoneID
	} else if req.ZoneName != "" {
		// Compatibilidad: buscar zona por nombre
		var foundZoneID string
		err = q.QueryRow("SELECT id FROM zones WHERE name = $1 AND church_id = $2", req.ZoneName, churchID).Scan(&foundZoneID)
		if err == nil {
			zoneID = foundZoneID
		} else {
			zoneID = nil
		}
	} else {
		zoneID = nil
	}

	var alertID string
	err = q.QueryRow(`
		INSERT INTO discipleship_alerts (
			alert_type, title, message, priority,
			related_group_id, related_user_id, zone_id, action_required, church_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, req.AlertType, req.Title, req.Message, req.Priority,
		nullIfEmpty(req.RelatedGroupID), nullIfEmpty(req.RelatedUserID),
		zoneID, req.ActionRequired, churchID).Scan(&alertID)

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

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	result, err := q.Exec(`
		UPDATE discipleship_alerts SET
			resolved = true,
			resolved_by = $1,
			resolved_at = NOW(),
			updated_at = NOW()
		WHERE id = $2 AND church_id = $3
	`, userID, alertID, churchID)

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

	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	result, err := q.Exec("DELETE FROM discipleship_alerts WHERE id = $1 AND church_id = $2", alertID, churchID)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	alertsCreated := 0

	// =====================================================
	// ALERTAS CRÍTICAS / DE ATENCIÓN
	// =====================================================

	// 1. Grupos sin reportes en las últimas 2 semanas (crítica)
	rows, err := q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '14 days'
		)
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'no_reports'
			AND a.resolved = false
		)
	`, churchID)
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

		_, _ = q.Exec(`
			INSERT INTO discipleship_alerts (
				alert_type, title, message, priority,
				related_group_id, related_user_id, zone_id, action_required, church_id
			) VALUES (
				'no_reports',
				'Sin reportes recientes',
				$1,
				2,
				$2, $3, $4, true, $5
			)
		`, fmt.Sprintf("El grupo '%s' no ha enviado reportes en las últimas 2 semanas", groupName),
			groupID, leaderID, zoneIDValue, churchID)
		alertsCreated++
	}
	rows.Close()

	// 2. Grupos con baja asistencia (menos del 50% de miembros por 4 semanas)
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id, g.member_count,
			   COALESCE((
			   	SELECT AVG(
			   		COALESCE((r.report_data->>'attendance_nd')::int, 0) +
			   		COALESCE((r.report_data->>'attendance_dm')::int, 0) +
			   		COALESCE((r.report_data->>'attendance_friends')::int, 0) +
			   		COALESCE((r.report_data->>'attendance_kids')::int, 0)
			   	)
			   	FROM discipleship_reports r
			   	WHERE (r.report_data->>'group_id')::uuid = g.id
			   	AND r.church_id = $1
			   	AND r.report_type = 'leader'
			   	AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			   ), 0) as avg_attendance
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active' AND g.member_count > 0
		AND COALESCE((
			SELECT AVG(
				COALESCE((r.report_data->>'attendance_nd')::int, 0) +
				COALESCE((r.report_data->>'attendance_dm')::int, 0) +
				COALESCE((r.report_data->>'attendance_friends')::int, 0) +
				COALESCE((r.report_data->>'attendance_kids')::int, 0)
			)
			FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
		), 0) < (g.member_count * 0.5)
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'low_attendance'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for attendance alerts:", err)
	} else {
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

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'low_attendance',
					'Baja asistencia',
					$1,
					3,
					$2, $3, $4, true, $5
				)
			`, fmt.Sprintf("El grupo '%s' tiene asistencia promedio de %.0f de %d miembros",
				groupName, avgAttendance, memberCount),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// 2.5. Discipulados insuficientes — el último reporte tiene menos discipulados
	// que discípulos maduros (regla pastoral: cada DM debería estar discipulando a alguien).
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id, lr.attendance_dm, lr.group_discipleships
		FROM discipleship_groups g
		JOIN LATERAL (
			SELECT
				COALESCE((r.report_data->>'attendance_dm')::int, 0) AS attendance_dm,
				COALESCE((r.report_data->>'group_discipleships')::int, 0) AS group_discipleships
			FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			ORDER BY r.period_end DESC
			LIMIT 1
		) lr ON true
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND lr.attendance_dm > 0
		AND lr.group_discipleships < lr.attendance_dm
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'insufficient_discipleship'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for insufficient discipleship:", err)
	} else {
		for rows.Next() {
			var groupID, groupName, leaderID string
			var zoneID sql.NullString
			var attendanceDM, groupDiscipleships int
			err = rows.Scan(&groupID, &groupName, &leaderID, &zoneID, &attendanceDM, &groupDiscipleships)
			if err != nil {
				continue
			}

			var zoneIDValue interface{}
			if zoneID.Valid {
				zoneIDValue = zoneID.String
			} else {
				zoneIDValue = nil
			}

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'insufficient_discipleship',
					'Discipulados por debajo de lo esperado',
					$1,
					3,
					$2, $3, $4, true, $5
				)
			`, fmt.Sprintf("El grupo '%s' tiene %d discípulos maduros pero reportó solo %d discipulados (se esperan al menos %d)",
				groupName, attendanceDM, groupDiscipleships, attendanceDM),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// 3. Declive espiritual — temperatura calculada < 5 por 4 semanas seguidas
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id,
			COALESCE((
				SELECT AVG(
					CASE WHEN COALESCE((r.report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
					CASE WHEN (r.report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
					CASE WHEN (r.report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
					CASE WHEN COALESCE((r.report_data->>'doctrine_attendance')::int, 0) > 0 THEN 1 ELSE 0 END
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $1
				AND r.report_type = 'leader'
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as avg_temp
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND COALESCE((
			SELECT AVG(
				CASE WHEN COALESCE((r.report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN (r.report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
				CASE WHEN (r.report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'doctrine_attendance')::int, 0) > 0 THEN 1 ELSE 0 END
			)
			FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
		), 0) < 5
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'spiritual_decline'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for spiritual decline:", err)
	} else {
		for rows.Next() {
			var groupID, groupName, leaderID string
			var zoneID sql.NullString
			var avgTemp float64
			err = rows.Scan(&groupID, &groupName, &leaderID, &zoneID, &avgTemp)
			if err != nil {
				continue
			}

			var zoneIDValue interface{}
			if zoneID.Valid {
				zoneIDValue = zoneID.String
			} else {
				zoneIDValue = nil
			}

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'spiritual_decline',
					'Declive espiritual',
					$1,
					2,
					$2, $3, $4, true, $5
				)
			`, fmt.Sprintf("El grupo '%s' tiene temperatura espiritual baja (%.1f/13) en las últimas 4 semanas",
				groupName, avgTemp),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// 4. Sin evangelismo ni discipulados por 8 semanas (no_growth)
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '56 days'
			AND (
				COALESCE((r.report_data->>'group_evangelism')::int, 0) > 0
				OR COALESCE((r.report_data->>'leader_evangelism')::int, 0) > 0
				OR COALESCE((r.report_data->>'group_discipleships')::int, 0) > 0
			)
		)
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'no_growth'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for no growth:", err)
	} else {
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

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'no_growth',
					'Sin crecimiento',
					$1,
					3,
					$2, $3, $4, true, $5
				)
			`, fmt.Sprintf("El grupo '%s' no ha reportado evangelismo ni discipulados en 8 semanas", groupName),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// =====================================================
	// ALERTAS DE CELEBRACIÓN
	// =====================================================

	// 5. Consistencia — 12 semanas consecutivas con reportes
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND (
			SELECT COUNT(*) FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '84 days'
		) >= 12
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'consistency_milestone'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '14 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for consistency:", err)
	} else {
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

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'consistency_milestone',
					'¡12 semanas consecutivas!',
					$1,
					5,
					$2, $3, $4, false, $5
				)
			`, fmt.Sprintf("El grupo '%s' lleva 12 semanas reportando consistentemente. ¡Excelente compromiso!", groupName),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// 6. Evangelismo activo — group_evangelism + leader_evangelism > 0 por 4 semanas
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND (
			SELECT COUNT(*) FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			AND (
				COALESCE((r.report_data->>'group_evangelism')::int, 0) > 0
				OR COALESCE((r.report_data->>'leader_evangelism')::int, 0) > 0
			)
		) >= 4
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'evangelism_champion'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '14 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for evangelism:", err)
	} else {
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

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'evangelism_champion',
					'¡Campeón de evangelismo!',
					$1,
					5,
					$2, $3, $4, false, $5
				)
			`, fmt.Sprintf("El grupo '%s' ha evangelizado activamente durante 4 semanas seguidas", groupName),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	// 7. Grupo sólido — temperatura >= 8 por 12 semanas
	rows, err = q.Query(`
		SELECT g.id, g.group_name, g.leader_id, g.zone_id
		FROM discipleship_groups g
		WHERE g.church_id = $1
		AND g.status = 'active'
		AND (
			SELECT COUNT(*) FROM discipleship_reports r
			WHERE (r.report_data->>'group_id')::uuid = g.id
			AND r.church_id = $1
			AND r.report_type = 'leader'
			AND r.period_end >= CURRENT_DATE - INTERVAL '84 days'
			AND (
				CASE WHEN COALESCE((r.report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
				CASE WHEN (r.report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
				CASE WHEN (r.report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
				CASE WHEN COALESCE((r.report_data->>'doctrine_attendance')::int, 0) > 0 THEN 1 ELSE 0 END
			) >= 8
		) >= 12
		AND NOT EXISTS (
			SELECT 1 FROM discipleship_alerts a
			WHERE a.related_group_id = g.id
			AND a.church_id = $1
			AND a.alert_type = 'solid_group'
			AND a.resolved = false
			AND a.created_at >= CURRENT_DATE - INTERVAL '14 days'
		)
	`, churchID)
	if err != nil {
		c.Logger().Error("Error querying groups for solid status:", err)
	} else {
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

			_, _ = q.Exec(`
				INSERT INTO discipleship_alerts (
					alert_type, title, message, priority,
					related_group_id, related_user_id, zone_id, action_required, church_id
				) VALUES (
					'solid_group',
					'¡Grupo sólido!',
					$1,
					5,
					$2, $3, $4, false, $5
				)
			`, fmt.Sprintf("El grupo '%s' mantiene alta salud espiritual (≥8/13) durante 12 semanas. ¡Es columna vertebral del ministerio!", groupName),
				groupID, leaderID, zoneIDValue, churchID)
			alertsCreated++
		}
		rows.Close()
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":        "Alertas automáticas generadas",
		"alerts_created": alertsCreated,
	})
}
