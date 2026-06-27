package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"backend-sion/utils"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type DiscipleshipHandler struct{}

func NewDiscipleshipHandler() *DiscipleshipHandler {
	return &DiscipleshipHandler{}
}

// =====================================================
// GRUPOS
// =====================================================

// Helper para obtener información de acceso a discipulado.
// Uses the global pool intentionally — this is a permission check that reads the calling
// user's own hierarchy row by primary key (UUID). No cross-church risk; hierarchy rows
// are per-user and users are globally unique. The tenant tx is not yet available in all
// call paths (e.g. early in handler before validateTx).
func getDiscipleshipAccessInfo(c echo.Context, db *config.Database) (userID string, hierarchyLevel *int, zoneID *string, canSeeAll bool) {
	userID, _ = c.Get("user_id").(string)
	userRole, _ := c.Get("db_role").(string)

	// El nivel de discipulado tiene prioridad sobre el rol ERP.
	// Un usuario con rol 'staff' asignado como Supervisor General (nivel 3) debe
	// estar limitado a su zona, no ver todo. Solo si NO tiene jerarquía asignada
	// se usa el rol ERP como fallback (para pastores/admins sin nivel).
	var level int
	var zone sql.NullString
	err := db.DB.QueryRow(`
		SELECT hierarchy_level, COALESCE(zone_id::text, '')
		FROM discipleship_hierarchy
		WHERE user_id = $1
	`, userID).Scan(&level, &zone)

	if err == nil {
		hierarchyLevel = &level
		if zone.Valid && zone.String != "" {
			zoneIDStr := zone.String
			zoneID = &zoneIDStr
		}
		// Coordinador (4) y Pastoral (5) tienen acceso completo dentro del módulo
		if level >= 4 {
			return userID, hierarchyLevel, zoneID, true
		}
		return userID, hierarchyLevel, zoneID, false
	}

	// Sin jerarquía de discipulado — fallback al rol ERP (pastor/staff = acceso total)
	if utils.IsAdminRole(userRole) {
		return userID, nil, nil, true
	}

	// Sin acceso
	return userID, nil, nil, false
}

// addHierarchyUserFilter agrega condiciones WHERE para filtrar usuarios según el nivel del que consulta.
// Retorna la query modificada y los argumentos actualizados.
func addHierarchyUserFilter(query string, args []interface{}, userID string, hierarchyLevel *int, userZoneID *string, canSeeAll bool) (string, []interface{}) {
	if canSeeAll || hierarchyLevel == nil {
		return query, args
	}

	argCount := len(args)
	switch *hierarchyLevel {
	case 4, 5:
		// Coordinator+ ve todo
	case 3:
		// Supervisor General — usuarios en su zona
		if userZoneID != nil && *userZoneID != "" {
			argCount++
			query += fmt.Sprintf(` AND (
				u.zone_id = $%d
				OR u.id IN (
					SELECT dgm.user_id FROM discipleship_group_members dgm
					JOIN discipleship_groups dg ON dgm.group_id = dg.id
					WHERE dg.zone_id = $%d
				)
			)`, argCount, argCount)
			args = append(args, *userZoneID)
		} else {
			query += ` AND 1=0`
		}
	case 2:
		// Supervisor Auxiliar — usuarios en grupos que supervisa
		argCount++
		query += fmt.Sprintf(` AND (
			u.id = $%d
			OR u.id IN (
				SELECT dg.leader_id FROM discipleship_groups dg WHERE dg.supervisor_id = $%d
			)
			OR u.id IN (
				SELECT dgm.user_id FROM discipleship_group_members dgm
				JOIN discipleship_groups dg ON dgm.group_id = dg.id
				WHERE dg.supervisor_id = $%d
			)
		)`, argCount, argCount, argCount)
		args = append(args, userID)
	case 1:
		// Líder — usuarios en su grupo
		argCount++
		query += fmt.Sprintf(` AND (
			u.id = $%d
			OR u.id IN (
				SELECT dgm.user_id FROM discipleship_group_members dgm
				JOIN discipleship_groups dg ON dgm.group_id = dg.id
				WHERE dg.leader_id = $%d
			)
		)`, argCount, argCount)
		args = append(args, userID)
	}

	return query, args
}

