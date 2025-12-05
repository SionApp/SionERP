package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type DiscipleshipHandler struct{}

func NewDiscipleshipHandler() *DiscipleshipHandler {
	return &DiscipleshipHandler{}
}

// =====================================================
// GRUPOS
// =====================================================

// Helper para obtener información de acceso a discipulado
func getDiscipleshipAccessInfo(c echo.Context, db *config.Database) (userID string, hierarchyLevel *int, zoneName *string, canSeeAll bool) {
	userID, _ = c.Get("user_id").(string)
	userRole, _ := c.Get("db_role").(string)
	
	// Pastor y Staff tienen acceso completo
	if userRole == "pastor" || userRole == "staff" {
		return userID, nil, nil, true
	}
	
	// Otros roles necesitan hierarchy_level
	var level int
	var zone sql.NullString
	err := db.DB.QueryRow(`
		SELECT hierarchy_level, zone_name 
		FROM discipleship_hierarchy 
		WHERE user_id = $1
	`, userID).Scan(&level, &zone)
	
	if err == nil {
		hierarchyLevel = &level
		if zone.Valid {
			zoneNameStr := zone.String
			zoneName = &zoneNameStr
		}
		return userID, hierarchyLevel, zoneName, false
	}
	
	// Sin jerarquía asignada
	return userID, nil, nil, false
}

// GetGroups obtiene lista de grupos con filtros
func (h *DiscipleshipHandler) GetGroups(c echo.Context) error {
	db := config.GetDB()

	// Obtener información de acceso del usuario
	userID, hierarchyLevel, userZone, canSeeAll := getDiscipleshipAccessInfo(c, db)
	
	// Si no tiene acceso, retornar error o lista vacía
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	// Parámetros de filtro del query
	zoneName := c.QueryParam("zone_name")
	status := c.QueryParam("status")
	leaderIDParam := c.QueryParam("leader_id")
	search := c.QueryParam("search")
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Query base
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
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 0

	// Aplicar filtros según hierarchy_level (solo si no es acceso completo)
	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1: // Líder - solo su grupo
			argCount++
			query += fmt.Sprintf(" AND g.leader_id = $%d", argCount)
			args = append(args, userID)
		case 2: // Supervisor Auxiliar - grupos que supervisa
			argCount++
			query += fmt.Sprintf(" AND g.supervisor_id = $%d", argCount)
			args = append(args, userID)
		case 3: // Coordinador - su zona
			if userZone != nil && *userZone != "" {
				argCount++
				query += fmt.Sprintf(" AND g.zone_name = $%d", argCount)
				args = append(args, *userZone)
			}
		// case 4 y 5 pueden ver más, según necesidad
		// Por ahora, si no hay filtro específico, no se aplica restricción adicional
		}
	}

	// Filtros del query parameter (aplicados después de los filtros de acceso)
	if zoneName != "" {
		argCount++
		query += fmt.Sprintf(" AND g.zone_name = $%d", argCount)
		args = append(args, zoneName)
	}

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND g.status = $%d", argCount)
		args = append(args, status)
	}

	if leaderIDParam != "" {
		argCount++
		query += fmt.Sprintf(" AND g.leader_id = $%d", argCount)
		args = append(args, leaderIDParam)
	}

	if search != "" {
		argCount++
		query += fmt.Sprintf(" AND (g.group_name ILIKE $%d OR u.first_name ILIKE $%d OR u.last_name ILIKE $%d)", argCount, argCount, argCount)
		args = append(args, "%"+search+"%")
	}

	// Contar total
	countQuery := "SELECT COUNT(*) FROM discipleship_groups g LEFT JOIN users u ON g.leader_id = u.id WHERE 1=1"
	// (agregar los mismos filtros)

	var total int
	err := db.DB.QueryRow(countQuery).Scan(&total)
	if err != nil {
		c.Logger().Error("Error counting groups:", err)
	}

	// Agregar paginación
	query += fmt.Sprintf(" ORDER BY g.created_at DESC LIMIT %d OFFSET %d", limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching groups:", err)
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
			c.Logger().Error("Error scanning group:", err)
			continue
		}
		groups = append(groups, g)
	}

	totalPages := (total + limit - 1) / limit

	return c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       groups,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// GetGroup obtiene un grupo específico
