package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

type ZonesHandler struct{}

func NewZonesHandler() *ZonesHandler {
	return &ZonesHandler{}
}

// GetZones obtiene todas las zonas
func (h *ZonesHandler) GetZones(c echo.Context) error {
	db := config.GetDB()
	
	isActiveParam := c.QueryParam("is_active")
	
	query := `
		SELECT 
			z.id, z.name, z.description, z.color, z.supervisor_id,
			z.boundaries, z.center_lat, z.center_lng, z.is_active,
			z.total_groups, z.total_members, z.avg_attendance,
			z.created_at, z.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as supervisor_name
		FROM zones z
		LEFT JOIN users u ON z.supervisor_id = u.id
		WHERE 1=1
	`
	
	args := []interface{}{}
	argCount := 0
	
	if isActiveParam != "" {
		argCount++
		query += fmt.Sprintf(" AND z.is_active = $%d", argCount)
		args = append(args, isActiveParam == "true")
	}
	
	query += " ORDER BY z.name"
	
	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching zones:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener zonas",
		})
	}
	defer rows.Close()
	
	var zones []models.ZoneWithDetails
	for rows.Next() {
		var z models.ZoneWithDetails
		err := rows.Scan(
			&z.ID, &z.Name, &z.Description, &z.Color, &z.SupervisorID,
			&z.Boundaries, &z.CenterLat, &z.CenterLng, &z.IsActive,
			&z.TotalGroups, &z.TotalMembers, &z.AvgAttendance,
			&z.CreatedAt, &z.UpdatedAt, &z.SupervisorName,
		)
		if err != nil {
			c.Logger().Error("Error scanning zone:", err)
			continue
		}
		zones = append(zones, z)
	}
	
	return c.JSON(http.StatusOK, zones)
}

// GetZone obtiene una zona específica
func (h *ZonesHandler) GetZone(c echo.Context) error {
	zoneID := c.Param("id")
	db := config.GetDB()
	
	query := `
		SELECT 
			z.id, z.name, z.description, z.color, z.supervisor_id,
			z.boundaries, z.center_lat, z.center_lng, z.is_active,
			z.total_groups, z.total_members, z.avg_attendance,
			z.created_at, z.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as supervisor_name
		FROM zones z
		LEFT JOIN users u ON z.supervisor_id = u.id
		WHERE z.id = $1
	`
	
	var z models.ZoneWithDetails
	err := db.DB.QueryRow(query, zoneID).Scan(
		&z.ID, &z.Name, &z.Description, &z.Color, &z.SupervisorID,
		&z.Boundaries, &z.CenterLat, &z.CenterLng, &z.IsActive,
		&z.TotalGroups, &z.TotalMembers, &z.AvgAttendance,
		&z.CreatedAt, &z.UpdatedAt, &z.SupervisorName,
	)
	
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener zona",
		})
	}
	
	return c.JSON(http.StatusOK, z)
}