// GetGroups obtiene lista de grupos con filtros
func (h *DiscipleshipHandler) GetGroups(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()

	// Obtener información de acceso del usuario (permission check — uses global pool)
	// userZoneID no longer used for case 3 (replaced by subtree scoping).
	userID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)

	// Si no tiene acceso, retornar error o lista vacía
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	// Parámetros de filtro del query
	zoneIDParam := c.QueryParam("zone_id")
	zoneNameParam := c.QueryParam("zone_name") // Compatibilidad: buscar por nombre de zona
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

	churchID, _ := c.Get("church_id").(string)

	// Query base - ahora con JOIN a zones para obtener zone_name
	query := `
		SELECT
			g.id, g.group_name, g.leader_id, g.supervisor_id,
			g.zone_id, COALESCE(z.name, '') as zone_name,
			g.meeting_day, TO_CHAR(g.meeting_time, 'HH24:MI') as meeting_time, g.meeting_location,
			g.meeting_address, g.latitude, g.longitude,
			(SELECT COUNT(*) FROM discipleship_group_members WHERE group_id = g.id) as member_count,
			(SELECT COUNT(*) FROM discipleship_group_members WHERE group_id = g.id AND is_active = true) as active_members,
			g.status,
			g.created_at, g.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin líder') as leader_name,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
		FROM discipleship_groups g
		LEFT JOIN zones z ON g.zone_id = z.id
		LEFT JOIN users u ON g.leader_id = u.id
		LEFT JOIN users s ON g.supervisor_id = s.id
		WHERE g.church_id = $1
	`

	args := []interface{}{churchID}
	argCount := 1

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
		case 3: // General Supervisor (L3) — su subtree de líderes (2-hop)
			// Replace zone_id scope with 2-hop subtree: groups whose leader is under this General.
			argCount++
			leaderSubq := subtreeLeaderIDsSubquery(1, argCount)
			args = append(args, userID)
			query += fmt.Sprintf(" AND g.leader_id IN (%s)", leaderSubq)
			// case 4 y 5 pueden ver más, según necesidad
			// Por ahora, si no hay filtro específico, no se aplica restricción adicional
		}
	}

	// Filtros del query parameter (aplicados después de los filtros de acceso)
	if zoneIDParam != "" {
		argCount++
		query += fmt.Sprintf(" AND g.zone_id = $%d", argCount)
		args = append(args, zoneIDParam)
	} else if zoneNameParam != "" {
		// Compatibilidad: buscar por nombre de zona
		argCount++
		query += fmt.Sprintf(" AND z.name = $%d", argCount)
		args = append(args, zoneNameParam)
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

	// Construir count query con los mismos filtros
	countQuery := `
		SELECT COUNT(*)
		FROM discipleship_groups g
		LEFT JOIN zones z ON g.zone_id = z.id
		LEFT JOIN users u ON g.leader_id = u.id
		WHERE g.church_id = $1
	`

	// Aplicar los mismos filtros al count
	countArgs := []interface{}{churchID}
	countArgCount := 1

	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			countArgCount++
			countQuery += fmt.Sprintf(" AND g.leader_id = $%d", countArgCount)
			countArgs = append(countArgs, userID)
		case 2:
			countArgCount++
			countQuery += fmt.Sprintf(" AND g.supervisor_id = $%d", countArgCount)
			countArgs = append(countArgs, userID)
		case 3: // General Supervisor (L3) — su subtree de líderes (2-hop)
			countArgCount++
			countLeaderSubq := subtreeLeaderIDsSubquery(1, countArgCount)
			countArgs = append(countArgs, userID)
			countQuery += fmt.Sprintf(" AND g.leader_id IN (%s)", countLeaderSubq)
		}
	}

	if zoneIDParam != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND g.zone_id = $%d", countArgCount)
		countArgs = append(countArgs, zoneIDParam)
	} else if zoneNameParam != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND z.name = $%d", countArgCount)
		countArgs = append(countArgs, zoneNameParam)
	}

	if status != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND g.status = $%d", countArgCount)
		countArgs = append(countArgs, status)
	}

	if leaderIDParam != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND g.leader_id = $%d", countArgCount)
		countArgs = append(countArgs, leaderIDParam)
	}

	if search != "" {
		countArgCount++
		countQuery += fmt.Sprintf(" AND (g.group_name ILIKE $%d OR u.first_name ILIKE $%d OR u.last_name ILIKE $%d)", countArgCount, countArgCount, countArgCount)
		countArgs = append(countArgs, "%"+search+"%")
	}

	var total int
	err = q.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		c.Logger().Error("Error counting groups:", err)
		total = 0
	}

	// Agregar paginación
	query += fmt.Sprintf(" ORDER BY g.created_at DESC LIMIT %d OFFSET %d", limit, offset)

	rows, err := q.Query(query, args...)
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
			&g.ID, &g.GroupName, &g.LeaderID, &g.SupervisorID,
			&g.ZoneID, &g.ZoneName,
			&g.MeetingDay, &g.MeetingTime, &g.MeetingLocation,
			&g.MeetingAddress, &g.Latitude, &g.Longitude,
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	// userZoneID no longer used for case 3 (replaced by subtree scoping).
	userID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	query := `
		SELECT
			g.id, g.group_name, g.leader_id, g.supervisor_id,
			g.zone_id, COALESCE(z.name, '') as zone_name,
			g.meeting_day, TO_CHAR(g.meeting_time, 'HH24:MI') as meeting_time, g.meeting_location,
			g.meeting_address, g.latitude, g.longitude,
			(SELECT COUNT(*) FROM discipleship_group_members WHERE group_id = g.id) as member_count,
			(SELECT COUNT(*) FROM discipleship_group_members WHERE group_id = g.id AND is_active = true) as active_members,
			g.status,
			g.created_at, g.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin líder') as leader_name,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
		FROM discipleship_groups g
		LEFT JOIN zones z ON g.zone_id = z.id
		LEFT JOIN users u ON g.leader_id = u.id
		LEFT JOIN users s ON g.supervisor_id = s.id
		WHERE g.id = $1 AND g.church_id = $2
	`

	args := []interface{}{groupID, churchID}

	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			args = append(args, userID)
			query += fmt.Sprintf(" AND g.leader_id = $%d", len(args))
		case 2:
			args = append(args, userID)
			query += fmt.Sprintf(" AND g.supervisor_id = $%d", len(args))
		case 3: // General Supervisor (L3) — access via 2-hop leader subtree
			// Grant access only if the group's leader is in this General's subtree.
			// When subtree is empty the IN() returns no rows → no match → 403 naturally.
			args = append(args, churchID, userID)
			query += fmt.Sprintf(" AND g.leader_id IN (%s)", subtreeLeaderIDsSubquery(len(args)-1, len(args)))
		}
	}

	var g models.DiscipleshipGroupWithDetails
	err = q.QueryRow(query, args...).Scan(
		&g.ID, &g.GroupName, &g.LeaderID, &g.SupervisorID,
		&g.ZoneID, &g.ZoneName,
		&g.MeetingDay, &g.MeetingTime, &g.MeetingLocation,
		&g.MeetingAddress, &g.Latitude, &g.Longitude,
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

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	// Determinar zone_id: usar el que viene en el request o buscar por zone_name (compatibilidad)
	var zoneID interface{}
	if req.ZoneID != "" {
		zoneID = req.ZoneID
	} else if req.ZoneName != "" {
		// Compatibilidad: buscar zona por nombre (scoped by church_id)
		var foundZoneID string
		err = q.QueryRow("SELECT id FROM zones WHERE name = $1 AND church_id = $2", req.ZoneName, churchID).Scan(&foundZoneID)
		if err == nil {
			zoneID = foundZoneID
		} else {
			// Si no se encuentra la zona, zone_id será NULL
			zoneID = nil
		}
	} else {
		zoneID = nil
	}

	query := `
		INSERT INTO discipleship_groups (
			church_id, group_name, leader_id, supervisor_id, zone_id,
			meeting_day, meeting_time, meeting_location, meeting_address,
			latitude, longitude, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
		RETURNING id
	`

	var supervisorID interface{}
	if req.SupervisorID != "" {
		supervisorID = req.SupervisorID
	} else {
		supervisorID = nil
	}

	var meetingAddress interface{}
	if req.MeetingAddress != "" {
		meetingAddress = req.MeetingAddress
	} else {
		meetingAddress = nil
	}

	var latitude, longitude interface{}
	if req.Latitude != nil {
		latitude = *req.Latitude
	} else {
		latitude = nil
	}
	if req.Longitude != nil {
		longitude = *req.Longitude
	} else {
		longitude = nil
	}

	var groupID string
	err = q.QueryRow(
		query,
		churchID, req.GroupName, req.LeaderID, supervisorID, zoneID,
		req.MeetingDay, req.MeetingTime, req.MeetingLocation, meetingAddress,
		latitude, longitude,
	).Scan(&groupID)

	if err != nil {
		c.Logger().Error("Error creating group:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear grupo",
		})
	}

	// =====================================================
	// ASIGNAR JERARQUÍAS AUTOMÁTICAMENTE AL CREAR GRUPO
	// =====================================================

	// 1. Asignar jerarquía al LÍDER (nivel 1) si no tiene una mayor
	if req.LeaderID != "" {
		var existingLevel sql.NullInt64
		err = q.QueryRow(`
			SELECT hierarchy_level
			FROM discipleship_hierarchy
			WHERE user_id = $1 AND church_id = $2
		`, req.LeaderID, churchID).Scan(&existingLevel)

		if err == sql.ErrNoRows {
			// No tiene jerarquía, crear con nivel 1 (Líder)
			var supervisorIDForLeader interface{}
			if req.SupervisorID != "" {
				supervisorIDForLeader = req.SupervisorID
			} else {
				supervisorIDForLeader = nil
			}

			_, err = q.Exec(`
				INSERT INTO discipleship_hierarchy (
					church_id, user_id, hierarchy_level, supervisor_id, zone_id, active_groups_assigned
				) VALUES ($1, $2, 1, $3, $4, 1)
			`, churchID, req.LeaderID, supervisorIDForLeader, zoneID)
			if err != nil {
				c.Logger().Error("Error assigning hierarchy to leader:", err)
			}

			// Actualizar también en users (scoped by church_id)
			_, _ = q.Exec(`
				UPDATE users SET
					discipleship_level = 1,
					zone_id = $1,
					updated_at = NOW()
				WHERE id = $2 AND church_id = $3
			`, zoneID, req.LeaderID, churchID)
		} else if err == nil && existingLevel.Valid {
			// Ya tiene jerarquía, solo actualizar si es menor a 1 o actualizar contador
			if existingLevel.Int64 < 1 {
				_, _ = q.Exec(`
					UPDATE discipleship_hierarchy SET
						hierarchy_level = 1,
						supervisor_id = COALESCE($1, supervisor_id),
						zone_id = COALESCE($2, zone_id),
						active_groups_assigned = active_groups_assigned + 1,
						updated_at = NOW()
					WHERE user_id = $3 AND church_id = $4
				`, nullIfEmpty(req.SupervisorID), zoneID, req.LeaderID, churchID)
			} else {
				// Solo actualizar contador
				_, _ = q.Exec(`
					UPDATE discipleship_hierarchy
					SET active_groups_assigned = active_groups_assigned + 1
					WHERE user_id = $1 AND church_id = $2
				`, req.LeaderID, churchID)
			}
		} else {
			// Solo actualizar contador si ya existe
			_, _ = q.Exec(`
				UPDATE discipleship_hierarchy
				SET active_groups_assigned = active_groups_assigned + 1
				WHERE user_id = $1 AND church_id = $2
			`, req.LeaderID, churchID)
		}
	}

	// 2. Asignar jerarquía al SUPERVISOR (nivel 2) si no tiene una mayor
	if req.SupervisorID != "" {
		var existingLevel sql.NullInt64
		err = q.QueryRow(`
			SELECT hierarchy_level
			FROM discipleship_hierarchy
			WHERE user_id = $1 AND church_id = $2
		`, req.SupervisorID, churchID).Scan(&existingLevel)

		if err == sql.ErrNoRows {
			// No tiene jerarquía, crear con nivel 2 (Supervisor Auxiliar)
			_, err = q.Exec(`
				INSERT INTO discipleship_hierarchy (
					church_id, user_id, hierarchy_level, zone_id, active_groups_assigned
				) VALUES ($1, $2, 2, $3, 1)
			`, churchID, req.SupervisorID, zoneID)
			if err != nil {
				c.Logger().Error("Error assigning hierarchy to supervisor:", err)
			}

			// Actualizar también en users (scoped by church_id)
			_, _ = q.Exec(`
				UPDATE users SET
					discipleship_level = 2,
					zone_id = $1,
					updated_at = NOW()
				WHERE id = $2 AND church_id = $3
			`, zoneID, req.SupervisorID, churchID)
		} else if err == nil && existingLevel.Valid {
			// Ya tiene jerarquía, actualizar solo si es menor a 2
			if existingLevel.Int64 < 2 {
				_, _ = q.Exec(`
					UPDATE discipleship_hierarchy SET
						hierarchy_level = 2,
						zone_id = COALESCE($1, zone_id),
						active_groups_assigned = active_groups_assigned + 1,
						updated_at = NOW()
					WHERE user_id = $2 AND church_id = $3
				`, zoneID, req.SupervisorID, churchID)
			} else {
				// Solo actualizar contador
				_, _ = q.Exec(`
					UPDATE discipleship_hierarchy
					SET active_groups_assigned = active_groups_assigned + 1
					WHERE user_id = $1 AND church_id = $2
				`, req.SupervisorID, churchID)
			}
		}
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":  "Grupo creado exitosamente",
		"group_id": groupID,
	})
}

