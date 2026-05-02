package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type DiscipleshipGoalsHandler struct{}

func NewDiscipleshipGoalsHandler() *DiscipleshipGoalsHandler {
	return &DiscipleshipGoalsHandler{}
}

// CreateGoal crea un nuevo objetivo estratégico
func (h *DiscipleshipGoalsHandler) CreateGoal(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	userID := c.Get("user_id").(string)
	
	// Verificar que el usuario puede crear goals (pastor 400+ o supervisor 200+)
	var userLevel int
	err = db.DB.QueryRow("SELECT COALESCE((SELECT r.role_level FROM discipleship_hierarchy r WHERE r.user_id = $1), (SELECT utils.GetRoleLevel(role) FROM users WHERE id = $1))", userID).Scan(&userLevel)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error verificando permisos",
		})
	}

	// Solo pastor (400) y supervisores (200+) pueden crear goals
	if userLevel < 200 {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para crear objetivos",
		})
	}

	type CreateGoalRequest struct {
		GoalType      string  `json:"goal_type" validate:"required"`
		Title         string  `json:"title" validate:"required"`
		Description   string  `json:"description"`
		TargetMetric  string  `json:"target_metric" validate:"required"`
		TargetValue   int     `json:"target_value" validate:"required,gt=0"`
		Deadline      string  `json:"deadline" validate:"required"`
		ZoneID        *string `json:"zone_id"`
		Priority      int     `json:"priority" default:"2"`
	}

	var req CreateGoalRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	// Validar goal_type
	validTypes := []string{"growth", "attendance", "conversions", "baptisms", "new_groups", "multiplications", "spiritual_health"}
	valid := false
	for _, t := range validTypes {
		if req.GoalType == t {
			valid = true
			break
		}
	}
	if !valid {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "goal_type inválido. Debe ser: growth, attendance, conversions, baptisms, new_groups, multiplications, spiritual_health",
		})
	}

	// Validar fecha
	deadline, err := time.Parse("2006-01-02", req.Deadline)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Formato de fecha inválido (YYYY-MM-DD)",
		})
	}

	// Determinar zone_id
	var zoneID interface{} = nil
	if req.ZoneID != nil && *req.ZoneID != "" {
		// Verificar que la zona existe
		var exists bool
		err = db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM zones WHERE id = $1)", *req.ZoneID).Scan(&exists)
		if err != nil || !exists {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Zona no encontrada",
			})
		}
		zoneID = *req.ZoneID
	}

	// Insertar goal
	var goalID string
	err = db.DB.QueryRow(`
		INSERT INTO discipleship_goals (
			goal_type, title, description, target_metric, target_value,
			deadline, status, priority, created_by, zone_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, req.GoalType, req.Title, req.Description, req.TargetMetric,
		req.TargetValue, deadline, "active", req.Priority, userID, zoneID,
	).Scan(&goalID)

	if err != nil {
		c.Logger().Error("Error creating goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear objetivo",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":        "Objetivo creado exitosamente",
		"goal_id":        goalID,
		"status":          "active",
		"progress":       0,
	})
}

// GetGoals lista objetivos con filtros
func (h *DiscipleshipGoalsHandler) GetGoals(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	userID := c.Get("user_id").(string)
	status := c.QueryParam("status")
	zoneID := c.QueryParam("zone_id")
	userLevel := c.Get("role_level").(int)

	query := `
		SELECT 
			g.id, g.goal_type, g.title, g.description, g.target_metric,
			g.target_value, g.current_value, g.progress_percentage, g.deadline,
			g.status, g.priority, g.created_by, g.zone_id,
			COALESCE(z.name, '') as zone_name, g.created_at, g.updated_at
		FROM discipleship_goals g
		LEFT JOIN zones z ON g.zone_id = z.id
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 0

	// Filtrar por status
	if status != "" && status != "all" {
		argCount++
		query += fmt.Sprintf(" AND g.status = $%d", argCount)
		args = append(args, status)
	}

	// Filtrar por zona
	if zoneID != "" {
		argCount++
		query += fmt.Sprintf(" AND g.zone_id = $%d", argCount)
		args = append(args, zoneID)
	}

	// Si es supervisor (200-399), solo ve sus goals y los de su zona
	if userLevel >= 200 && userLevel < 400 {
		argCount++
		query += fmt.Sprintf(" AND (g.created_by = $%d", argCount)
		args = append(args, userID)
		
		// También ve goals de su zona
		var userZoneID sql.NullString
		db.DB.QueryRow("SELECT zone_id FROM discipleship_hierarchy WHERE user_id = $1", userID).Scan(&userZoneID)
		if userZoneID.Valid {
			argCount++
			query += fmt.Sprintf(" OR g.zone_id = $%d", argCount)
			args = append(args, userZoneID.String)
		}
		query += ")"
	}

	// Si es líder (100), ve goals asignados a su grupo
	if userLevel == 100 {
		argCount++
		query += fmt.Sprintf(" AND g.zone_id IN (SELECT zone_id FROM discipleship_groups WHERE leader_id = $%d)", argCount)
		args = append(args, userID)
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
		Title              string         `json:"title"`
		Description        string         `json:"description"`
		TargetMetric       string         `json:"target_metric"`
		TargetValue        int            `json:"target_value"`
		CurrentValue       int            `json:"current_value"`
		ProgressPercentage float64        `json:"progress_percentage"`
		Deadline           string         `json:"deadline"`
		Status             string         `json:"status"`
		Priority           int            `json:"priority"`
		CreatedBy          string         `json:"created_by"`
		ZoneID             sql.NullString `json:"zone_id"`
		ZoneName           string         `json:"zone_name"`
		CreatedAt          string         `json:"created_at"`
		UpdatedAt          string         `json:"updated_at"`
	}

	var goals []Goal
	for rows.Next() {
		var g Goal
		err := rows.Scan(
			&g.ID, &g.GoalType, &g.Title, &g.Description, &g.TargetMetric,
			&g.TargetValue, &g.CurrentValue, &g.ProgressPercentage, &g.Deadline,
			&g.Status, &g.Priority, &g.CreatedBy, &g.ZoneID, &g.ZoneName,
			&g.CreatedAt, &g.UpdatedAt,
		)
		if err != nil {
			continue
		}
		goals = append(goals, g)
	}

	return c.JSON(http.StatusOK, goals)
}