// CreateZone crea una nueva zona
func (h *ZonesHandler) CreateZone(c echo.Context) error {
	var req models.CreateZoneRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}
	
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "El nombre es requerido",
		})
	}
	
	db := config.GetDB()
	
	color := "#3b82f6"
	if req.Color != "" {
		color = req.Color
	}
	
	query := `
		INSERT INTO zones (name, description, color, supervisor_id, boundaries, center_lat, center_lng)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	
	var supervisorID interface{}
	if req.SupervisorID != "" {
		supervisorID = req.SupervisorID
	} else {
		supervisorID = nil
	}
	
	var description interface{}
	if req.Description != "" {
		description = req.Description
	} else {
		description = nil
	}
	
	var zoneID string
	err := db.DB.QueryRow(
		query,
		req.Name,
		description,
		color,
		supervisorID,
		req.Boundaries,
		req.CenterLat,
		req.CenterLng,
	).Scan(&zoneID)
	
	if err != nil {
		c.Logger().Error("Error creating zone:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear zona",
		})
	}
	
	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "Zona creada exitosamente",
		"zone_id": zoneID,
	})
}

// UpdateZone actualiza una zona
func (h *ZonesHandler) UpdateZone(c echo.Context) error {
	zoneID := c.Param("id")
	
	var req models.UpdateZoneRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}
	
	db := config.GetDB()
	
	query := "UPDATE zones SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 0
	
	if req.Name != nil {
		argCount++
		query += fmt.Sprintf(", name = $%d", argCount)
		args = append(args, *req.Name)
	}
	if req.Description != nil {
		argCount++
		query += fmt.Sprintf(", description = $%d", argCount)
		args = append(args, *req.Description)
	}
	if req.Color != nil {
		argCount++
		query += fmt.Sprintf(", color = $%d", argCount)
		args = append(args, *req.Color)
	}
	if req.SupervisorID != nil {
		argCount++
		query += fmt.Sprintf(", supervisor_id = $%d", argCount)
		if *req.SupervisorID == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.SupervisorID)
		}
	}
	if req.Boundaries != nil {
		argCount++
		query += fmt.Sprintf(", boundaries = $%d", argCount)
		args = append(args, *req.Boundaries)
	}
	if req.CenterLat != nil {
		argCount++
		query += fmt.Sprintf(", center_lat = $%d", argCount)
		args = append(args, *req.CenterLat)
	}
	if req.CenterLng != nil {
		argCount++
		query += fmt.Sprintf(", center_lng = $%d", argCount)
		args = append(args, *req.CenterLng)
	}
	if req.IsActive != nil {
		argCount++
		query += fmt.Sprintf(", is_active = $%d", argCount)
		args = append(args, *req.IsActive)
	}
	
	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, zoneID)
	
	result, err := db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating zone:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar zona",
		})
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Zona actualizada exitosamente",
	})
}

// DeleteZone elimina una zona
func (h *ZonesHandler) DeleteZone(c echo.Context) error {
	zoneID := c.Param("id")
	db := config.GetDB()
	
	// Verificar si hay grupos asignados
	var groupCount int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM discipleship_groups WHERE zone_id = $1", zoneID).Scan(&groupCount)
	if err == nil && groupCount > 0 {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": fmt.Sprintf("No se puede eliminar la zona porque tiene %d grupos asignados", groupCount),
		})
	}
	
	result, err := db.DB.Exec("DELETE FROM zones WHERE id = $1", zoneID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar zona",
		})
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Zona eliminada exitosamente",
	})
}

// GetZoneStats obtiene estadísticas detalladas de una zona
func (h *ZonesHandler) GetZoneStats(c echo.Context) error {
	zoneID := c.Param("id")
	db := config.GetDB()
	
	query := `
		SELECT 
			z.name,
			z.id,
			COALESCE(COUNT(DISTINCT g.id), 0) as total_groups,
			COALESCE(SUM(g.member_count), 0) as total_members,
			COALESCE(AVG(m.attendance), 0) as avg_attendance,
			COALESCE(
				(SELECT COUNT(DISTINCT g2.leader_id) FROM discipleship_groups g2 WHERE g2.zone_id = z.id),
				0
			) as active_leaders
		FROM zones z
		LEFT JOIN discipleship_groups g ON g.zone_id = z.id AND g.status = 'active'
		LEFT JOIN discipleship_metrics m ON m.group_id = g.id
		WHERE z.id = $1
		GROUP BY z.id, z.name
	`
	
	var stats models.ZoneStats
	err := db.DB.QueryRow(query, zoneID).Scan(
		&stats.ZoneName,
		&stats.ZoneID,
		&stats.TotalGroups,
		&stats.TotalMembers,
		&stats.AvgAttendance,
		&stats.ActiveLeaders,
	)
	
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	if err != nil {
		c.Logger().Error("Error getting zone stats:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener estadísticas",
		})
	}
	
	return c.JSON(http.StatusOK, stats)
}

// GetZoneGroups obtiene los grupos de una zona
func (h *ZonesHandler) GetZoneGroups(c echo.Context) error {
	zoneID := c.Param("id")
	db := config.GetDB()
	
	query := `
		SELECT 
			g.id, g.group_name, g.leader_id, g.supervisor_id, g.zone_name,
			g.meeting_day, g.meeting_time, g.meeting_location,
			g.member_count, g.active_members, g.status,
			g.created_at, g.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin líder') as leader_name,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
		FROM discipleship_groups g
		LEFT JOIN users u ON g.leader_id = u.id
		LEFT JOIN users s ON g.supervisor_id = s.id
		WHERE g.zone_id = $1
		ORDER BY g.group_name
	`
	
	rows, err := db.DB.Query(query, zoneID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener grupos",
		})
	}
	defer rows.Close()
	
	var groups []models.DiscipleshipGroupWithDetails
	for rows.Next() {
		var g models.DiscipleshipGroupWithDetails
		err := rows.Scan(
			&g.ID, &g.GroupName, &g.LeaderID, &g.SupervisorID, &g.ZoneName,
			&g.MeetingDay, &g.MeetingTime, &g.MeetingLocation,
			&g.MemberCount, &g.ActiveMembers, &g.Status,
			&g.CreatedAt, &g.UpdatedAt,
			&g.LeaderName, &g.SupervisorName,
		)
		if err != nil {
			continue
		}
		groups = append(groups, g)
	}
	
	return c.JSON(http.StatusOK, groups)
}

// AssignGroupToZone asigna un grupo a una zona
func (h *ZonesHandler) AssignGroupToZone(c echo.Context) error {
	zoneID := c.Param("id")
	groupID := c.Param("groupId")
	
	db := config.GetDB()
	
	// Obtener el nombre de la zona
	var zoneName string
	err := db.DB.QueryRow("SELECT name FROM zones WHERE id = $1", zoneID).Scan(&zoneName)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	
	// Actualizar grupo
	_, err = db.DB.Exec(`
		UPDATE discipleship_groups 
		SET zone_id = $1, zone_name = $2, updated_at = NOW()
		WHERE id = $3
	`, zoneID, zoneName, groupID)
	
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al asignar grupo a zona",
		})
	}
	
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Grupo asignado a zona exitosamente",
	})
}

// AssignUserToZone asigna un usuario a una zona
func (h *ZonesHandler) AssignUserToZone(c echo.Context) error {
	zoneID := c.Param("id")
	userID := c.Param("userId")
	
	db := config.GetDB()
	
	// Obtener el nombre de la zona
	var zoneName string
	err := db.DB.QueryRow("SELECT name FROM zones WHERE id = $1", zoneID).Scan(&zoneName)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}
	
	// Actualizar usuario
	_, err = db.DB.Exec(`
		UPDATE users 
		SET zone_id = $1, zone_name = $2, updated_at = NOW()
		WHERE id = $3
	`, zoneID, zoneName, userID)
	
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al asignar usuario a zona",
		})
	}
	
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Usuario asignado a zona exitosamente",
	})
}