func (h *DiscipleshipHandler) GetGroup(c echo.Context) error {
	groupID := c.Param("id")
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
		WHERE g.id = $1
	`

	var g models.DiscipleshipGroupWithDetails
	err := db.DB.QueryRow(query, groupID).Scan(
		&g.ID, &g.GroupName, &g.LeaderID, &g.SupervisorID, &g.ZoneName,
		&g.MeetingDay, &g.MeetingTime, &g.MeetingLocation,
		&g.MemberCount, &g.ActiveMembers, &g.Status,
		&g.CreatedAt, &g.UpdatedAt,
		&g.LeaderName, &g.SupervisorName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Grupo no encontrado",
			})
		}
		c.Logger().Error("Error fetching group:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener grupo",
		})
	}

	return c.JSON(http.StatusOK, g)
}

// CreateGroup crea un nuevo grupo
func (h *DiscipleshipHandler) CreateGroup(c echo.Context) error {
	var req models.CreateGroupRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	if err := validate.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Validación fallida: " + err.Error(),
		})
	}

	db := config.GetDB()

	query := `
		INSERT INTO discipleship_groups (
			group_name, leader_id, supervisor_id, zone_name,
			meeting_day, meeting_time, meeting_location, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		RETURNING id
	`

	var supervisorID interface{}
	if req.SupervisorID != "" {
		supervisorID = req.SupervisorID
	} else {
		supervisorID = nil
	}

	var groupID string
	err := db.DB.QueryRow(
		query,
		req.GroupName, req.LeaderID, supervisorID, req.ZoneName,
		req.MeetingDay, req.MeetingTime, req.MeetingLocation,
	).Scan(&groupID)

	if err != nil {
		c.Logger().Error("Error creating group:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear grupo",
		})
	}

	// Actualizar contador de grupos del usuario en la jerarquía
	db.DB.Exec(`
		UPDATE discipleship_hierarchy 
		SET active_groups_assigned = active_groups_assigned + 1
		WHERE user_id = $1
	`, req.LeaderID)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":  "Grupo creado exitosamente",
		"group_id": groupID,
	})
}

// UpdateGroup actualiza un grupo
func (h *DiscipleshipHandler) UpdateGroup(c echo.Context) error {
	groupID := c.Param("id")

	var req models.UpdateGroupRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	db := config.GetDB()

	// Construir query dinámico
	query := "UPDATE discipleship_groups SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 0

	if req.GroupName != nil {
		argCount++
		query += fmt.Sprintf(", group_name = $%d", argCount)
		args = append(args, *req.GroupName)
	}
	if req.LeaderID != nil {
		argCount++
		query += fmt.Sprintf(", leader_id = $%d", argCount)
		args = append(args, *req.LeaderID)
	}
	if req.SupervisorID != nil {
		argCount++
		query += fmt.Sprintf(", supervisor_id = $%d", argCount)
		args = append(args, *req.SupervisorID)
	}
	if req.ZoneName != nil {
		argCount++
		query += fmt.Sprintf(", zone_name = $%d", argCount)
		args = append(args, *req.ZoneName)
	}
	if req.MeetingDay != nil {
		argCount++
		query += fmt.Sprintf(", meeting_day = $%d", argCount)
		args = append(args, *req.MeetingDay)
	}
	if req.MeetingTime != nil {
		argCount++
		query += fmt.Sprintf(", meeting_time = $%d", argCount)
		args = append(args, *req.MeetingTime)
	}
	if req.MeetingLocation != nil {
		argCount++
		query += fmt.Sprintf(", meeting_location = $%d", argCount)
		args = append(args, *req.MeetingLocation)
	}
	if req.MemberCount != nil {
		argCount++
		query += fmt.Sprintf(", member_count = $%d", argCount)
		args = append(args, *req.MemberCount)
	}
	if req.Status != nil {
		argCount++
		query += fmt.Sprintf(", status = $%d", argCount)
		args = append(args, *req.Status)
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, groupID)

	result, err := db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating group:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar grupo",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Grupo no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Grupo actualizado exitosamente",
	})
}

// DeleteGroup elimina (soft delete) un grupo
func (h *DiscipleshipHandler) DeleteGroup(c echo.Context) error {
	groupID := c.Param("id")
	db := config.GetDB()

	result, err := db.DB.Exec(`
		UPDATE discipleship_groups 
		SET status = 'inactive', updated_at = NOW() 
		WHERE id = $1
	`, groupID)

	if err != nil {
		c.Logger().Error("Error deleting group:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar grupo",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Grupo no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Grupo eliminado exitosamente",
	})
}

// =====================================================
// JERARQUÍA
// =====================================================

// GetHierarchy obtiene la jerarquía de un usuario
func (h *DiscipleshipHandler) GetHierarchy(c echo.Context) error {
	db := config.GetDB()
	userID := c.QueryParam("user_id")

	query := `
		SELECT 
			h.id, h.user_id, h.hierarchy_level, h.supervisor_id,
			h.zone_name, h.territory, h.active_groups_assigned,
			h.created_at, h.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
			COALESCE(u.email, '') as user_email,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
		FROM discipleship_hierarchy h
		LEFT JOIN users u ON h.user_id = u.id
		LEFT JOIN users s ON h.supervisor_id = s.id
	`

	args := []interface{}{}
	if userID != "" {
		query += " WHERE h.user_id = $1"
		args = append(args, userID)
	}

	query += " ORDER BY h.hierarchy_level DESC, h.created_at DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching hierarchy:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener jerarquía",
		})
	}
	defer rows.Close()

	var hierarchy []models.HierarchyWithUser
	for rows.Next() {
		var h models.HierarchyWithUser
		err := rows.Scan(
			&h.ID, &h.UserID, &h.HierarchyLevel, &h.SupervisorID,
			&h.ZoneName, &h.Territory, &h.ActiveGroupsAssigned,
			&h.CreatedAt, &h.UpdatedAt,
			&h.UserName, &h.UserEmail, &h.SupervisorName,
		)
		if err != nil {
			c.Logger().Error("Error scanning hierarchy:", err)
			continue
		}
		hierarchy = append(hierarchy, h)
	}

	return c.JSON(http.StatusOK, hierarchy)
}

// AssignHierarchy asigna un usuario a un nivel de jerarquía
func (h *DiscipleshipHandler) AssignHierarchy(c echo.Context) error {
	var req models.AssignHierarchyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	db := config.GetDB()

	// Verificar si ya existe
	var existingID string
	err := db.DB.QueryRow(
		"SELECT id FROM discipleship_hierarchy WHERE user_id = $1",
		req.UserID,
	).Scan(&existingID)

	var query string
	var args []interface{}

	if err == sql.ErrNoRows {
		// Crear nuevo
		query = `
			INSERT INTO discipleship_hierarchy (
				user_id, hierarchy_level, supervisor_id, zone_name, territory
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`
		args = []interface{}{
			req.UserID, req.HierarchyLevel, 
			nullIfEmpty(req.SupervisorID), 
			nullIfEmpty(req.ZoneName), 
			nullIfEmpty(req.Territory),
		}
	} else {
		// Actualizar existente
		query = `
			UPDATE discipleship_hierarchy SET
				hierarchy_level = $2,
				supervisor_id = $3,
				zone_name = $4,
				territory = $5,
				updated_at = NOW()
			WHERE user_id = $1
		`
		args = []interface{}{
			req.UserID, req.HierarchyLevel,
			nullIfEmpty(req.SupervisorID),
			nullIfEmpty(req.ZoneName),
			nullIfEmpty(req.Territory),
		}
	}

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error assigning hierarchy:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al asignar jerarquía",
		})
	}

	// Actualizar también el nivel de discipulado en la tabla users
	db.DB.Exec(`
		UPDATE users SET 
			discipleship_level = $1,
			zone_name = $2,
			territory = $3,
			updated_at = NOW()
		WHERE id = $4
	`, req.HierarchyLevel, req.ZoneName, req.Territory, req.UserID)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Jerarquía asignada exitosamente",
	})
}

// GetSubordinates obtiene los subordinados de un supervisor
func (h *DiscipleshipHandler) GetSubordinates(c echo.Context) error {
	supervisorID := c.Param("id")
	db := config.GetDB()

	query := `
		SELECT 
			h.id, h.user_id, h.hierarchy_level, h.supervisor_id,
			h.zone_name, h.territory, h.active_groups_assigned,
			h.created_at, h.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
			COALESCE(u.email, '') as user_email
		FROM discipleship_hierarchy h
		LEFT JOIN users u ON h.user_id = u.id
		WHERE h.supervisor_id = $1
		ORDER BY h.hierarchy_level DESC
	`

	rows, err := db.DB.Query(query, supervisorID)
	if err != nil {
		c.Logger().Error("Error fetching subordinates:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener subordinados",
		})
	}
	defer rows.Close()

	var subordinates []models.HierarchyWithUser
	for rows.Next() {
		var h models.HierarchyWithUser
		err := rows.Scan(
			&h.ID, &h.UserID, &h.HierarchyLevel, &h.SupervisorID,
			&h.ZoneName, &h.Territory, &h.ActiveGroupsAssigned,
			&h.CreatedAt, &h.UpdatedAt,
			&h.UserName, &h.UserEmail,
		)
		if err != nil {
			continue
		}
		subordinates = append(subordinates, h)
	}

	return c.JSON(http.StatusOK, subordinates)
}

// =====================================================
// ANALYTICS
// =====================================================

// GetAnalytics obtiene estadísticas generales
func (h *DiscipleshipHandler) GetAnalytics(c echo.Context) error {
	db := config.GetDB()
	zoneName := c.QueryParam("zone_name")

	var analytics models.DiscipleshipAnalytics

	// Total grupos activos
	groupQuery := "SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active'"
	groupArgs := []interface{}{}
	if zoneName != "" {
		groupQuery += " AND zone_name = $1"
		groupArgs = append(groupArgs, zoneName)
	}
	db.DB.QueryRow(groupQuery, groupArgs...).Scan(&analytics.TotalGroups)

	// Total miembros
	memberQuery := "SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE status = 'active'"
	if zoneName != "" {
		memberQuery += " AND zone_name = $1"
	}
	db.DB.QueryRow(memberQuery, groupArgs...).Scan(&analytics.TotalMembers)

	// Promedio de asistencia (últimas 4 semanas)
	db.DB.QueryRow(`
		SELECT COALESCE(AVG(attendance), 0)
		FROM discipleship_metrics
		WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
	`).Scan(&analytics.AverageAttendance)

	// Líderes activos
	db.DB.QueryRow(`
		SELECT COUNT(DISTINCT leader_id)
		FROM discipleship_groups
		WHERE status = 'active'
	`).Scan(&analytics.ActiveLeaders)

	// Multiplicaciones este año
	db.DB.QueryRow(`
		SELECT COUNT(*)
		FROM cell_multiplication_tracking
		WHERE multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
		AND success_status = 'successful'
	`).Scan(&analytics.Multiplications)

	// Salud espiritual promedio
	db.DB.QueryRow(`
		SELECT COALESCE(AVG(spiritual_temperature), 0)
		FROM discipleship_metrics
		WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
	`).Scan(&analytics.SpiritualHealth)

	// Alertas pendientes
	db.DB.QueryRow(`
		SELECT COUNT(*)
		FROM discipleship_alerts
		WHERE resolved = false AND (expires_at IS NULL OR expires_at > NOW())
	`).Scan(&analytics.PendingAlerts)

	// Calcular tasa de crecimiento
	var currentMembers, previousMembers float64
	db.DB.QueryRow(`
		SELECT COALESCE(AVG(attendance), 0)
		FROM discipleship_metrics
		WHERE week_date >= CURRENT_DATE - INTERVAL '30 days'
	`).Scan(&currentMembers)
	db.DB.QueryRow(`
		SELECT COALESCE(AVG(attendance), 0)
		FROM discipleship_metrics
		WHERE week_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
	`).Scan(&previousMembers)

	if previousMembers > 0 {
		analytics.GrowthRate = ((currentMembers - previousMembers) / previousMembers) * 100
	}

	return c.JSON(http.StatusOK, analytics)
}

// GetZoneStats obtiene estadísticas por zona
func (h *DiscipleshipHandler) GetZoneStats(c echo.Context) error {
	db := config.GetDB()

	rows, err := db.DB.Query(`
		SELECT 
			COALESCE(zone_name, 'Sin zona') as zone_name,
			COUNT(*) as total_groups,
			COALESCE(SUM(member_count), 0) as total_members,
			COALESCE(AVG(active_members::float / NULLIF(member_count, 0) * 100), 0) as avg_attendance
		FROM discipleship_groups
		WHERE status = 'active'
		GROUP BY zone_name
		ORDER BY total_groups DESC
	`)
	if err != nil {
		c.Logger().Error("Error fetching zone stats:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener estadísticas por zona",
		})
	}
	defer rows.Close()

	var stats []models.ZoneStats
	for rows.Next() {
		var s models.ZoneStats
		err := rows.Scan(&s.ZoneName, &s.TotalGroups, &s.TotalMembers, &s.AvgAttendance)
		if err != nil {
			continue
		}
		stats = append(stats, s)
	}

	return c.JSON(http.StatusOK, stats)
}

// GetGroupPerformance obtiene el rendimiento de cada grupo
func (h *DiscipleshipHandler) GetGroupPerformance(c echo.Context) error {
	db := config.GetDB()

	rows, err := db.DB.Query(`
		SELECT 
			g.id,
			g.group_name,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin líder') as leader_name,
			COALESCE(AVG(m.attendance), 0) as avg_attendance,
			COALESCE(AVG(m.spiritual_temperature), 0) as spiritual_temp,
			g.status,
			COALESCE(MAX(m.week_date)::text, '') as last_report_date
		FROM discipleship_groups g
		LEFT JOIN users u ON g.leader_id = u.id
		LEFT JOIN discipleship_metrics m ON g.id = m.group_id
		WHERE g.status = 'active'
		GROUP BY g.id, g.group_name, u.first_name, u.last_name, g.status
		ORDER BY avg_attendance DESC
	`)
	if err != nil {
		c.Logger().Error("Error fetching group performance:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener rendimiento de grupos",
		})
	}
	defer rows.Close()

	var performance []models.GroupPerformance
	for rows.Next() {
		var p models.GroupPerformance
		err := rows.Scan(
			&p.GroupID, &p.GroupName, &p.LeaderName,
			&p.AvgAttendance, &p.SpiritualTemp, &p.Status, &p.LastReportDate,
		)
		if err != nil {
			continue
		}
		performance = append(performance, p)
	}

	return c.JSON(http.StatusOK, performance)
}

// Helper function
func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// GetMultiplications obtiene el historial de multiplicaciones
func (h *DiscipleshipHandler) GetMultiplications(c echo.Context) error {
	db := config.GetDB()

	status := c.QueryParam("status")
	zoneName := c.QueryParam("zone_name")

	query := `
		SELECT 
			m.id, m.parent_group_id, m.parent_leader_id, m.new_group_id, m.new_leader_id,
			m.multiplication_date, m.multiplication_type, m.success_status,
			m.initial_members, m.notes, m.created_at, m.updated_at,
			COALESCE(pg.group_name, '') as parent_group_name,
			COALESCE(ng.group_name, '') as new_group_name,
			COALESCE(pl.first_name || ' ' || pl.last_name, '') as parent_leader_name,
			COALESCE(nl.first_name || ' ' || nl.last_name, '') as new_leader_name
		FROM cell_multiplication_tracking m
		LEFT JOIN discipleship_groups pg ON m.parent_group_id = pg.id
		LEFT JOIN discipleship_groups ng ON m.new_group_id = ng.id
		LEFT JOIN users pl ON m.parent_leader_id = pl.id
		LEFT JOIN users nl ON m.new_leader_id = nl.id
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND m.success_status = $%d", argCount)
		args = append(args, status)
	}

	if zoneName != "" {
		argCount++
		query += fmt.Sprintf(" AND pg.zone_name = $%d", argCount)
		args = append(args, zoneName)
	}

	query += " ORDER BY m.multiplication_date DESC LIMIT 50"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching multiplications:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener multiplicaciones",
		})
	}
	defer rows.Close()

	type MultiplicationWithDetails struct {
		ID                 string         `json:"id"`
		ParentGroupID      string         `json:"parent_group_id"`
		ParentLeaderID     string         `json:"parent_leader_id"`
		NewGroupID         sql.NullString `json:"new_group_id"`
		NewLeaderID        sql.NullString `json:"new_leader_id"`
		MultiplicationDate string         `json:"multiplication_date"`
		MultiplicationType string         `json:"multiplication_type"`
		SuccessStatus      string         `json:"success_status"`
		InitialMembers     int            `json:"initial_members"`
		Notes              sql.NullString `json:"notes"`
		CreatedAt          sql.NullTime   `json:"created_at"`
		UpdatedAt          sql.NullTime   `json:"updated_at"`
		ParentGroupName    string         `json:"parent_group_name"`
		NewGroupName       string         `json:"new_group_name"`
		ParentLeaderName   string         `json:"parent_leader_name"`
		NewLeaderName      string         `json:"new_leader_name"`
	}

	var multiplications []MultiplicationWithDetails
	for rows.Next() {
		var m MultiplicationWithDetails
		err := rows.Scan(
			&m.ID, &m.ParentGroupID, &m.ParentLeaderID, &m.NewGroupID, &m.NewLeaderID,
			&m.MultiplicationDate, &m.MultiplicationType, &m.SuccessStatus,
			&m.InitialMembers, &m.Notes, &m.CreatedAt.Time, &m.UpdatedAt.Time,
			&m.ParentGroupName, &m.NewGroupName, &m.ParentLeaderName, &m.NewLeaderName,
		)
		if err != nil {
			continue
		}
		multiplications = append(multiplications, m)
	}

	return c.JSON(http.StatusOK, multiplications)
}

