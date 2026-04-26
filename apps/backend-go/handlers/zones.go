package handlers

import (
	"backend-sion/models"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

type ZonesHandler struct{}

func NewZonesHandler() *ZonesHandler {
	return &ZonesHandler{}
}

type geoJSONGeometry struct {
	Type        string           `json:"type"`
	Coordinates *json.RawMessage `json:"coordinates"`
}

func validateZoneBoundaries(boundaries json.RawMessage) error {
	if len(bytes.TrimSpace(boundaries)) == 0 {
		return nil
	}

	var geometry geoJSONGeometry
	if err := json.Unmarshal(boundaries, &geometry); err != nil {
		return fmt.Errorf("boundaries debe ser JSON valido: %w", err)
	}

	if geometry.Type != "Polygon" && geometry.Type != "MultiPolygon" {
		return fmt.Errorf("boundaries.type debe ser Polygon o MultiPolygon")
	}

	if geometry.Coordinates == nil {
		return fmt.Errorf("boundaries.coordinates es requerido")
	}

	return nil
}

// GetZones obtiene todas las zonas

func (h *ZonesHandler) GetZones(c echo.Context) error {
	db, err := validateDB(c)

	if err != nil {
		return err
	}

	isActiveParam := c.QueryParam("is_active")

	query := `
	SELECT
		z.id, z.name, COALESCE(z.description, '') as description, z.color, COALESCE(z.supervisor_id::text, '') as supervisor_id,
		z.boundaries, COALESCE(z.center_lat, 0) as center_lat, COALESCE(z.center_lng, 0) as center_lng, z.is_active,
		COALESCE(z.total_groups, 0) as total_groups, COALESCE(z.total_members, 0) as total_members, COALESCE(z.avg_attendance, 0) as avg_attendance,
		z.created_at, z.updated_at,
		COALESCE(u.first_name || ' ' || u.last_name, '') as
		supervisor_name
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

func (h *ZonesHandler) GetZone(c echo.Context) error {
	zoneID := c.Param("id")
	db, err := validateDB(c)

	if err != nil {
		return err
	}

	query := `
	SELECT
		z.id, z.name, COALESCE(z.description, '') as description, z.color, COALESCE(z.supervisor_id::text, '') as supervisor_id,
		z.boundaries, COALESCE(z.center_lat, 0) as center_lat, COALESCE(z.center_lng, 0) as center_lng, z.is_active,
		COALESCE(z.total_groups, 0) as total_groups, COALESCE(z.total_members, 0) as total_members, COALESCE(z.avg_attendance, 0) as avg_attendance,
		z.created_at, z.updated_at,
		COALESCE(u.first_name || ' ' || u.last_name, '') as supervisor_name
		FROM zones z
		LEFT JOIN users u ON z.supervisor_id = u.id
		WHERE z.id = $1
	`

	var z models.ZoneWithDetails
	err = db.DB.QueryRow(query, zoneID).Scan(
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

	if err := validateZoneBoundaries(req.Boundaries); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	db, err := validateDB(c)

	if err != nil {
		return err
	}

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

	var boundaries interface{}
	if len(bytes.TrimSpace(req.Boundaries)) > 0 {
		boundaries = req.Boundaries
	} else {
		boundaries = nil
	}

	var zoneID string
	err = db.DB.QueryRow(
		query,
		req.Name,
		description,
		color,
		supervisorID,
		boundaries,
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

func (h *ZonesHandler) UpdateZone(c echo.Context) error {
	zoneID := c.Param("id")

	var req models.UpdateZoneRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	if req.Boundaries != nil {
		if err := validateZoneBoundaries(*req.Boundaries); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		}
	}

	db, err := validateDB(c)
	if err != nil {
		return err
	}

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
		if len(bytes.TrimSpace(*req.Boundaries)) > 0 {
			args = append(args, *req.Boundaries)
		} else {
			args = append(args, *req.Boundaries)
		}
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

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, zoneID)

	result, err := db.DB.Exec(query, args...)
	if err != nil {
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
		"zoneID":  zoneID,
	})

}

// DeleteZone - Elimina una zona, pero primero verifica si hay grupos asignados para evitar eliminar zonas activas con grupos asociados. Si hay grupos, devuelve un error indicando que no se puede eliminar la zona.
func (h *ZonesHandler) DeleteZone(c echo.Context) error {
	zoneID := c.Param("id")
	db, err := validateDB(c)

	if err != nil {
		return err
	}

	var groupCount int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM discipleship_groups WHERE zone_id = $1", zoneID).Scan(&groupCount)
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
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	query := `
		SELECT
			z.name,
			z.id,
			COALESCE(COUNT(DISTINCT g.id), 0) as total_groups,
			COALESCE(
				(SELECT COUNT(*) FROM discipleship_group_members gm 
				 JOIN discipleship_groups g2 ON gm.group_id = g2.id 
				 WHERE g2.zone_id = z.id AND gm.is_active = true),
				0
			) as total_members,
			COALESCE(
				(SELECT ROUND(AVG(CASE WHEN present THEN 100.0 ELSE 0.0 END), 2)
				 FROM discipleship_attendance a
				 JOIN discipleship_groups g3 ON a.group_id = g3.id
				 WHERE g3.zone_id = z.id
				 AND a.meeting_date >= CURRENT_DATE - INTERVAL '30 days'),
				0
			) as avg_attendance,
			COALESCE(
				(SELECT COUNT(DISTINCT g2.leader_id) FROM discipleship_groups g2 WHERE g2.zone_id = z.id),
				0
			) as active_leaders
		FROM zones z
		LEFT JOIN discipleship_groups g ON g.zone_id = z.id AND g.status = 'active'
		WHERE z.id = $1
		GROUP BY z.id, z.name
		`

	var stats models.ZoneStats
	err = db.DB.QueryRow(query, zoneID).Scan(
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
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	query := `
		SELECT
			g.id, g.group_name, g.leader_id, g.supervisor_id, g.zone_id,
			COALESCE(z.name, '') as zone_name,
			g.meeting_day, g.meeting_time, g.meeting_location,
			g.latitude, g.longitude,
			g.member_count, g.active_members, g.status,
			g.created_at, g.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin líder') as leader_name,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
			FROM discipleship_groups as g
			LEFT JOIN zones z ON g.zone_id = z.id
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
			&g.ID, &g.GroupName, &g.LeaderID, &g.SupervisorID, &g.ZoneID, &g.ZoneName,
			&g.MeetingDay, &g.MeetingTime, &g.MeetingLocation, &g.MeetingAddress, &g.Latitude, &g.Longitude,
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

// GetMapaData obtiene datos geográficos de las zonas para mostrar en un mapa y grupos asociados para renderizar en el mapa
func (h *ZonesHandler) GetMapData(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	isActiveParam := c.QueryParam("is_active")
	selectedZoneID := c.QueryParam("zone_id")

	query := `
	SELECT
		z.id,
		z.name,
		COALESCE(z.description, '') as description,
		z.color,
		COALESCE(z.supervisor_id::text, '') as supervisor_id,
		z.boundaries,
		COALESCE(z.center_lat, 0) as center_lat,
		COALESCE(z.center_lng, 0) as center_lng,
		COALESCE(z.is_active, true) as is_active,
		COALESCE(z.total_groups, 0) as total_groups,
		COALESCE(z.total_members, 0) as total_members,
		COALESCE(z.avg_attendance, 0) as avg_attendance,
		COALESCE(z.created_at, NOW()) as created_at,
		COALESCE(z.updated_at, NOW()) as updated_at,
		COALESCE(zu.first_name || ' ' || zu.last_name, '') as supervisor_name,

		g.id,
		COALESCE(g.group_name, '') as group_name,
		COALESCE(g.leader_id::text, '') as leader_id,
		COALESCE(g.supervisor_id::text, '') as supervisor_id,
		COALESCE(g.zone_id::text, '') as zone_id,
		COALESCE(z2.name, '') as group_zone_name,
		COALESCE(g.meeting_day, '') as meeting_day,
		COALESCE(g.meeting_time::text, '') as meeting_time,
		COALESCE(g.meeting_location, '') as meeting_location,
		COALESCE(g.meeting_address, '') as meeting_address,
		COALESCE(g.latitude, 0) as latitude,
		COALESCE(g.longitude, 0) as longitude,
		COALESCE(g.member_count, 0) as member_count,
		COALESCE(g.active_members, 0) as active_members,
		COALESCE(g.status, '') as status,
		COALESCE(gl.first_name || ' ' || gl.last_name, 'Sin líder') as leader_name,
		COALESCE(gs.first_name || ' ' || gs.last_name, '') as group_supervisor_name
	FROM zones z
	LEFT JOIN users zu ON z.supervisor_id = zu.id
	LEFT JOIN discipleship_groups g ON g.zone_id = z.id
	LEFT JOIN zones z2 ON g.zone_id = z2.id
	LEFT JOIN users gl ON g.leader_id = gl.id
	LEFT JOIN users gs ON g.supervisor_id = gs.id
	WHERE 1=1
	`

	args := []interface{}{}
	argCount := 0

	if isActiveParam != "" {
		argCount++
		query += fmt.Sprintf(" AND z.is_active = $%d", argCount)
		args = append(args, isActiveParam == "true")
	}

	if selectedZoneID != "" {
		argCount++
		query += fmt.Sprintf(" AND z.id = $%d", argCount)
		args = append(args, selectedZoneID)
	}

	query += " ORDER BY z.name, g.group_name"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching map data:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Error al obtener datos para el mapa",
			"details": err.Error(),
		})
	}

	defer rows.Close()

	zoneMap := make(map[string]*models.ZoneMapData)

	for rows.Next() {
		var zone models.ZoneWithDetails
		var groupID sql.NullString
		var group models.ZoneMapGroup

		err := rows.Scan(
			&zone.ID, &zone.Name, &zone.Description, &zone.Color, &zone.SupervisorID,
			&zone.Boundaries, &zone.CenterLat, &zone.CenterLng, &zone.IsActive,
			&zone.TotalGroups, &zone.TotalMembers, &zone.AvgAttendance,
			&zone.CreatedAt, &zone.UpdatedAt, &zone.SupervisorName,
			&groupID, &group.GroupName, &group.LeaderID, &group.SupervisorID, &group.ZoneID,
			&group.ZoneName, &group.MeetingDay, &group.MeetingTime, &group.MeetingLocation, &group.MeetingAddress,
			&group.Latitude, &group.Longitude,
			&group.MemberCount, &group.ActiveMembers, &group.Status, &group.LeaderName, &group.SupervisorName,
		)
		if err != nil {
			c.Logger().Error("Error scanning map data:", err)
			continue
		}

		if _, exists := zoneMap[zone.ID]; !exists {
			zoneMap[zone.ID] = &models.ZoneMapData{
				Zone:   zone,
				Groups: []models.ZoneMapGroup{},
			}
		}

		// groupID viene como sql.NullString porque es el único campo de la tabla 'g'
		// que no envolvimos en un COALESCE, lo cual nos sirve perfectamente
		// para saber si existe o no un grupo.
		if groupID.Valid {
			group.ID = groupID.String
			zoneMap[zone.ID].Groups = append(zoneMap[zone.ID].Groups, group)
		}
	}

	response := models.ZoneMapResponse{
		Zones: make([]models.ZoneMapData, 0, len(zoneMap)),
	}

	for _, zoneData := range zoneMap {
		response.Zones = append(response.Zones, *zoneData)
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ZonesHandler) AssignGroupToZone(c echo.Context) error {
	zoneID := c.Param("id")
	groupID := c.Param("groupId")

	db, err := validateDB(c)
	if err != nil {
		return err
	}

	var zoneExists bool
	err = db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM zones WHERE id = $1)", zoneID).Scan(&zoneExists)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al verificar zona",
		})
	}
	if !zoneExists {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}

	_, err = db.DB.Exec(`
		UPDATE discipleship_groups
		SET zone_id = $1, updated_at = NOW()
		WHERE id = $2
	`, zoneID, groupID)

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

	var req struct {
		DiscipleshipLevel *int `json:"discipleship_level"`
	}
	c.Bind(&req)

	db, err := validateDB(c)
	if err != nil {
		return err
	}

	var zoneExists bool
	err = db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM zones WHERE id = $1)", zoneID).Scan(&zoneExists)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al verificar zona",
		})
	}
	if !zoneExists {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Zona no encontrada",
		})
	}

	query := `UPDATE users SET zone_id = $1, updated_at = NOW()`
	args := []interface{}{zoneID}
	argCount := 1

	if req.DiscipleshipLevel != nil {
		argCount++
		query += fmt.Sprintf(", discipleship_level = $%d", argCount)
		args = append(args, *req.DiscipleshipLevel)
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, userID)

	_, err = db.DB.Exec(query, args...)

	if err != nil {
		c.Logger().Error("Error assigning user to zone:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al asignar usuario a zona",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Usuario asignado a zona exitosamente",
	})
}