// UpdateGroup actualiza un grupo
func (h *DiscipleshipHandler) UpdateGroup(c echo.Context) error {
	groupID := c.Param("id")

	// Leer el body como map para evitar problemas con omitempty
	var body map[string]interface{}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	// Crear punteros a strings desde el body para compatibilidad con el código existente
	getStringPtr := func(key string) *string {
		if val, ok := body[key].(string); ok {
			return &val
		}
		return nil
	}

	// Determinar zone_id
	var zoneID interface{}
	zoneIDStr := getStringPtr("zone_id")
	zoneNameStr := getStringPtr("zone_name")

	if zoneIDStr != nil && *zoneIDStr != "" {
		zoneID = *zoneIDStr
	} else if zoneNameStr != nil && *zoneNameStr != "" {
		var foundZoneID string
		err = q.QueryRow("SELECT id FROM zones WHERE name = $1 AND church_id = $2", *zoneNameStr, churchID).Scan(&foundZoneID)
		if err == nil {
			zoneID = foundZoneID
		}
	}

	// Construir query dinámico
	query := "UPDATE discipleship_groups SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 0

	// Helper para agregar campo si existe
	addField := func(fieldName string, jsonKey string) {
		if val, ok := body[jsonKey]; ok && val != nil {
			// Verificar que no sea string vacío
			if strVal, isStr := val.(string); isStr && strVal == "" {
				return
			}
			argCount++
			query += fmt.Sprintf(", %s = $%d", fieldName, argCount)
			args = append(args, val)
		}
	}

	addField("group_name", "group_name")
	addField("leader_id", "leader_id")
	addField("supervisor_id", "supervisor_id")
	addField("meeting_day", "meeting_day")

	// MeetingTime especial: parsear formato ISO8601 a time.Time
	if val, ok := body["meeting_time"]; ok && val != nil {
		if strVal, isStr := val.(string); isStr && strVal != "" {
			var parsedTime time.Time
			var parsed bool

			// Intentar parsear el formato ISO8601
			parsedTime, err := time.Parse(time.RFC3339, strVal)
			if err != nil {
				// Si falla, intentar con formato simple "HH:MM:SS"
				parsedTime, err = time.Parse("15:04:05", strVal)
			}
			if err == nil {
				parsed = true
			}

			if parsed {
				argCount++
				query += fmt.Sprintf(", meeting_time = $%d", argCount)
				args = append(args, parsedTime.Format("15:04:05"))
			}
		}
	}

	addField("meeting_location", "meeting_location")

	// MeetingAddress especial: vacío = NULL
	if val, ok := body["meeting_address"]; ok {
		argCount++
		if strVal, isStr := val.(string); isStr && strVal == "" {
			query += fmt.Sprintf(", meeting_address = $%d", argCount)
			args = append(args, nil)
		} else if val != nil {
			query += fmt.Sprintf(", meeting_address = $%d", argCount)
			args = append(args, val)
		}
	}

	// Latitude y Longitude
	if val, ok := body["latitude"]; ok && val != nil {
		if floatVal, isFloat := val.(float64); isFloat {
			argCount++
			query += fmt.Sprintf(", latitude = $%d", argCount)
			args = append(args, floatVal)
		}
	}
	if val, ok := body["longitude"]; ok && val != nil {
		if floatVal, isFloat := val.(float64); isFloat {
			argCount++
			query += fmt.Sprintf(", longitude = $%d", argCount)
			args = append(args, floatVal)
		}
	}

	// Status
	addField("status", "status")

	// Zone ID especial
	if zoneID != nil || (body["zone_id"] != nil && body["zone_id"] == "") {
		argCount++
		query += fmt.Sprintf(", zone_id = $%d", argCount)
		args = append(args, zoneID)
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, groupID)
	argCount++
	query += fmt.Sprintf(" AND church_id = $%d", argCount)
	args = append(args, churchID)

	result, err := q.Exec(query, args...)
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

	// =====================================================
	// ACTUALIZAR JERARQUÍAS SI SE CAMBIARON leader_id o supervisor_id
	// =====================================================

	// Usar pool global para jerarquía — no debe compartir la transacción del grupo
	dbPool := config.GetDB().DB

	// Obtener el grupo actualizado para saber los nuevos valores
	var currentGroup struct {
		LeaderID     string
		SupervisorID sql.NullString
		ZoneID       sql.NullString
	}
	err = q.QueryRow(`
		SELECT leader_id, supervisor_id, zone_id
		FROM discipleship_groups
		WHERE id = $1 AND church_id = $2
	`, groupID, churchID).Scan(&currentGroup.LeaderID, &currentGroup.SupervisorID, &currentGroup.ZoneID)

	// Usar zoneID del request si está disponible, sino usar el actual
	if zoneID == nil && currentGroup.ZoneID.Valid {
		zoneID = currentGroup.ZoneID.String
	}

	// Reobtener punteros después de actualizar
	reqLeaderID := getStringPtr("leader_id")
	reqSupervisorID := getStringPtr("supervisor_id")

	if err == nil {
		// 1. Asignar jerarquía al nuevo LÍDER si se cambió
		if reqLeaderID != nil {
			var existingLevel sql.NullInt64
			err = dbPool.QueryRow(`
				SELECT hierarchy_level
				FROM discipleship_hierarchy
				WHERE user_id = $1 AND church_id = $2
			`, *reqLeaderID, churchID).Scan(&existingLevel)

			if err == sql.ErrNoRows {
				// No tiene jerarquía, crear con nivel 1 (Líder)
				var supervisorIDForLeader interface{}
				if reqSupervisorID != nil && *reqSupervisorID != "" {
					supervisorIDForLeader = *reqSupervisorID
				} else if currentGroup.SupervisorID.Valid {
					supervisorIDForLeader = currentGroup.SupervisorID.String
				} else {
					supervisorIDForLeader = nil
				}

				// Usar zoneID que ya determinamos arriba
				_, err = dbPool.Exec(`
					INSERT INTO discipleship_hierarchy (
						church_id, user_id, hierarchy_level, supervisor_id, zone_id, active_groups_assigned
					) VALUES ($1, $2, 1, $3, $4, 1)
				`, churchID, *reqLeaderID, supervisorIDForLeader, zoneID)
				if err != nil {
					c.Logger().Error("Error assigning hierarchy to new leader:", err)
				}

				// Actualizar también en users (scoped by church_id)
				_, _ = dbPool.Exec(`
					UPDATE users SET
						discipleship_level = 1,
						zone_id = $1,
						updated_at = NOW()
					WHERE id = $2 AND church_id = $3
				`, zoneID, *reqLeaderID, churchID)
			} else if err == nil && existingLevel.Valid {
				// Ya tiene jerarquía, actualizar si es menor a 1
				if existingLevel.Int64 < 1 {
					var supervisorIDForLeader interface{}
					if reqSupervisorID != nil && *reqSupervisorID != "" {
						supervisorIDForLeader = *reqSupervisorID
					} else if currentGroup.SupervisorID.Valid {
						supervisorIDForLeader = currentGroup.SupervisorID.String
					} else {
						supervisorIDForLeader = nil
					}

					// Usar zoneID que ya determinamos arriba
					_, _ = dbPool.Exec(`
						UPDATE discipleship_hierarchy SET
							hierarchy_level = 1,
							supervisor_id = COALESCE($1, supervisor_id),
							zone_id = COALESCE($2, zone_id),
							active_groups_assigned = active_groups_assigned + 1,
							updated_at = NOW()
						WHERE user_id = $3 AND church_id = $4
					`, supervisorIDForLeader, zoneID, *reqLeaderID, churchID)
				}
			}
		}

		// 2. Asignar jerarquía al nuevo SUPERVISOR si se cambió
		if reqSupervisorID != nil {
			var existingLevel sql.NullInt64
			err = dbPool.QueryRow(`
				SELECT hierarchy_level
				FROM discipleship_hierarchy
				WHERE user_id = $1 AND church_id = $2
			`, *reqSupervisorID, churchID).Scan(&existingLevel)

			if err == sql.ErrNoRows {
				// No tiene jerarquía, crear con nivel 2 (Supervisor Auxiliar)
				// Usar zoneID que ya determinamos arriba
				_, err = dbPool.Exec(`
					INSERT INTO discipleship_hierarchy (
						church_id, user_id, hierarchy_level, zone_id, active_groups_assigned
					) VALUES ($1, $2, 2, $3, 1)
				`, churchID, *reqSupervisorID, zoneID)
				if err != nil {
					c.Logger().Error("Error assigning hierarchy to new supervisor:", err)
				}

				// Actualizar también en users (scoped by church_id)
				_, _ = dbPool.Exec(`
					UPDATE users SET
						discipleship_level = 2,
						zone_id = $1,
						updated_at = NOW()
					WHERE id = $2 AND church_id = $3
				`, zoneID, *reqSupervisorID, churchID)
			} else if err == nil && existingLevel.Valid {
				// Ya tiene jerarquía, actualizar solo si es menor a 2
				if existingLevel.Int64 < 2 {
					// Usar zoneID que ya determinamos arriba
					_, _ = dbPool.Exec(`
						UPDATE discipleship_hierarchy SET
							hierarchy_level = 2,
							zone_id = COALESCE($1, zone_id),
							active_groups_assigned = active_groups_assigned + 1,
							updated_at = NOW()
						WHERE user_id = $2 AND church_id = $3
					`, zoneID, *reqSupervisorID, churchID)
				}
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Grupo actualizado exitosamente",
	})
}

// DeleteGroup elimina (soft delete) un grupo
func (h *DiscipleshipHandler) DeleteGroup(c echo.Context) error {
	groupID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	// Obtener leader_id y supervisor_id antes de eliminar (scoped by church_id)
	var leaderID string
	var supervisorID sql.NullString
	err = q.QueryRow(`
		SELECT leader_id, supervisor_id
		FROM discipleship_groups
		WHERE id = $1 AND church_id = $2
	`, groupID, churchID).Scan(&leaderID, &supervisorID)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Grupo no encontrado",
			})
		}
		c.Logger().Error("Error fetching group before delete:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener información del grupo",
		})
	}

	// Soft delete del grupo (scoped by church_id)
	result, err := q.Exec(`
		UPDATE discipleship_groups
		SET status = 'inactive', updated_at = NOW()
		WHERE id = $1 AND church_id = $2
	`, groupID, churchID)

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

	// Actualizar contador de grupos en la jerarquía (reducir en 1)
	if leaderID != "" {
		_, _ = q.Exec(`
			UPDATE discipleship_hierarchy
			SET active_groups_assigned = GREATEST(0, active_groups_assigned - 1)
			WHERE user_id = $1 AND church_id = $2
		`, leaderID, churchID)
	}

	if supervisorID.Valid && supervisorID.String != "" {
		_, _ = q.Exec(`
			UPDATE discipleship_hierarchy
			SET active_groups_assigned = GREATEST(0, active_groups_assigned - 1)
			WHERE user_id = $1 AND church_id = $2
		`, supervisorID.String, churchID)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	// zoneID no longer used for case 3 in GetHierarchy (replaced by subtree scoping).
	callerID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	// user_id query param only for level 4+
	userID := ""
	if canSeeAll || (hierarchyLevel != nil && *hierarchyLevel >= 4) {
		userID = c.QueryParam("user_id")
	}

	query := `
		SELECT
			h.id, h.user_id, h.hierarchy_level, h.supervisor_id,
			COALESCE((SELECT z.id::text FROM zones z WHERE z.name = h.zone_name AND z.church_id = $1), '') as zone_id,
			COALESCE(h.zone_name, '') as zone_name,
			h.territory, h.active_groups_assigned,
			h.created_at, h.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
			COALESCE(u.email, '') as user_email,
			COALESCE(s.first_name || ' ' || s.last_name, '') as supervisor_name
		FROM discipleship_hierarchy h
		LEFT JOIN users u ON h.user_id = u.id AND u.church_id = $1
		LEFT JOIN users s ON h.supervisor_id = s.id AND s.church_id = $1
		WHERE h.church_id = $1
	`

	args := []interface{}{churchID}
	argCount := 1

	if userID != "" {
		argCount++
		query += fmt.Sprintf(" AND h.user_id = $%d", argCount)
		args = append(args, userID)
	} else if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1, 2:
			argCount++
			query += fmt.Sprintf(" AND (h.user_id = $%d OR h.supervisor_id = $%d)", argCount, argCount)
			args = append(args, callerID)
		case 3: // General Supervisor (L3) — self + auxiliaries (1-hop) + their leaders (2-hop)
			// Drop the zone_id arm: replace with subtree traversal via supervisor_id chain.
			// Self: h.user_id = callerID
			// Auxiliaries (1-hop): h.user_id IN subtreeAuxIDsSubquery
			// Leaders (2-hop): h.supervisor_id IN subtreeAuxIDsSubquery (their supervisor is one of the aux)
			argCount++ // $N = callerID (self)
			churchForAux := 1      // reuse $1 = churchID
			supForAux := argCount  // $N = callerID
			query += fmt.Sprintf(
				" AND (h.user_id = $%d OR h.user_id IN (%s) OR h.supervisor_id IN (%s))",
				argCount,
				subtreeAuxIDsSubquery(churchForAux, supForAux),
				subtreeAuxIDsSubquery(churchForAux, supForAux),
			)
			args = append(args, callerID)
		}
	}

	query += " ORDER BY h.hierarchy_level DESC, h.created_at DESC"

	rows, err := q.Query(query, args...)
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
		err = rows.Scan(
			&h.ID, &h.UserID, &h.HierarchyLevel, &h.SupervisorID,
			&h.ZoneID, &h.ZoneName,
			&h.Territory, &h.ActiveGroupsAssigned,
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

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	// Determinar zone_id: usar el que viene en el request o buscar por zone_name (compatibilidad)
	var zoneID interface{}
	if req.ZoneID != "" {
		zoneID = req.ZoneID
	} else if req.ZoneName != "" {
		// Compatibilidad: buscar zona por nombre (scoped by church_id)
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

	// Verificar si ya existe (scoped by church_id)
	var existingID string
	err = q.QueryRow(
		"SELECT id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2",
		req.UserID, churchID,
	).Scan(&existingID)

	var query string
	var args []interface{}

	if err == sql.ErrNoRows {
		// Crear nuevo
		query = `
			INSERT INTO discipleship_hierarchy (
				church_id, user_id, hierarchy_level, supervisor_id, zone_id, zone_name, territory
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`
		args = []interface{}{
			churchID,
			req.UserID, req.HierarchyLevel,
			nullIfEmpty(req.SupervisorID),
			zoneID,
			nullIfEmpty(req.ZoneName),
			nullIfEmpty(req.Territory),
		}
	} else {
		// Actualizar existente
		query = `
			UPDATE discipleship_hierarchy SET
				hierarchy_level = $3,
				supervisor_id = $4,
				zone_id = $5,
				zone_name = $6,
				territory = $7,
				updated_at = NOW()
			WHERE user_id = $2 AND church_id = $1
		`
		args = []interface{}{
			churchID,
			req.UserID, req.HierarchyLevel,
			nullIfEmpty(req.SupervisorID),
			zoneID,
			nullIfEmpty(req.ZoneName),
			nullIfEmpty(req.Territory),
		}
	}

	_, err = q.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error assigning hierarchy:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al asignar jerarquía",
		})
	}

	// Double-write: sincronizar nivel en module_user_roles (fuente de verdad genérica
	// para el middleware RequireModuleLevel — independiente del rol de sistema ERP)
	roleName := discipleshipLevelName(req.HierarchyLevel)
	assignedBy, _ := c.Get("user_id").(string)
	_, err = q.Exec(`
		INSERT INTO module_user_roles (church_id, user_id, module_key, role_level, role_name, assigned_by)
		VALUES ($1, $2, 'discipleship', $3, $4, $5)
		ON CONFLICT (church_id, user_id, module_key) DO UPDATE
		  SET role_level  = EXCLUDED.role_level,
		      role_name   = EXCLUDED.role_name,
		      assigned_by = EXCLUDED.assigned_by,
		      updated_at  = NOW()
	`, churchID, req.UserID, req.HierarchyLevel, roleName, nullIfEmpty(assignedBy))
	if err != nil {
		// No bloqueante: logueamos pero no fallamos la petición
		c.Logger().Errorf("⚠ Error sincronizando module_user_roles para user %s: %v", req.UserID, err)
	}

	// Actualizar también el nivel de discipulado en la tabla users (compatibilidad, scoped)
	_, _ = q.Exec(`
		UPDATE users SET
			discipleship_level = $1,
			zone_id = $2,
			territory = $3,
			updated_at = NOW()
		WHERE id = $4 AND church_id = $5
	`, req.HierarchyLevel, zoneID, req.Territory, req.UserID, churchID)

	// Si es Líder (nivel 1), propagar supervisor_id a sus grupos (scoped by church_id)
	if req.HierarchyLevel == 1 {
		if req.SupervisorID != "" {
			_, _ = q.Exec(`
				UPDATE discipleship_groups
				SET supervisor_id = $1, updated_at = NOW()
				WHERE leader_id = $2 AND church_id = $3
			`, req.SupervisorID, req.UserID, churchID)
		} else {
			_, _ = q.Exec(`
				UPDATE discipleship_groups
				SET supervisor_id = NULL, updated_at = NOW()
				WHERE leader_id = $1 AND church_id = $2
			`, req.UserID, churchID)
		}
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Jerarquía asignada exitosamente",
	})
}