// GetWeeklyTrends obtiene tendencias semanales
func (h *DiscipleshipHandler) GetWeeklyTrends(c echo.Context) error {
	db := config.GetDB()
	weeks := c.QueryParam("weeks")
	if weeks == "" {
		weeks = "12"
	}

	query := `
		SELECT 
			DATE_TRUNC('week', week_date)::date as week_start,
			SUM(attendance) as total_attendance,
			SUM(new_visitors) as total_visitors,
			SUM(conversions) as total_conversions,
			AVG(spiritual_temperature) as avg_spiritual_temp,
			COUNT(DISTINCT group_id) as groups_reporting
		FROM discipleship_metrics
		WHERE week_date >= CURRENT_DATE - ($1 || ' weeks')::interval
		GROUP BY DATE_TRUNC('week', week_date)
		ORDER BY week_start ASC
	`

	rows, err := db.DB.Query(query, weeks)
	if err != nil {
		c.Logger().Error("Error fetching weekly trends:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener tendencias semanales",
		})
	}
	defer rows.Close()

	type WeeklyTrend struct {
		WeekStart       string  `json:"week_start"`
		TotalAttendance int     `json:"total_attendance"`
		TotalVisitors   int     `json:"total_visitors"`
		TotalConversions int    `json:"total_conversions"`
		AvgSpiritualTemp float64 `json:"avg_spiritual_temp"`
		GroupsReporting int     `json:"groups_reporting"`
	}

	var trends []WeeklyTrend
	for rows.Next() {
		var t WeeklyTrend
		err := rows.Scan(
			&t.WeekStart, &t.TotalAttendance, &t.TotalVisitors,
			&t.TotalConversions, &t.AvgSpiritualTemp, &t.GroupsReporting,
		)
		if err != nil {
			continue
		}
		trends = append(trends, t)
	}

	return c.JSON(http.StatusOK, trends)
}