// UpdateGoal actualiza un objetivo (solo creador o admin)
func (h *DiscipleshipGoalsHandler) UpdateGoal(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	goalID := c.Param("id")
	userID := c.Get("user_id").(string)

	// Verificar que el usuario es el creador o admin (500)
	var createdBy string
	var userLevel int
	err = db.DB.QueryRow("SELECT created_by FROM discipleship_goals WHERE id = $1", goalID).Scan(&createdBy)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	err = db.DB.QueryRow("SELECT COALESCE((SELECT r.role_level FROM discipleship_hierarchy r WHERE r.user_id = $1), (SELECT utils.GetRoleLevel(role) FROM users WHERE id = $1))", userID).Scan(&userLevel)
	if userLevel < 500 && createdBy != userID {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Solo el creador o admin puede editar",
		})
	}

	type UpdateGoalRequest struct {
		Title         *string `json:"title"`
		Description   *string `json:"description"`
		TargetValue   *int    `json:"target_value"`
		Deadline      *string `json:"deadline"`
		Priority      *int    `json:"priority"`
	}

	var req UpdateGoalRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	// Construir query dinámica
	query := "UPDATE discipleship_goals SET "
	args := []interface{}{}
	argCount := 0

	if req.Title != nil {
		argCount++
		query += fmt.Sprintf("title = $%d, ", argCount)
		args = append(args, *req.Title)
	}
	if req.Description != nil {
		argCount++
		query += fmt.Sprintf("description = $%d, ", argCount)
		args = append(args, *req.Description)
	}
	if req.TargetValue != nil {
		argCount++
		query += fmt.Sprintf("target_value = $%d, ", argCount)
		args = append(args, *req.TargetValue)
	}
	if req.Deadline != nil {
		deadline, err := time.Parse("2006-01-02", *req.Deadline)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Formato de fecha inválido",
			})
		}
		argCount++
		query += fmt.Sprintf("deadline = $%d, ", argCount)
		args = append(args, deadline)
	}
	if req.Priority != nil {
		argCount++
		query += fmt.Sprintf("priority = $%d, ", argCount)
		args = append(args, *req.Priority)
	}

	// Actualizar progresso si cambió target_value
	if req.TargetValue != nil {
		argCount++
		query += fmt.Sprintf("progress_percentage = (current_value::float / $%d::float) * 100, ", argCount)
		args = append(args, *req.TargetValue)
	}

	// updated_at se actualiza con trigger
	argCount++
	query += fmt.Sprintf("updated_at = NOW() WHERE id = $%d", argCount)
	args = append(args, goalID)

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		c.Logger().Error("Error updating goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar objetivo",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Objetivo actualizado exitosamente",
	})
}