// discipleshipLevelName devuelve el nombre legible del nivel de discipulado.
func discipleshipLevelName(level int) string {
	switch level {
	case 1:
		return "Líder"
	case 2:
		return "Supervisor Auxiliar"
	case 3:
		return "Supervisor General"
	case 4:
		return "Coordinador"
	case 5:
		return "Pastoral"
	default:
		return fmt.Sprintf("Nivel %d", level)
	}
}

// GetSubordinates obtiene los subordinados de un supervisor
func (h *DiscipleshipHandler) GetSubordinates(c echo.Context) error {
	supervisorID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	// zoneID no longer used for case 3 (replaced by supervisor_id=me identity check).
	callerID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	if !canSeeAll {
		switch *hierarchyLevel {
		case 1:
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes permiso para ver subordinados.",
			})
		case 2:
			if supervisorID != callerID {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "Solo puedes ver tus propios subordinados.",
				})
			}
		case 3: // General Supervisor (L3) — can only query their OWN auxiliaries
			// Replace zone-based check: a General may only list subordinates when
			// supervisorID == callerID (same as the L2 pattern). This prevents a
			// General from listing a sibling General's auxiliaries.
			if supervisorID != callerID {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "Solo puedes ver tus propios subordinados.",
				})
			}
		}
	}

	// Para nivel 3 (General Supervisor): mostrar Supervisores Auxiliares directos (supervisor_id=me).
	// Para otros niveles: usar supervisor_id directo.
	var query string
	var queryArgs []interface{}

	if !canSeeAll && hierarchyLevel != nil && *hierarchyLevel == 3 {
		// Para nivel 3 (General Supervisor): mostrar Supervisores Auxiliares directos (supervisor_id=me).
		query = `
			SELECT
				h.id, h.user_id, h.hierarchy_level, h.supervisor_id,
				h.zone_id, COALESCE(z.name, '') as zone_name,
				h.territory, h.active_groups_assigned,
				h.created_at, h.updated_at,
				COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
				COALESCE(u.email, '') as user_email
			FROM discipleship_hierarchy h
			LEFT JOIN zones z ON h.zone_id = z.id AND z.church_id = $1
			LEFT JOIN users u ON h.user_id = u.id AND u.church_id = $1
			WHERE h.church_id = $1 AND h.hierarchy_level = 2 AND h.supervisor_id = $2
			ORDER BY h.hierarchy_level DESC
		`
		queryArgs = []interface{}{churchID, callerID}
	} else {
		query = `
			SELECT
				h.id, h.user_id, h.hierarchy_level, h.supervisor_id,
				h.zone_id, COALESCE(z.name, '') as zone_name,
				h.territory, h.active_groups_assigned,
				h.created_at, h.updated_at,
				COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
				COALESCE(u.email, '') as user_email
			FROM discipleship_hierarchy h
			LEFT JOIN zones z ON h.zone_id = z.id AND z.church_id = $1
			LEFT JOIN users u ON h.user_id = u.id AND u.church_id = $1
			WHERE h.church_id = $1 AND h.supervisor_id = $2
			ORDER BY h.hierarchy_level DESC
		`
		queryArgs = []interface{}{churchID, supervisorID}
	}

	rows, err := q.Query(query, queryArgs...)
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
			&h.ZoneID, &h.ZoneName,
			&h.Territory, &h.ActiveGroupsAssigned,
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	// Obtener información de acceso del usuario (permission check — global pool)
	userID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)

	// Determinar el nivel de reporte a usar
	userLevel := 5 // Por defecto, nivel más alto (pastor)
	if !canSeeAll && hierarchyLevel != nil {
		userLevel = *hierarchyLevel
	}

	zoneIDParam := c.QueryParam("zone_id")
	zoneNameParam := c.QueryParam("zone_name") // Compatibilidad

	var analytics models.DiscipleshipAnalytics

	// Determinar zone_id si viene zone_name (compatibilidad, scoped by church_id)
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

	// Construir filtros de grupo según nivel jerárquico + query params
	// All group queries are scoped to church_id via filterArgs[0]
	filterClause := " AND church_id = $1"
	filterArgs := []interface{}{churchID}
	argCount := 1

	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			argCount++
			filterClause += fmt.Sprintf(" AND leader_id = $%d", argCount)
			filterArgs = append(filterArgs, userID)
		case 2:
			argCount++
			filterClause += fmt.Sprintf(" AND supervisor_id = $%d", argCount)
			filterArgs = append(filterArgs, userID)
		case 3:
			if userZoneID != nil && *userZoneID != "" {
				argCount++
				filterClause += fmt.Sprintf(" AND zone_id = $%d", argCount)
				filterArgs = append(filterArgs, *userZoneID)
			} else {
				filterClause += " AND 1=0"
			}
		}
	}

	if zoneID != nil {
		argCount++
		filterClause += fmt.Sprintf(" AND zone_id = $%d", argCount)
		filterArgs = append(filterArgs, zoneID)
	}

	// Total grupos activos (scoped by church_id via filterClause)
	groupQuery := "SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active'" + filterClause
	err = q.QueryRow(groupQuery, filterArgs...).Scan(&analytics.TotalGroups)
	if err != nil {
		c.Logger().Error("Error counting groups in analytics:", err)
	}

	// Total miembros (scoped by church_id via filterClause)
	memberQuery := "SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE status = 'active'" + filterClause
	err = q.QueryRow(memberQuery, filterArgs...).Scan(&analytics.TotalMembers)
	if err != nil {
		c.Logger().Error("Error counting members in analytics:", err)
	}

	// Promedio de asistencia (últimas 4 semanas, scoped by church_id)
	err = q.QueryRow(`
		SELECT COALESCE(AVG(
			COALESCE((report_data->>'attendance_nd')::int, 0) +
			COALESCE((report_data->>'attendance_dm')::int, 0) +
			COALESCE((report_data->>'attendance_friends')::int, 0) +
			COALESCE((report_data->>'attendance_kids')::int, 0)
		), 0)
		FROM discipleship_reports
		WHERE church_id = $2
		AND report_level <= $1
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, userLevel, churchID).Scan(&analytics.AverageAttendance)
	if err != nil {
		c.Logger().Error("Error calculating attendance in analytics:", err)
	}

	// Salud espiritual (promedio últimas 4 semanas, scoped by church_id)
	err = q.QueryRow(`
		SELECT COALESCE(AVG(
			CASE WHEN COALESCE((report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'doctrine_attendance')::boolean THEN 1 ELSE 0 END
		), 0)
		FROM discipleship_reports
		WHERE church_id = $2
		AND report_level <= $1
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, userLevel, churchID).Scan(&analytics.SpiritualHealth)
	if err != nil {
		c.Logger().Error("Error calculating spiritual health in analytics:", err)
	}

	// Get group performance for active groups (scoped by church_id)
	rows, err := q.Query(`
		SELECT g.id, g.group_name, COALESCE(u.first_name || ' ' || u.last_name, 'Sin asignar') as leader_name,
			COALESCE((
				SELECT AVG(
					COALESCE((report_data->>'attendance_nd')::int, 0) +
					COALESCE((report_data->>'attendance_dm')::int, 0) +
					COALESCE((report_data->>'attendance_friends')::int, 0) +
					COALESCE((report_data->>'attendance_kids')::int, 0)
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level <= $1
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as avg_attendance,
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
					CASE WHEN (r.report_data->>'doctrine_attendance')::boolean THEN 1 ELSE 0 END
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level <= $1
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as spiritual_temp,
			g.status,
			COALESCE((SELECT MAX(r.submitted_at)::text FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id AND r.church_id = $2 AND r.report_level <= $1), '') as last_report_date
		FROM discipleship_groups g
		LEFT JOIN users u ON g.leader_id = u.id AND u.church_id = $2
		WHERE g.church_id = $2 AND g.status = 'active'
		ORDER BY avg_attendance DESC
	`, userLevel, churchID)
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
		// Calcular fase del grupo
		p.Phase = calculateGroupPhase(config.GetDB(), p.GroupID, p.SpiritualTemp)
		performance = append(performance, p)
	}
	analytics.GroupPerformance = performance

	// Active Leaders (with active groups, scoped by church_id via filterClause)
	activeLeadersQuery := "SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups WHERE status = 'active'" + filterClause
	err = q.QueryRow(activeLeadersQuery, filterArgs...).Scan(&analytics.ActiveLeaders)
	if err != nil {
		c.Logger().Error("Error counting active leaders:", err)
	}

	// Multiplications (groups with status 'multiplying', scoped by church_id via filterClause)
	multiplicationsQuery := "SELECT COUNT(*) FROM discipleship_groups WHERE status = 'multiplying'" + filterClause
	err = q.QueryRow(multiplicationsQuery, filterArgs...).Scan(&analytics.Multiplications)
	if err != nil {
		c.Logger().Error("Error counting multiplications:", err)
	}

	// Pending alerts (scoped by church_id)
	err = q.QueryRow("SELECT COUNT(*) FROM discipleship_alerts WHERE church_id = $1 AND resolved = false AND (expires_at IS NULL OR expires_at > NOW())", churchID).Scan(&analytics.PendingAlerts)
	if err != nil {
		c.Logger().Error("Error counting pending alerts:", err)
	}

	return c.JSON(http.StatusOK, analytics)
}