// GetDashboardStatsByLevel obtiene estadísticas según el nivel del usuario
func (h *DiscipleshipHandler) GetDashboardStatsByLevel(c echo.Context) error {
	db := config.GetDB()
	userID := c.Get("user_id").(string)
	level := c.QueryParam("level")

	var stats struct {
		TotalGroups           int     `json:"total_groups"`
		TotalMembers          int     `json:"total_members"`
		AverageAttendance     float64 `json:"average_attendance"`
		GrowthRate            float64 `json:"growth_rate"`
		ActiveLeaders         int     `json:"active_leaders"`
		Multiplications       int     `json:"multiplications"`
		SpiritualHealth       float64 `json:"spiritual_health"`
		PendingAlerts         int     `json:"pending_alerts"`
		GroupsUnderSupervision int    `json:"groups_under_supervision"`
		SubordinatesCount     int     `json:"subordinates_count"`
		PendingReports        int     `json:"pending_reports"`
	}

	// Estadísticas base según nivel
	switch level {
	case "1": // Líder - solo sus grupos
		db.DB.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups WHERE leader_id = $1 AND status = 'active'
		`, userID).Scan(&stats.TotalGroups)
		
		db.DB.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups 
			WHERE leader_id = $1 AND status = 'active'
		`, userID).Scan(&stats.TotalMembers)

	case "2": // Supervisor Auxiliar - grupos que supervisa
		db.DB.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups 
			WHERE supervisor_id = $1 AND status = 'active'
		`, userID).Scan(&stats.GroupsUnderSupervision)
		
		db.DB.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups 
			WHERE supervisor_id = $1 AND status = 'active'
		`, userID).Scan(&stats.TotalMembers)
		
		db.DB.QueryRow(`
			SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups 
			WHERE supervisor_id = $1 AND status = 'active'
		`, userID).Scan(&stats.ActiveLeaders)

	case "3": // Supervisor General - toda su zona
		var zoneName string
		db.DB.QueryRow(`
			SELECT zone_name FROM discipleship_hierarchy WHERE user_id = $1
		`, userID).Scan(&zoneName)

		db.DB.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups 
			WHERE zone_name = $1 AND status = 'active'
		`, zoneName).Scan(&stats.TotalGroups)
		
		db.DB.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups 
			WHERE zone_name = $1 AND status = 'active'
		`, zoneName).Scan(&stats.TotalMembers)
		
		db.DB.QueryRow(`
			SELECT COUNT(*) FROM discipleship_hierarchy 
			WHERE supervisor_id = $1
		`, userID).Scan(&stats.SubordinatesCount)

	case "4", "5": // Coordinador / Pastor - todo el sistema
		db.DB.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active'
		`).Scan(&stats.TotalGroups)
		
		db.DB.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE status = 'active'
		`).Scan(&stats.TotalMembers)
		
		db.DB.QueryRow(`
			SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups WHERE status = 'active'
		`).Scan(&stats.ActiveLeaders)
		
		db.DB.QueryRow(`
			SELECT COUNT(*) FROM cell_multiplication_tracking 
			WHERE multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
			AND success_status = 'successful'
		`).Scan(&stats.Multiplications)
	}

	// Estadísticas comunes
	db.DB.QueryRow(`
		SELECT COALESCE(AVG(attendance), 0) FROM discipleship_metrics 
		WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
	`).Scan(&stats.AverageAttendance)

	db.DB.QueryRow(`
		SELECT COALESCE(AVG(spiritual_temperature), 0) FROM discipleship_metrics 
		WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
	`).Scan(&stats.SpiritualHealth)

	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts WHERE resolved = false
	`).Scan(&stats.PendingAlerts)

	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_reports WHERE status = 'submitted'
	`).Scan(&stats.PendingReports)

	return c.JSON(http.StatusOK, stats)
}