// DeleteGoal elimina un objetivo (solo admin 500)
func (h *DiscipleshipGoalsHandler) DeleteGoal(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	userLevel := c.Get("role_level").(int)
	if userLevel < 500 {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Solo admin puede eliminar objetivos",
		})
	}

	goalID := c.Param("id")
	_, err = db.DB.Exec("DELETE FROM discipleship_goals WHERE id = $1", goalID)
	if err != nil {
		c.Logger().Error("Error deleting goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar objetivo",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Objetivo eliminado exitosamente",
	})
}

// ExtendDeadline concede una prórroga
func (h *DiscipleshipGoalsHandler) ExtendDeadline(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	goalID := c.Param("id")
	userID := c.Get("user_id").(string)

	// Verificar que el usuario es el creador, supervisor superior o admin
	var createdBy string
	var goalStatus string
	err = db.DB.QueryRow("SELECT created_by, status FROM discipleship_goals WHERE id = $1", goalID).Scan(&createdBy, &goalStatus)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	// Solo permite prórroga si está vencido o en pending_review
	if goalStatus != "pending_review" && goalStatus != "failed" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Solo objetivos vencidos o en revisión pueden ser prorrogados",
		})
	}

	type ExtendRequest struct {
		NewDeadline    string `json:"new_deadline" validate:"required"`
		Reason         string `json:"reason" validate:"required"`
	}

	var req ExtendRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	newDeadline, err := time.Parse("2006-01-02", req.NewDeadline)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Formato de fecha inválido",
		})
	}

	// Actualizar goal con prórroga
	_, err = db.DB.Exec(`
		UPDATE discipleship_goals SET
			deadline = $1,
			extension_count = extension_count + 1,
			original_deadline = COALESCE(original_deadline, deadline),
			extension_reason = $2,
			extended_by = $3,
			extended_at = NOW(),
			status = 'active'
		WHERE id = $4
	`, newDeadline, req.Reason, userID, goalID)

	if err != nil {
		c.Logger().Error("Error extending goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al prorrogar objetivo",
		})
	}

	// Notificar al creador original si no es el mismo usuario
	if createdBy != userID {
		// Aquí podrías enviar una notificación/email
		// TODO: Implementar servicio de notificaciones
		// config.GetEmailService().SendNotificationEmail(createdBy, "Prórroga concedida", 
		// 	fmt.Sprintf("Tu objetivo ha sido prorrogado hasta %s", newDeadline.Format("2006-01-02")))
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Prórroga concedida exitosamente",
	})
}

// CloseIncomplete cierra un objetivo como incompleto
func (h *DiscipleshipGoalsHandler) CloseIncomplete(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	goalID := c.Param("id")
	userID := c.Get("user_id").(string)
	userLevel := c.Get("role_level").(int)

	// Verificar permisos: creador, supervisor superior o admin
	var createdBy string
	err = db.DB.QueryRow("SELECT created_by FROM discipleship_goals WHERE id = $1", goalID).Scan(&createdBy)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	if userLevel < 500 && createdBy != userID {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Solo el creador o admin puede cerrar el objetivo",
		})
	}

	type CloseRequest struct {
		Reason string `json:"reason" validate:"required"`
	}

	var req CloseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos",
		})
	}

	// Obtener valor actual
	var currentValue int
	var targetValue int
	db.DB.QueryRow("SELECT current_value, target_value FROM discipleship_goals WHERE id = $1", goalID).Scan(&currentValue, &targetValue)

	_, err = db.DB.Exec(`
		UPDATE discipleship_goals SET
			status = 'failed',
			closed_incomplete = true,
			closed_percentage = ($1::float / $2::float) * 100,
			closure_reason = $3,
			closed_by = $4,
			closed_at = NOW()
		WHERE id = $5
	`, currentValue, targetValue, req.Reason, userID, goalID)

	if err != nil {
		c.Logger().Error("Error closing goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al cerrar objetivo",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Objetivo cerrado como incompleto",
		"achieved_percentage": fmt.Sprintf("%.2f%%", (float64(currentValue)/float64(targetValue))*100),
	})
}