// calculateGroupPhase determina la fase actual de un grupo basada en sus reportes
func calculateGroupPhase(db *config.Database, groupID string, spiritualTemp float64) string {
	// 1. Verificar si tiene alertas activas → at_risk
	var hasActiveAlerts int
	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts 
		WHERE related_group_id = $1 
		AND resolved = false 
		AND (expires_at IS NULL OR expires_at > NOW())
	`, groupID).Scan(&hasActiveAlerts)
	if hasActiveAlerts > 0 {
		return utils.PhaseStruggling
	}

	// 2. Verificar si está multiplicando (is_multiplying = true en 2+ reportes seguidos)
	var multiplyingCount int
	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_reports
		WHERE (report_data->>'group_id')::uuid = $1
		AND report_level >= 1
		AND (report_data->>'is_multiplying')::boolean = true
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, groupID).Scan(&multiplyingCount)
	if multiplyingCount >= 2 {
		return utils.PhaseMultiplying
	}

	// 3. Contar reportes totales y calcular semanas activas
	var totalReports int
	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_reports
		WHERE (report_data->>'group_id')::uuid = $1
		AND report_level >= 1
	`, groupID).Scan(&totalReports)

	// 4. Calcular semanas con temp alta (>= 8)
	var solidWeeks int
	db.DB.QueryRow(`
		SELECT COUNT(*) FROM discipleship_reports
		WHERE (report_data->>'group_id')::uuid = $1
		AND report_level >= 1
		AND (
			CASE WHEN COALESCE((report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'doctrine_attendance')::boolean THEN 1 ELSE 0 END
		) >= 8
	`, groupID).Scan(&solidWeeks)

	// Determinar fase
	if totalReports >= 24 && solidWeeks >= 12 && spiritualTemp >= 8 {
		return utils.PhaseSolid
	}
	if totalReports >= 4 {
		return utils.PhaseGrowing
	}
	return utils.PhaseGerminating
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	userID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	status := c.QueryParam("status")
	zoneIDParam := c.QueryParam("zone_id")
	zoneNameParam := c.QueryParam("zone_name") // Compatibilidad

	// Determinar zone_id si viene zone_name (compatibilidad, scoped by church_id)
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
			m.id, m.parent_group_id, m.parent_leader_id, m.new_group_id, m.new_leader_id,
			m.multiplication_date, m.multiplication_type, m.success_status,
			m.initial_members, m.notes, m.created_at, m.updated_at,
			COALESCE(pg.group_name, '') as parent_group_name,
			COALESCE(ng.group_name, '') as new_group_name,
			COALESCE(pl.first_name || ' ' || pl.last_name, '') as parent_leader_name,
			COALESCE(nl.first_name || ' ' || nl.last_name, '') as new_leader_name
		FROM cell_multiplication_tracking m
		LEFT JOIN discipleship_groups pg ON m.parent_group_id = pg.id AND pg.church_id = $1
		LEFT JOIN discipleship_groups ng ON m.new_group_id = ng.id AND ng.church_id = $1
		LEFT JOIN users pl ON m.parent_leader_id = pl.id AND pl.church_id = $1
		LEFT JOIN users nl ON m.new_leader_id = nl.id AND nl.church_id = $1
		WHERE m.church_id = $1
	`
	args := []interface{}{churchID}
	argCount := 1

	// Filtro según nivel jerárquico
	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			argCount++
			query += fmt.Sprintf(" AND (m.parent_leader_id = $%d OR m.new_leader_id = $%d)", argCount, argCount)
			args = append(args, userID)
		case 2:
			argCount++
			query += fmt.Sprintf(" AND (pg.supervisor_id = $%d OR ng.supervisor_id = $%d)", argCount, argCount)
			args = append(args, userID)
		case 3:
			if userZoneID != nil && *userZoneID != "" {
				argCount++
				query += fmt.Sprintf(" AND (pg.zone_id = $%d OR ng.zone_id = $%d)", argCount, argCount)
				args = append(args, *userZoneID)
			} else {
				query += " AND 1=0"
			}
		}
	}

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND m.success_status = $%d", argCount)
		args = append(args, status)
	}

	if zoneID != nil {
		argCount++
		query += fmt.Sprintf(" AND pg.zone_id = $%d", argCount)
		args = append(args, zoneID)
	}

	query += " ORDER BY m.multiplication_date DESC LIMIT 50"

	rows, err := q.Query(query, args...)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	userID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	weeks := c.QueryParam("weeks")
	if weeks == "" {
		weeks = "12"
	}

	query := `
		SELECT
			period_start::date as week_start,
			SUM(
				COALESCE((report_data->>'attendance_nd')::int, 0) +
				COALESCE((report_data->>'attendance_dm')::int, 0) +
				COALESCE((report_data->>'attendance_friends')::int, 0) +
				COALESCE((report_data->>'attendance_kids')::int, 0)
			) as total_attendance,
			SUM(COALESCE((report_data->>'attendance_friends')::int, 0)) as total_visitors,
			COUNT(DISTINCT reporter_id) as groups_reporting
		FROM discipleship_reports r
		WHERE r.church_id = $1 AND report_level >= 1
	`
	args := []interface{}{churchID}
	argCount := 1

	if !canSeeAll && hierarchyLevel != nil {
		switch *hierarchyLevel {
		case 1:
			argCount++
			query += fmt.Sprintf(" AND r.reporter_id = $%d", argCount)
			args = append(args, userID)
		case 2:
			argCount++
			query += fmt.Sprintf(" AND (r.reporter_id = $%d OR r.supervisor_id = $%d)", argCount, argCount)
			args = append(args, userID)
		case 3:
			if userZoneID != nil && *userZoneID != "" {
				argCount++
				zoneParam := argCount
				argCount++
				query += fmt.Sprintf(" AND (r.reporter_id IN (SELECT leader_id FROM discipleship_groups WHERE zone_id = $%d) OR r.supervisor_id = $%d)", zoneParam, argCount)
				args = append(args, *userZoneID, userID)
			} else {
				query += " AND 1=0"
			}
		}
	}

	argCount++
	query += fmt.Sprintf(" AND period_start >= CURRENT_DATE - ($%d || ' weeks')::interval", argCount)
	args = append(args, weeks)

	query += " GROUP BY period_start ORDER BY week_start ASC"

	rows, err := q.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching weekly trends:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener tendencias semanales",
		})
	}
	defer rows.Close()

	type WeeklyTrend struct {
		WeekStart       string `json:"week_start"`
		TotalAttendance int    `json:"total_attendance"`
		TotalVisitors   int    `json:"total_visitors"`
		GroupsReporting int    `json:"groups_reporting"`
	}

	var trends []WeeklyTrend
	for rows.Next() {
		var t WeeklyTrend
		err := rows.Scan(
			&t.WeekStart, &t.TotalAttendance, &t.TotalVisitors,
			&t.GroupsReporting,
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID := c.Get("user_id").(string)
	churchID, _ := c.Get("church_id").(string)
	level := c.QueryParam("level")

	var stats struct {
		TotalGroups            int     `json:"total_groups"`
		TotalMembers           int     `json:"total_members"`
		AverageAttendance      float64 `json:"average_attendance"`
		GrowthRate             float64 `json:"growth_rate"`
		ActiveLeaders          int     `json:"active_leaders"`
		Multiplications        int     `json:"multiplications"`
		SpiritualHealth        float64 `json:"spiritual_health"`
		PendingAlerts          int     `json:"pending_alerts"`
		GroupsUnderSupervision int     `json:"groups_under_supervision"`
		SubordinatesCount      int     `json:"subordinates_count"`
		PendingReports         int     `json:"pending_reports"`
		ZoneName               string  `json:"zone_name"`
	}

	// Estadísticas base según nivel (all scoped by church_id)
	switch level {
	case "1": // Líder - solo sus grupos
		q.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups WHERE leader_id = $1 AND church_id = $2 AND status = 'active'
		`, userID, churchID).Scan(&stats.TotalGroups)

		q.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
			WHERE leader_id = $1 AND church_id = $2 AND status = 'active'
		`, userID, churchID).Scan(&stats.TotalMembers)

	case "2": // Supervisor Auxiliar - grupos que supervisa
		q.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups
			WHERE supervisor_id = $1 AND church_id = $2 AND status = 'active'
		`, userID, churchID).Scan(&stats.GroupsUnderSupervision)

		q.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
			WHERE supervisor_id = $1 AND church_id = $2 AND status = 'active'
		`, userID, churchID).Scan(&stats.TotalMembers)

		q.QueryRow(`
			SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups
			WHERE supervisor_id = $1 AND church_id = $2 AND status = 'active'
		`, userID, churchID).Scan(&stats.ActiveLeaders)

	case "3": // General Supervisor (L3) — su subtree de líderes (2-hop)
		// Group/member counts scoped to the General's 2-hop leader subtree (not zone_id).
		// ZoneName is kept for display; SubordinatesCount counts direct auxiliaries (1-hop).
		q.QueryRow(fmt.Sprintf(`
			SELECT COUNT(*) FROM discipleship_groups
			WHERE leader_id IN (%s) AND church_id = $1 AND status = 'active'
		`, subtreeLeaderIDsSubquery(1, 2)), churchID, userID).Scan(&stats.TotalGroups)

		q.QueryRow(fmt.Sprintf(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
			WHERE leader_id IN (%s) AND church_id = $1 AND status = 'active'
		`, subtreeLeaderIDsSubquery(1, 2)), churchID, userID).Scan(&stats.TotalMembers)

		// Zone name for display — still useful; read from the General's own hierarchy row.
		var zoneID sql.NullString
		q.QueryRow(`
			SELECT zone_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2
		`, userID, churchID).Scan(&zoneID)
		if zoneID.Valid && zoneID.String != "" {
			q.QueryRow(`
				SELECT COALESCE(name, '') FROM zones WHERE id = $1 AND church_id = $2
			`, zoneID.String, churchID).Scan(&stats.ZoneName)
		}

		q.QueryRow(`
			SELECT COUNT(*) FROM discipleship_hierarchy
			WHERE supervisor_id = $1 AND church_id = $2
		`, userID, churchID).Scan(&stats.SubordinatesCount)

	case "4": // Coordinador - su zona
		var coordZoneID sql.NullString
		q.QueryRow(`
			SELECT zone_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2
		`, userID, churchID).Scan(&coordZoneID)

		if coordZoneID.Valid && coordZoneID.String != "" {
			q.QueryRow(`
				SELECT COUNT(*) FROM discipleship_groups
				WHERE zone_id = $1 AND church_id = $2 AND status = 'active'
			`, coordZoneID.String, churchID).Scan(&stats.TotalGroups)

			q.QueryRow(`
				SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
				WHERE zone_id = $1 AND church_id = $2 AND status = 'active'
			`, coordZoneID.String, churchID).Scan(&stats.TotalMembers)

			q.QueryRow(`
				SELECT COALESCE(name, '') FROM zones WHERE id = $1 AND church_id = $2
			`, coordZoneID.String, churchID).Scan(&stats.ZoneName)
		}

		q.QueryRow(`
			SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups WHERE church_id = $1 AND status = 'active'
		`, churchID).Scan(&stats.ActiveLeaders)

		q.QueryRow(`
			SELECT COUNT(*) FROM discipleship_hierarchy
			WHERE supervisor_id = $1 AND church_id = $2
		`, userID, churchID).Scan(&stats.SubordinatesCount)

		q.QueryRow(`
			SELECT COUNT(*) FROM cell_multiplication_tracking
			WHERE church_id = $1
			AND multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
			AND success_status = 'successful'
		`, churchID).Scan(&stats.Multiplications)

	case "5": // Pastor - todo el sistema (scoped by church_id)
		q.QueryRow(`
			SELECT COUNT(*) FROM discipleship_groups WHERE church_id = $1 AND status = 'active'
		`, churchID).Scan(&stats.TotalGroups)

		q.QueryRow(`
			SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE church_id = $1 AND status = 'active'
		`, churchID).Scan(&stats.TotalMembers)

		q.QueryRow(`
			SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups WHERE church_id = $1 AND status = 'active'
		`, churchID).Scan(&stats.ActiveLeaders)

		q.QueryRow(`
			SELECT COUNT(*) FROM cell_multiplication_tracking
			WHERE church_id = $1
			AND multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
			AND success_status = 'successful'
		`, churchID).Scan(&stats.Multiplications)
	}

	// Estadísticas comunes — leer de discipleship_reports
	// Filtrar por nivel: ver reportes de niveles <= al nivel del usuario
	levelInt := 1 // default
	if l, err := strconv.Atoi(level); err == nil {
		levelInt = l
	}
	q.QueryRow(`
		SELECT COALESCE(AVG(
			COALESCE((report_data->>'attendance_nd')::int, 0) +
			COALESCE((report_data->>'attendance_dm')::int, 0) +
			COALESCE((report_data->>'attendance_friends')::int, 0) +
			COALESCE((report_data->>'attendance_kids')::int, 0)
		), 0)
		FROM discipleship_reports
		WHERE church_id = $2 AND report_level <= $1
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, levelInt, churchID).Scan(&stats.AverageAttendance)

	q.QueryRow(`
		SELECT COALESCE(AVG(
			CASE WHEN COALESCE((report_data->>'attendance_nd')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_dm')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_friends')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'attendance_kids')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_discipleships')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'group_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_new_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_mature_disciples_care')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'spiritual_journal_days')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN COALESCE((report_data->>'leader_evangelism')::int, 0) > 0 THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_sunday')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'service_attendance_prayer')::boolean THEN 1 ELSE 0 END +
			CASE WHEN (report_data->>'doctrine_attendance')::boolean THEN 1 ELSE 0 END
		), 0)
		FROM discipleship_reports
		WHERE church_id = $2 AND report_level <= $1
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, levelInt, churchID).Scan(&stats.SpiritualHealth)

	q.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts WHERE church_id = $1 AND resolved = false
	`, churchID).Scan(&stats.PendingAlerts)

	// Siempre filtrar por supervisor_id: el badge solo refleja reportes
	// dirigidos directamente a este usuario, sin importar su nivel.
	q.QueryRow(`
		SELECT COUNT(*) FROM discipleship_reports
		WHERE church_id = $3 AND status = 'submitted' AND supervisor_id = $1 AND reporter_id != $2
	`, userID, userID, churchID).Scan(&stats.PendingReports)

	return c.JSON(http.StatusOK, stats)
}

// GetLeaderGroupStats obtiene estadísticas de grupos para un líder específico
func (h *DiscipleshipHandler) GetLeaderGroupStats(c echo.Context) error {
	leaderID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, zoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	if !canSeeAll {
		switch *hierarchyLevel {
		case 1:
			if leaderID != callerID {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "Solo puedes ver tus propias estadísticas.",
				})
			}
		case 2:
			var count int
			err := q.QueryRow(`SELECT COUNT(*) FROM discipleship_hierarchy WHERE supervisor_id = $1 AND user_id = $2 AND church_id = $3`, callerID, leaderID, churchID).Scan(&count)
			if err != nil || count == 0 {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "No tienes permiso para ver estadísticas de este líder.",
				})
			}
		case 3:
			if zoneID == nil || *zoneID == "" {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "No tienes zona asignada.",
				})
			}
			var count int
			err := q.QueryRow(`SELECT COUNT(*) FROM discipleship_groups WHERE leader_id = $1 AND zone_id = $2::uuid AND church_id = $3`, leaderID, *zoneID, churchID).Scan(&count)
			if err != nil || count == 0 {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "No tienes permiso para ver estadísticas de este líder.",
				})
			}
		}
	}

	type GroupStats struct {
		GroupID            string  `json:"group_id"`
		GroupName          string  `json:"group_name"`
		MemberCount        int     `json:"member_count"`
		ActiveMembers      int     `json:"active_members"`
		AvgAttendance      float64 `json:"avg_attendance"`
		AvgSpiritualTemp   float64 `json:"avg_spiritual_temp"`
		TotalVisitors      int     `json:"total_visitors"`
		TotalConversions   int     `json:"total_conversions"`
		LastReportDate     string  `json:"last_report_date"`
		WeeksWithoutReport int     `json:"weeks_without_report"`
	}

	rows, err := q.Query(`
		SELECT
			g.id, g.group_name, g.member_count, g.active_members,
			COALESCE((
				SELECT AVG(
					COALESCE((r.report_data->>'attendance_nd')::int, 0) +
					COALESCE((r.report_data->>'attendance_dm')::int, 0) +
					COALESCE((r.report_data->>'attendance_friends')::int, 0) +
					COALESCE((r.report_data->>'attendance_kids')::int, 0)
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level >= 1
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as avg_attendance,
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
					CASE WHEN (r.report_data->>'doctrine_attendance')::boolean THEN 1 ELSE 0 END
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level <= 5
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as avg_spiritual_temp,
			COALESCE((
				SELECT SUM(COALESCE((r.report_data->>'attendance_friends')::int, 0))
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level <= 5
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as total_visitors,
			COALESCE((
				SELECT SUM(
					COALESCE((r.report_data->>'group_evangelism')::int, 0) +
					COALESCE((r.report_data->>'leader_evangelism')::int, 0)
				)
				FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id
				AND r.church_id = $2
				AND r.report_level <= 5
				AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'
			), 0) as total_conversions,
			COALESCE((SELECT MAX(r.submitted_at)::text FROM discipleship_reports r
				WHERE (r.report_data->>'group_id')::uuid = g.id AND r.church_id = $2 AND r.report_level <= 5), '') as last_report_date
		FROM discipleship_groups g
		WHERE g.leader_id = $1 AND g.church_id = $2 AND g.status = 'active'
	`, leaderID, churchID)

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
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, zoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	if !canSeeAll {
		switch *hierarchyLevel {
		case 1:
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes permiso para ver subordinados.",
			})
		case 2:
			if supervisorID != callerID {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "Solo puedes ver tus propios subordinados.",
				})
			}
		case 3:
			var supZoneID sql.NullString
			err := q.QueryRow(`SELECT zone_id::text FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2`, supervisorID, churchID).Scan(&supZoneID)
			if err != nil || !supZoneID.Valid || supZoneID.String == "" || zoneID == nil || supZoneID.String != *zoneID {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "No tienes permiso para ver subordinados de este supervisor.",
				})
			}
		}
	}

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

	rows, err := q.Query(`
		SELECT
			h.id, h.user_id,
			COALESCE(u.first_name || ' ' || u.last_name, '') as user_name,
			COALESCE(u.email, '') as user_email,
			h.hierarchy_level,
			h.active_groups_assigned,
			COALESCE((SELECT SUM(member_count) FROM discipleship_groups g
				WHERE g.church_id = $1 AND (g.leader_id = h.user_id OR g.supervisor_id = h.user_id)), 0) as total_members,
			COALESCE((SELECT AVG(
				COALESCE((r.report_data->>'attendance_nd')::int, 0) +
				COALESCE((r.report_data->>'attendance_dm')::int, 0) +
				COALESCE((r.report_data->>'attendance_friends')::int, 0) +
				COALESCE((r.report_data->>'attendance_kids')::int, 0)
			) FROM discipleship_reports r
			JOIN discipleship_groups g ON (r.report_data->>'group_id')::uuid = g.id
			WHERE r.church_id = $1 AND g.church_id = $1
			AND (g.leader_id = h.user_id OR g.supervisor_id = h.user_id)
			AND r.report_level >= 1
			AND r.period_end >= CURRENT_DATE - INTERVAL '28 days'), 0) as avg_attendance,
			COALESCE((SELECT MAX(r.submitted_at)::text FROM discipleship_reports r
				WHERE r.church_id = $1 AND r.reporter_id = h.user_id), '') as last_report_date
		FROM discipleship_hierarchy h
		LEFT JOIN users u ON h.user_id = u.id AND u.church_id = $1
		WHERE h.church_id = $1 AND h.supervisor_id = $2
		ORDER BY h.hierarchy_level DESC, user_name
	`, churchID, supervisorID)

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

// =====================================================
// NIVELES DE DISCIPULADO
// =====================================================

func (h *DiscipleshipHandler) GetDiscipleshipLevels(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	isActive := c.QueryParam("is_active")
	query := `SELECT id, name, description, icon, color, order_index, is_active, created_at, updated_at FROM discipleship_levels WHERE church_id = $1`

	args := []interface{}{churchID}
	if isActive != "" {
		query += " AND is_active = $2"
		args = append(args, isActive == "true")
	}

	query += " ORDER BY order_index"

	rows, err := q.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching discipleship levels:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener niveles de discipulado",
		})
	}
	defer rows.Close()

	var levels []models.DiscipleshipLevel
	for rows.Next() {
		var level models.DiscipleshipLevel
		err := rows.Scan(
			&level.ID, &level.Name, &level.Description, &level.Icon,
			&level.Color, &level.OrderIndex, &level.IsActive,
			&level.CreatedAt, &level.UpdatedAt,
		)
		if err != nil {
			c.Logger().Error("Error scanning discipleship level:", err)
			continue
		}
		levels = append(levels, level)
	}

	return c.JSON(http.StatusOK, levels)
}

func (h *DiscipleshipHandler) GetDiscipleshipLevel(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	levelID := c.Param("id")

	query := `SELECT id, name, description, icon, color, order_index, is_active, created_at, updated_at FROM discipleship_levels WHERE id = $1 AND church_id = $2`

	var level models.DiscipleshipLevel
	err = q.QueryRow(query, levelID, churchID).Scan(
		&level.ID, &level.Name, &level.Description, &level.Icon,
		&level.Color, &level.OrderIndex, &level.IsActive,
		&level.CreatedAt, &level.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Nivel de discipulado no encontrado",
		})
	}
	if err != nil {
		c.Logger().Error("Error fetching discipleship level:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener nivel de discipulado",
		})
	}

	return c.JSON(http.StatusOK, level)
}

func (h *DiscipleshipHandler) CreateDiscipleshipLevel(c echo.Context) error {
	var req models.CreateDiscipleshipLevelRequest
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

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	icon := "users"
	if req.Icon != "" {
		icon = req.Icon
	}

	color := "#3b82f6"
	if req.Color != "" {
		color = req.Color
	}

	query := `
		INSERT INTO discipleship_levels (church_id, name, description, icon, color, order_index)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	var level models.DiscipleshipLevel
	err = q.QueryRow(
		query,
		churchID,
		req.Name,
		req.Description,
		icon,
		color,
		req.OrderIndex,
	).Scan(&level.ID, &level.CreatedAt, &level.UpdatedAt)

	if err != nil {
		c.Logger().Error("Error creating discipleship level:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear nivel de discipulado",
		})
	}

	level.Name = req.Name
	level.Description = req.Description
	level.Icon = icon
	level.Color = color
	level.OrderIndex = req.OrderIndex
	level.IsActive = true

	return c.JSON(http.StatusCreated, level)
}

func (h *DiscipleshipHandler) UpdateDiscipleshipLevel(c echo.Context) error {
	levelID := c.Param("id")

	var req models.UpdateDiscipleshipLevelRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	query := "UPDATE discipleship_levels SET updated_at = NOW()"
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

	if req.Icon != nil {
		argCount++
		query += fmt.Sprintf(", icon = $%d", argCount)
		args = append(args, *req.Icon)
	}

	if req.Color != nil {
		argCount++
		query += fmt.Sprintf(", color = $%d", argCount)
		args = append(args, *req.Color)
	}

	if req.OrderIndex != nil {
		argCount++
		query += fmt.Sprintf(", order_index = $%d", argCount)
		args = append(args, *req.OrderIndex)
	}

	if req.IsActive != nil {
		argCount++
		query += fmt.Sprintf(", is_active = $%d", argCount)
		args = append(args, *req.IsActive)
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, levelID)
	argCount++
	query += fmt.Sprintf(" AND church_id = $%d", argCount)
	args = append(args, churchID)

	result, err := q.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating discipleship level:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar nivel de discipulado",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Nivel de discipulado no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Nivel de discipulado actualizado exitosamente",
	})
}

func (h *DiscipleshipHandler) DeleteDiscipleshipLevel(c echo.Context) error {
	levelID := c.Param("id")

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	result, err := q.Exec("DELETE FROM discipleship_levels WHERE id = $1 AND church_id = $2", levelID, churchID)
	if err != nil {
		c.Logger().Error("Error deleting discipleship level:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar nivel de discipulado",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Nivel de discipulado no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Nivel de discipulado eliminado exitosamente",
	})
}

// =====================================================
// MIEMBROS DE GRUPO DE DISCIPULADO
// =====================================================

func (h *DiscipleshipHandler) GetGroupMembers(c echo.Context) error {
	groupID := c.Param("id")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado",
		})
	}

	if !canSeeAll {
		var leaderID, supervisorID sql.NullString
		var groupZoneID sql.NullString
		err = q.QueryRow(
			`SELECT leader_id, supervisor_id, zone_id FROM discipleship_groups WHERE id = $1 AND church_id = $2`,
			groupID, churchID,
		).Scan(&leaderID, &supervisorID, &groupZoneID)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusNotFound, map[string]string{"error": "Grupo no encontrado"})
			}
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar acceso al grupo"})
		}

		hasAccess := false
		switch *hierarchyLevel {
		case 4, 5:
			hasAccess = true
		case 3:
			hasAccess = groupZoneID.Valid && userZoneID != nil && groupZoneID.String == *userZoneID
		case 2:
			hasAccess = supervisorID.Valid && supervisorID.String == callerID
		case 1:
			hasAccess = leaderID.Valid && leaderID.String == callerID
		}

		if !hasAccess {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes acceso a los miembros de este grupo",
			})
		}
	}

	query := `
		SELECT gm.id, gm.group_id, gm.user_id, gm.role_in_group, gm.is_active, gm.joined_at, gm.created_at, gm.updated_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin nombre') as user_name,
			COALESCE(u.email, '') as user_email
		FROM discipleship_group_members gm
		LEFT JOIN users u ON gm.user_id = u.id AND u.church_id = $2
		WHERE gm.group_id = $1 AND gm.church_id = $2
		ORDER BY gm.role_in_group DESC, gm.joined_at ASC
	`

	rows, err := q.Query(query, groupID, churchID)
	if err != nil {
		c.Logger().Error("Error fetching group members:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener miembros del grupo",
		})
	}
	defer rows.Close()

	var members []models.GroupMemberWithDetails
	for rows.Next() {
		var m models.GroupMemberWithDetails
		err := rows.Scan(
			&m.ID, &m.GroupID, &m.UserID, &m.RoleInGroup, &m.IsActive,
			&m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
			&m.UserName, &m.UserEmail,
		)
		if err != nil {
			c.Logger().Error("Error scanning group member:", err)
			continue
		}
		members = append(members, m)
	}

	return c.JSON(http.StatusOK, members)
}