// GetLeaderGroupStats obtiene estadísticas de grupos para un líder específico
func (h *DiscipleshipHandler) GetLeaderGroupStats(c echo.Context) error {
	leaderID := c.Param("id")
	db := config.GetDB()

	type GroupStats struct {
		GroupID           string  `json:"group_id"`
		GroupName         string  `json:"group_name"`
		MemberCount       int     `json:"member_count"`
		ActiveMembers     int     `json:"active_members"`
		AvgAttendance     float64 `json:"avg_attendance"`
		AvgSpiritualTemp  float64 `json:"avg_spiritual_temp"`
		TotalVisitors     int     `json:"total_visitors"`
		TotalConversions  int     `json:"total_conversions"`
		LastReportDate    string  `json:"last_report_date"`
		WeeksWithoutReport int    `json:"weeks_without_report"`
	}

	rows, err := db.DB.Query(`
		SELECT 
			g.id, g.group_name, g.member_count, g.active_members,
			COALESCE(AVG(m.attendance), 0) as avg_attendance,
			COALESCE(AVG(m.spiritual_temperature), 0) as avg_spiritual_temp,
			COALESCE(SUM(m.new_visitors + m.returning_visitors), 0) as total_visitors,
			COALESCE(SUM(m.conversions), 0) as total_conversions,
			COALESCE(MAX(m.week_date)::text, '') as last_report_date
		FROM discipleship_groups g
		LEFT JOIN discipleship_metrics m ON g.id = m.group_id 
			AND m.week_date >= CURRENT_DATE - INTERVAL '28 days'
		WHERE g.leader_id = $1 AND g.status = 'active'
		GROUP BY g.id, g.group_name, g.member_count, g.active_members
	`, leaderID)

	if err != nil {
		c.Logger().Error("Error fetching leader group stats:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener estadísticas del líder",
		})
	}
	defer rows.Close()

	var stats []GroupStats
	for rows.Next() {
		var s GroupStats
		err := rows.Scan(
			&s.GroupID, &s.GroupName, &s.MemberCount, &s.ActiveMembers,
			&s.AvgAttendance, &s.AvgSpiritualTemp, &s.TotalVisitors,
			&s.TotalConversions, &s.LastReportDate,
		)
		if err != nil {
			continue
		}
		stats = append(stats, s)
	}

	return c.JSON(http.StatusOK, stats)
}