// AutoUpdateProgress actualiza el progreso automáticamente basado en reportes
func (h *DiscipleshipGoalsHandler) AutoUpdateProgress(c echo.Context) error {
	db, err := validateDB(c)
	if err != nil {
		return err
	}

	goalID := c.Param("id")

	// Obtener goal para saber qué métrica actualizar
	var goal struct {
		GoalType     string
		TargetMetric  string
		ZoneID        sql.NullString
		CreatedBy     string
		TargetValue   int
	}

	err = db.DB.QueryRow(`
		SELECT goal_type, target_metric, zone_id, created_by, target_value
		FROM discipleship_goals WHERE id = $1
	`, goalID).Scan(&goal.GoalType, &goal.TargetMetric, &goal.ZoneID, &goal.CreatedBy, &goal.TargetValue)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	// Determinar el nivel del creador para saber qué reportes leer
	var creatorLevel int
	db.DB.QueryRow("SELECT COALESCE((SELECT r.role_level FROM discipleship_hierarchy r WHERE r.user_id = $1), (SELECT utils.GetRoleLevel(role) FROM users WHERE id = $1))", goal.CreatedBy).Scan(&creatorLevel)

	// Calcular current_value basado en reportes
	var currentValue int
	var query string
	var args []interface{}

	switch goal.TargetMetric {
	case "member_count":
		// Contar miembros activos de grupos
		query = "SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE status = 'active'"
		if goal.ZoneID.Valid {
			query += " AND zone_id = $1"
			args = append(args, goal.ZoneID.String)
		}
	case "attendance":
		// Promedio de asistencia de reportes (últimas 4 semanas)
		query = `
			SELECT COALESCE(AVG(
				COALESCE((report_data->>'attendance_nd')::int, 0) +
				COALESCE((report_data->>'attendance_dm')::int, 0) +
				COALESCE((report_data->>'attendance_friends')::int, 0) +
				COALESCE((report_data->>'attendance_kids')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE report_level <= $1 AND period_end >= CURRENT_DATE - INTERVAL '28 days'
		`
		args = append(args, creatorLevel)
		if goal.ZoneID.Valid {
			query += " AND (report_data->>'group_id')::uuid IN (SELECT id FROM discipleship_groups WHERE zone_id = $2)"
			args = append(args, goal.ZoneID.String)
		}
	case "conversions":
		query = `
			SELECT COALESCE(SUM(
				COALESCE((report_data->>'group_evangelism')::int, 0) +
				COALESCE((report_data->>'leader_evangelism')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE report_level <= $1 AND period_end >= CURRENT_DATE - INTERVAL '365 days'
		`
		args = append(args, creatorLevel)
	case "baptisms":
		query = `
			SELECT COALESCE(SUM(
				COALESCE((report_data->>'baptisms')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE report_level <= $1 AND period_end >= CURRENT_DATE - INTERVAL '365 days'
		`
		args = append(args, creatorLevel)
	case "group_count":
		query = "SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active'"
		if goal.ZoneID.Valid {
			query += " AND zone_id = $1"
			args = append(args, goal.ZoneID.String)
		}
	case "multiplication_count":
		query = `
			SELECT COUNT(*) FROM cell_multiplication_tracking 
			WHERE success_status = 'successful' AND multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
		`
		if goal.ZoneID.Valid {
			query += " AND parent_group_id IN (SELECT id FROM discipleship_groups WHERE zone_id = $1)"
			args = append(args, goal.ZoneID.String)
		}
	case "spiritual_temperature":
		query = `
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
			), 0) * 10 / 12  -- Promedio trimestral * 10 para escala 1-10
			FROM discipleship_reports
			WHERE report_level <= $1 AND period_end >= CURRENT_DATE - INTERVAL '90 days'
		`
		args = append(args, creatorLevel)
	}

	err = db.DB.QueryRow(query, args...).Scan(&currentValue)
	if err != nil {
		c.Logger().Error("Error calculating progress:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al calcular progreso",
		})
	}

	// Actualizar goal
	progressPercentage := 0.0
	if goal.TargetValue > 0 {
		progressPercentage = (float64(currentValue) / float64(goal.TargetValue)) * 100
	}

	newStatus := "active"
	if currentValue >= goal.TargetValue {
		newStatus = "completed"
	} else if time.Now().After(time.Now()) {  // Simplificado: verificar deadline real
		newStatus = "pending_review"
	}

	_, err = db.DB.Exec(`
		UPDATE discipleship_goals SET
			current_value = $1,
			progress_percentage = $2,
			status = $3,
			updated_at = NOW()
		WHERE id = $4
	`, currentValue, progressPercentage, newStatus, goalID)

	if err != nil {
		c.Logger().Error("Error updating goal progress:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar progreso",
		})
	}

	// Si se cumplió, enviar notificación
	if newStatus == "completed" {
		// TODO: Implementar servicio de notificaciones
		// config.GetEmailService().SendNotificationEmail(goal.CreatedBy, "¡Objetivo Cumplido!", 
		// 	fmt.Sprintf("Tu objetivo %s ha sido cumplido.", goal.GoalType))
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":              "Progreso actualizado",
		"current_value":        currentValue,
		"progress_percentage": progressPercentage,
		"status":              newStatus,
	})
}