func (h *DiscipleshipHandler) AddGroupMember(c echo.Context) error {
	groupID := c.Param("id")
	var req models.AddGroupMemberRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	roleInGroup := utils.GroupRoleMember
	if req.RoleInGroup != "" {
		roleInGroup = req.RoleInGroup
	}

	var memberID string
	err = q.QueryRow(`
		INSERT INTO discipleship_group_members (church_id, group_id, user_id, role_in_group)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (group_id, user_id) DO UPDATE SET is_active = true, role_in_group = $4
		RETURNING id
	`, churchID, groupID, req.UserID, roleInGroup).Scan(&memberID)

	if err != nil {
		c.Logger().Error("Error adding group member:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al agregar miembro al grupo",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":   "Miembro agregado al grupo",
		"member_id": memberID,
	})
}

func (h *DiscipleshipHandler) UpdateGroupMember(c echo.Context) error {
	memberID := c.Param("memberId")
	var req models.UpdateGroupMemberRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	query := "UPDATE discipleship_group_members SET updated_at = NOW()"
	args := []interface{}{}
	argCount := 0

	if req.RoleInGroup != nil {
		argCount++
		query += fmt.Sprintf(", role_in_group = $%d", argCount)
		args = append(args, *req.RoleInGroup)
	}

	if req.IsActive != nil {
		argCount++
		query += fmt.Sprintf(", is_active = $%d", argCount)
		args = append(args, *req.IsActive)
	}

	argCount++
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, memberID)
	argCount++
	query += fmt.Sprintf(" AND church_id = $%d", argCount)
	args = append(args, churchID)

	result, err := q.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating group member:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar miembro del grupo",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Miembro del grupo no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Miembro del grupo actualizado",
	})
}