// GetSupervisorSubordinates obtiene los subordinados de un supervisor
func (h *DiscipleshipHandler) GetSupervisorSubordinates(c echo.Context) error {
	supervisorID := c.Param("id")
	db := config.GetDB()

	type Subordinate struct {
		ID               string  `json:"id"`
		UserID           string  `json:"user_id"`
		UserName         string  `json:"user_name"`
		UserEmail        string  `json:"user_email"`
		HierarchyLevel   int     `json:"hierarchy_level"`
		GroupsAssigned   int     `json:"groups_assigned"`
		TotalMembers     int     `json:"total_members"`
		AvgAttendance    float64 `json:"avg_attendance"`
		LastReportDate   string  `json:"last_report_date"`
		PerformanceScore float64 `json:"performance_score"`
	}

	rows, err := db.DB.Query(`
		SELECT 
			h.id, h.user_id,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
			COALESCE(u.email, '') as user_email,
			h.hierarchy_level,
			h.active_groups_assigned,
			COALESCE((SELECT SUM(member_count) FROM discipleship_groups g 
				WHERE g.leader_id = h.user_id OR g.supervisor_id = h.user_id), 0) as total_members,
			COALESCE((SELECT AVG(m.attendance) FROM discipleship_metrics m 
				JOIN discipleship_groups g ON m.group_id = g.id
				WHERE (g.leader_id = h.user_id OR g.supervisor_id = h.user_id)
				AND m.week_date >= CURRENT_DATE - INTERVAL '28 days'), 0) as avg_attendance,
			COALESCE((SELECT MAX(r.submitted_at)::text FROM discipleship_reports r 
				WHERE r.reporter_id = h.user_id), '') as last_report_date
		FROM discipleship_hierarchy h
		LEFT JOIN users u ON h.user_id = u.id
		WHERE h.supervisor_id = $1
		ORDER BY h.hierarchy_level DESC, user_name
	`, supervisorID)

	if err != nil {
		c.Logger().Error("Error fetching subordinates:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener subordinados",
		})
	}
	defer rows.Close()

	var subordinates []Subordinate
	for rows.Next() {
		var s Subordinate
		err := rows.Scan(
			&s.ID, &s.UserID, &s.UserName, &s.UserEmail,
			&s.HierarchyLevel, &s.GroupsAssigned, &s.TotalMembers,
			&s.AvgAttendance, &s.LastReportDate,
		)
		if err != nil {
			continue
		}
		// Calcular score de rendimiento simple
		s.PerformanceScore = min(100, (s.AvgAttendance/float64(max(s.TotalMembers, 1)))*100)
		subordinates = append(subordinates, s)
	}

	return c.JSON(http.StatusOK, subordinates)
}