func (h *DiscipleshipHandler) RemoveGroupMember(c echo.Context) error {
	memberID := c.Param("memberId")
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	result, err := q.Exec("UPDATE discipleship_group_members SET is_active = false, updated_at = NOW() WHERE id = $1 AND church_id = $2", memberID, churchID)
	if err != nil {
		c.Logger().Error("Error removing group member:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al remover miembro del grupo",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Miembro del grupo no encontrado",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Miembro removido del grupo",
	})
}

// =====================================================
// ASISTENCIA A REUNIONES DE DISCIPULADO
// =====================================================

func (h *DiscipleshipHandler) GetGroupAttendance(c echo.Context) error {
	groupID := c.Param("id")
	meetingDate := c.QueryParam("date")

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado",
		})
	}

	if !canSeeAll {
		var leaderID, supervisorID sql.NullString
		var groupZoneID sql.NullString
		err = q.QueryRow(
			`SELECT leader_id, supervisor_id, zone_id FROM discipleship_groups WHERE id = $1 AND church_id = $2`,
			groupID, churchID,
		).Scan(&leaderID, &supervisorID, &groupZoneID)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusNotFound, map[string]string{"error": "Grupo no encontrado"})
			}
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al verificar acceso al grupo"})
		}

		hasAccess := false
		switch *hierarchyLevel {
		case 4, 5:
			hasAccess = true
		case 3:
			hasAccess = groupZoneID.Valid && userZoneID != nil && groupZoneID.String == *userZoneID
		case 2:
			hasAccess = supervisorID.Valid && supervisorID.String == callerID
		case 1:
			hasAccess = leaderID.Valid && leaderID.String == callerID
		}

		if !hasAccess {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes acceso a la asistencia de este grupo",
			})
		}
	}

	query := `
		SELECT a.id, a.group_id, a.user_id, a.meeting_date, a.present, a.attendance_type, a.notes, a.created_at,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sin nombre') as user_name
		FROM discipleship_attendance a
		LEFT JOIN users u ON a.user_id = u.id AND u.church_id = $2
		WHERE a.group_id = $1 AND a.church_id = $2
	`
	args := []interface{}{groupID, churchID}
	argCount := 2

	if meetingDate != "" {
		argCount++
		query += fmt.Sprintf(" AND a.meeting_date = $%d", argCount)
		args = append(args, meetingDate)
	}

	query += " ORDER BY a.meeting_date DESC, u.first_name ASC"

	rows, err := q.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching group attendance:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener asistencia del grupo",
		})
	}
	defer rows.Close()

	var attendance []models.AttendanceWithDetails
	for rows.Next() {
		var a models.AttendanceWithDetails
		err := rows.Scan(
			&a.ID, &a.GroupID, &a.UserID, &a.MeetingDate, &a.Present,
			&a.AttendanceType, &a.Notes, &a.CreatedAt, &a.UserName,
		)
		if err != nil {
			c.Logger().Error("Error scanning attendance:", err)
			continue
		}
		attendance = append(attendance, a)
	}

	return c.JSON(http.StatusOK, attendance)
}

func (h *DiscipleshipHandler) RecordAttendance(c echo.Context) error {
	groupID := c.Param("id")
	var req models.RecordAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	meetingDate := c.QueryParam("date")
	if meetingDate == "" {
		meetingDate = time.Now().Format("2006-01-02")
	}

	attendanceType := utils.AttendanceRegular
	if req.AttendanceType != "" {
		attendanceType = req.AttendanceType
	}

	var attendanceID string
	err = q.QueryRow(`
		INSERT INTO discipleship_attendance (church_id, group_id, user_id, meeting_date, present, attendance_type, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (group_id, user_id, meeting_date)
		DO UPDATE SET present = $5, attendance_type = $6, notes = $7
		RETURNING id
	`, churchID, groupID, req.UserID, meetingDate, req.Present, attendanceType, req.Notes).Scan(&attendanceID)

	if err != nil {
		c.Logger().Error("Error recording attendance:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al registrar asistencia",
		})
	}

	// Update active_members count (scoped by church_id)
	_, _ = q.Exec(`
		UPDATE discipleship_groups
		SET active_members = (
			SELECT COUNT(*) FROM discipleship_attendance
			WHERE group_id = $1 AND church_id = $3 AND meeting_date = $2 AND present = true
		)
		WHERE id = $1 AND church_id = $3
	`, groupID, meetingDate, churchID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":       "Asistencia registrada",
		"attendance_id": attendanceID,
	})
}

func (h *DiscipleshipHandler) BulkRecordAttendance(c echo.Context) error {
	groupID := c.Param("id")
	var req models.BulkAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	if len(req.Attendance) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "No hay registros de asistencia",
		})
	}

	// BulkRecordAttendance needs its own nested tx; use the tenant tx from context
	// (already opened by TenantTx middleware and has church_id GUC set).
	// We use the Querier (which is the tenant *sql.Tx) directly for all writes.
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)

	meetingDate := req.MeetingDate
	if meetingDate == "" {
		meetingDate = time.Now().Format("2006-01-02")
	}

	for _, att := range req.Attendance {
		attendanceType := utils.AttendanceRegular
		if att.AttendanceType != "" {
			attendanceType = att.AttendanceType
		}

		_, err = q.Exec(`
			INSERT INTO discipleship_attendance (church_id, group_id, user_id, meeting_date, present, attendance_type, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (group_id, user_id, meeting_date)
			DO UPDATE SET present = $5, attendance_type = $6, notes = $7
		`, churchID, groupID, att.UserID, meetingDate, att.Present, attendanceType, att.Notes)

		if err != nil {
			c.Logger().Error("Error inserting attendance:", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Error al registrar asistencia",
			})
		}
	}

	// Update active_members count (scoped by church_id)
	_, _ = q.Exec(`
		UPDATE discipleship_groups
		SET active_members = (
			SELECT COUNT(*) FROM discipleship_attendance
			WHERE group_id = $1 AND church_id = $3 AND meeting_date = $2 AND present = true
		)
		WHERE id = $1 AND church_id = $3
	`, groupID, meetingDate, churchID)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":      "Asistencia registrada exitosamente",
		"count":        len(req.Attendance),
		"meeting_date": meetingDate,
	})
}

func (h *DiscipleshipHandler) GetMemberAttendanceStats(c echo.Context) error {
	targetUserID := c.Param("userId")
	groupID := c.QueryParam("group_id")

	q, err := validateTx(c)
	if err != nil {
		return err
	}
	dbGlobal := config.GetDB()
	churchID, _ := c.Get("church_id").(string)

	callerID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, dbGlobal)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado",
		})
	}

	if !canSeeAll && targetUserID != callerID {
		hasAccess := false
		switch *hierarchyLevel {
		case 4, 5:
			hasAccess = true
		case 3:
			var count int
			q.QueryRow(`
				SELECT COUNT(*) FROM discipleship_group_members dgm
				JOIN discipleship_groups dg ON dgm.group_id = dg.id
				WHERE dgm.church_id = $3 AND dgm.user_id = $1 AND dg.zone_id = $2
			`, targetUserID, *userZoneID, churchID).Scan(&count)
			hasAccess = count > 0
		case 2:
			var count int
			q.QueryRow(`
				SELECT COUNT(*) FROM discipleship_group_members dgm
				JOIN discipleship_groups dg ON dgm.group_id = dg.id
				WHERE dgm.church_id = $3 AND dgm.user_id = $1 AND dg.supervisor_id = $2
			`, targetUserID, callerID, churchID).Scan(&count)
			hasAccess = count > 0
		case 1:
			var count int
			q.QueryRow(`
				SELECT COUNT(*) FROM discipleship_group_members dgm
				JOIN discipleship_groups dg ON dgm.group_id = dg.id
				WHERE dgm.church_id = $3 AND dgm.user_id = $1 AND dg.leader_id = $2
			`, targetUserID, callerID, churchID).Scan(&count)
			hasAccess = count > 0
		}

		if !hasAccess {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "No tienes acceso a las estadísticas de este usuario",
			})
		}
	}

	query := `
		SELECT
			COUNT(*) as total_meetings,
			COUNT(*) FILTER (WHERE present = true) as present_count,
			ROUND(COUNT(*) FILTER (WHERE present = true)::numeric * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
		FROM discipleship_attendance
		WHERE user_id = $1 AND church_id = $2
	`
	args := []interface{}{targetUserID, churchID}
	argCount := 2

	if groupID != "" {
		argCount++
		query += fmt.Sprintf(" AND group_id = $%d", argCount)
		args = append(args, groupID)
	}

	var stats struct {
		TotalMeetings        int     `json:"total_meetings"`
		PresentCount         int     `json:"present_count"`
		AttendancePercentage float64 `json:"attendance_percentage"`
	}

	err = q.QueryRow(query, args...).Scan(
		&stats.TotalMeetings,
		&stats.PresentCount,
		&stats.AttendancePercentage,
	)

	if err != nil {
		c.Logger().Error("Error getting member attendance stats:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener estadísticas de asistencia",
		})
	}

	return c.JSON(http.StatusOK, stats)
}

// =====================================================
// USUARIOS PARA GESTIÓN DE JERARQUÍA
// =====================================================

// UserForHierarchy contiene la información básica de un usuario
// necesaria para asignar niveles de jerarquía de discipulado.
type UserForHierarchy struct {
	ID             string   `json:"id"`
	FirstName      string   `json:"first_name"`
	LastName       string   `json:"last_name"`
	Email          string   `json:"email"`
	Phone          string   `json:"phone"`
	IDNumber       string   `json:"id_number"`
	Role           string   `json:"role"`
	HierarchyLevel *int     `json:"hierarchy_level"`
	SupervisorID   *string  `json:"supervisor_id"`
	ZoneID         *string  `json:"zone_id"`
	ZoneName       *string  `json:"zone_name"`
	Territory      *string  `json:"territory"`
	Latitude       *float64 `json:"latitude"`
	Longitude      *float64 `json:"longitude"`
}

// GetUsersForHierarchy devuelve la lista de usuarios con su nivel de jerarquía actual.
// Accesible a usuarios con nivel de discipulado >= 4 (Coordinador) o admin access.
// Este endpoint existe específicamente para la gestión de jerarquías — NO expone
// datos administrativos sensibles del módulo de usuarios del ERP.
func (h *DiscipleshipHandler) GetUsersForHierarchy(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	userID, hierarchyLevel, userZoneID, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if !canSeeAll && hierarchyLevel == nil {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes acceso al módulo de discipulado. Contacta a un administrador para asignarte un nivel jerárquico.",
		})
	}

	query := `
		SELECT
			u.id,
			COALESCE(u.first_name, '')    AS first_name,
			COALESCE(u.last_name, '')     AS last_name,
			COALESCE(u.email, '')         AS email,
			COALESCE(u.phone, '')         AS phone,
			COALESCE(u.id_number, '')     AS id_number,
			COALESCE(u.role::text, '')    AS role,
			dh.hierarchy_level,
			dh.supervisor_id,
			u.zone_id,
			dh.zone_name,
			dh.territory,
			u.latitude,
			u.longitude
		FROM users u
		LEFT JOIN discipleship_hierarchy dh ON dh.user_id = u.id
		WHERE u.is_active = true
	`

	args := []interface{}{}
	query, args = addHierarchyUserFilter(query, args, userID, hierarchyLevel, userZoneID, canSeeAll)

	query += " ORDER BY u.first_name, u.last_name"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error fetching users for hierarchy:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener usuarios",
		})
	}
	defer rows.Close()

	var users []UserForHierarchy
	for rows.Next() {
		var u UserForHierarchy
		if err := rows.Scan(
			&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.Phone, &u.IDNumber, &u.Role,
			&u.HierarchyLevel, &u.SupervisorID, &u.ZoneID, &u.ZoneName, &u.Territory,
			&u.Latitude, &u.Longitude,
		); err != nil {
			c.Logger().Error("Error scanning user for hierarchy:", err)
			continue
		}
		users = append(users, u)
	}

	if users == nil {
		users = []UserForHierarchy{}
	}

	return c.JSON(http.StatusOK, users)
}