// GetGoals obtiene los objetivos estratégicos
func (h *DiscipleshipHandler) GetGoals(c echo.Context) error {
	db := config.GetDB()
	status := c.QueryParam("status")
	zoneName := c.QueryParam("zone_name")

	query := `
		SELECT 
			id, goal_type, description, target_metric, target_value,
			current_value, progress_percentage, deadline, status,
			supervisor_id, zone_name, created_at, updated_at
		FROM discipleship_goals
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	if status != "" && status != "all" {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, status)
	}

	if zoneName != "" {
		argCount++
		query += fmt.Sprintf(" AND (zone_name = $%d OR zone_name IS NULL)", argCount)
		args = append(args, zoneName)
	}

	query += " ORDER BY deadline ASC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching goals:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener objetivos",
		})
	}
	defer rows.Close()

	type Goal struct {
		ID                 string         `json:"id"`
		GoalType           string         `json:"goal_type"`
		Description        string         `json:"description"`
		TargetMetric       string         `json:"target_metric"`
		TargetValue        int            `json:"target_value"`
		CurrentValue       int            `json:"current_value"`
		ProgressPercentage float64        `json:"progress_percentage"`
		Deadline           string         `json:"deadline"`
		Status             string         `json:"status"`
		SupervisorID       sql.NullString `json:"supervisor_id"`
		ZoneName           sql.NullString `json:"zone_name"`
		CreatedAt          sql.NullTime   `json:"created_at"`
		UpdatedAt          sql.NullTime   `json:"updated_at"`
	}

	var goals []Goal
	for rows.Next() {
		var g Goal
		err := rows.Scan(
			&g.ID, &g.GoalType, &g.Description, &g.TargetMetric, &g.TargetValue,
			&g.CurrentValue, &g.ProgressPercentage, &g.Deadline, &g.Status,
			&g.SupervisorID, &g.ZoneName, &g.CreatedAt.Time, &g.UpdatedAt.Time,
		)
		if err != nil {
			continue
		}
		goals = append(goals, g)
	}

	return c.JSON(http.StatusOK, goals)
}

// Helper functions
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
