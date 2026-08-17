package handlers

import (
	"backend-sion/config"
	"backend-sion/utils"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type DiscipleshipGoalsHandler struct{}

// getContextUserID safely extracts user_id from context (handles nil and wrong types)
func getContextUserID(c echo.Context) (string, error) {
	v := c.Get("user_id")
	if v == nil {
		return "", fmt.Errorf("user_id not found in context")
	}
	if s, ok := v.(string); ok {
		return s, nil
	}
	// If middleware stored it as a different type, convert to string
	return fmt.Sprintf("%v", v), nil
}

// getContextRoleLevel safely extracts role_level from context (handles string/int mismatch)
func getContextRoleLevel(c echo.Context) int {
	v := c.Get("role_level")
	if v == nil {
		return 0 // Default: member level
	}

	// Try as int first
	if i, ok := v.(int); ok {
		return i
	}

	// Try as string (middleware stores it as string)
	if s, ok := v.(string); ok {
		if level, err := strconv.Atoi(s); err == nil {
			return level
		}
	}

	// Default fallback
	return 0
}

func NewDiscipleshipGoalsHandler() *DiscipleshipGoalsHandler {
	return &DiscipleshipGoalsHandler{}
}

// logGoalAudit writes a row to audit_logs for goal-related events.
// Designed to run in a goroutine (fire-and-forget). goalID is used as record_id.
// Takes *config.Database intentionally — this is an audit/permission helper,
// not a tenant data query. Pass config.GetDB() at call sites.
func logGoalAudit(db *config.Database, goalID, userID, action, tableName, newValues string) {
	db.DB.Exec(`
		INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by, changed_at)
		VALUES ($1, $2::uuid, $3, $4::jsonb, $5::uuid, NOW())
	`, tableName, goalID, action, newValues, userID)
}

// CreateGoal crea un nuevo objetivo estratégico
func (h *DiscipleshipGoalsHandler) CreateGoal(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	userID, err := getContextUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	// Solo nivel jerárquico 4-5 (Coordinador/Pastoral) o rol ERP admin/pastor/staff pueden crear goals
	var userRole string
	q.QueryRow("SELECT role FROM users WHERE id = $1 AND church_id = $2", userID, churchID).Scan(&userRole)

	var hierarchyLevel sql.NullInt64
	q.QueryRow("SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2", userID, churchID).Scan(&hierarchyLevel)

	canCreate := utils.IsAdminRole(userRole) || (hierarchyLevel.Valid && hierarchyLevel.Int64 >= 4)
	if !canCreate {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "No tienes permisos para crear objetivos",
		})
	}

	type CreateGoalRequest struct {
		GoalType        string  `json:"goal_type" validate:"required"`
		Title           string  `json:"title" validate:"required"`
		Description     string  `json:"description"`
		TargetMetric    string  `json:"target_metric" validate:"required"`
		TargetValue     int     `json:"target_value" validate:"required,gt=0"`
		Deadline        string  `json:"deadline" validate:"required"`
		ZoneID          *string `json:"zone_id"`
		Priority        int     `json:"priority" default:"2"`
		MeasurementType string  `json:"measurement_type"` // "automatic" | "manual"
	}

	var req CreateGoalRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	// Validar goal_type
	validTypes := []string{"growth", "attendance", "conversions", "baptisms", "new_groups", "multiplications", "spiritual_health", "personalizado"}
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
		// Verificar que la zona existe y pertenece al mismo church
		var exists bool
		err = q.QueryRow("SELECT EXISTS(SELECT 1 FROM zones WHERE id = $1 AND church_id = $2)", *req.ZoneID, churchID).Scan(&exists)
		if err != nil || !exists {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Zona no encontrada",
			})
		}
		zoneID = *req.ZoneID
	}

	// Normalizar measurement_type
	measurementType := req.MeasurementType
	if measurementType != "automatic" && measurementType != "manual" {
		measurementType = "manual"
	}
	// personalizado siempre es manual
	if req.GoalType == "personalizado" {
		measurementType = "manual"
	}

	// Insertar goal
	var goalID string
	err = q.QueryRow(`
		INSERT INTO discipleship_goals (
			goal_type, title, description, target_metric, target_value,
			deadline, status, priority, created_by, zone_id, measurement_type, church_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`, req.GoalType, req.Title, req.Description, req.TargetMetric,
		req.TargetValue, deadline, "active", req.Priority, userID, zoneID, measurementType, churchID,
	).Scan(&goalID)

	if err != nil {
		c.Logger().Error("Error creating goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al crear objetivo",
		})
	}

	go logGoalAudit(config.GetDB(), goalID, userID, "INSERT", "discipleship_goals",
		fmt.Sprintf(`{"title":%q,"goal_type":%q,"target_value":%d,"measurement_type":%q}`,
			req.Title, req.GoalType, req.TargetValue, measurementType))

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":  "Objetivo creado exitosamente",
		"goal_id":  goalID,
		"status":   "active",
		"progress": 0,
	})
}

// GetGoals lista objetivos con filtros
func (h *DiscipleshipGoalsHandler) GetGoals(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	status := c.QueryParam("status")
	zoneID := c.QueryParam("zone_id")

	db := config.GetDB()
	userID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Usuario no autenticado correctamente",
		})
	}

	userLevel := 0
	if canSeeAll {
		userLevel = 5
	} else if hierarchyLevel != nil {
		userLevel = *hierarchyLevel
	}

	query := `
		SELECT
			g.id, g.goal_type, g.title, g.description, g.target_metric,
			g.target_value, g.current_value, g.progress_percentage,
			g.deadline, g.status, g.priority, g.created_by,
			g.zone_id, COALESCE(g.zone_name, ''), g.created_at, g.updated_at
		FROM discipleship_goals g
		WHERE g.church_id = $1
	`
	args := []interface{}{churchID}
	argCount := 1

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
		q.QueryRow("SELECT zone_id FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2", userID, churchID).Scan(&userZoneID)
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
		query += fmt.Sprintf(" AND g.zone_id IN (SELECT zone_id FROM discipleship_groups WHERE leader_id = $%d AND church_id = $1)", argCount)
		args = append(args, userID)
	}

	query += " ORDER BY deadline ASC"

	rows, err := q.Query(query, args...)
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
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	userID, err := getContextUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	// Verificar que el objetivo existe y pertenece a este church
	var createdBy string
	var userLevel int
	err = q.QueryRow("SELECT created_by FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&createdBy)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	err = q.QueryRow("SELECT COALESCE((SELECT r.role_level FROM discipleship_hierarchy r WHERE r.user_id = $1 AND r.church_id = $2), (SELECT utils.GetRoleLevel(role) FROM users WHERE id = $1 AND church_id = $2))", userID, churchID).Scan(&userLevel)
	if userLevel < 500 && createdBy != userID {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Solo el creador o admin puede editar",
		})
	}

	type UpdateGoalRequest struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		TargetValue *int    `json:"target_value"`
		Deadline    *string `json:"deadline"`
		Priority    *int    `json:"priority"`
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
	argCount++
	query += fmt.Sprintf(" AND church_id = $%d", argCount)
	args = append(args, churchID)

	_, err = q.Exec(query, args...)
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

// DeleteGoal elimina un objetivo.
// Permitido si: canSeeAll (pastor/admin) O el usuario es quien lo creó.
func (h *DiscipleshipGoalsHandler) DeleteGoal(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	// Verificar existencia y quién lo creó
	var createdBy string
	err = q.QueryRow("SELECT created_by FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&createdBy)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Objetivo no encontrado"})
	}

	if !canSeeAll && createdBy != userID {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "Solo podés eliminar objetivos que vos creaste",
		})
	}

	// Leer título antes de eliminar para el audit log
	var goalTitle string
	q.QueryRow("SELECT title FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&goalTitle)

	_, err = q.Exec("DELETE FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID)
	if err != nil {
		c.Logger().Error("Error deleting goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar objetivo",
		})
	}

	go logGoalAudit(config.GetDB(), goalID, userID, "DELETE", "discipleship_goals",
		fmt.Sprintf(`{"title":%q}`, goalTitle))

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Objetivo eliminado exitosamente",
	})
}

// ExtendDeadline concede una prórroga
func (h *DiscipleshipGoalsHandler) ExtendDeadline(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	userID, err := getContextUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	// Verificar que el usuario es el creador, supervisor superior o admin
	var createdBy string
	var goalStatus string
	err = q.QueryRow("SELECT created_by, status FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&createdBy, &goalStatus)
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
		NewDeadline string `json:"new_deadline" validate:"required"`
		Reason      string `json:"reason" validate:"required"`
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
	_, err = q.Exec(`
		UPDATE discipleship_goals SET
			deadline = $1,
			extension_count = extension_count + 1,
			original_deadline = COALESCE(original_deadline, deadline),
			extension_reason = $2,
			extended_by = $3,
			extended_at = NOW(),
			status = 'active'
		WHERE id = $4 AND church_id = $5
	`, newDeadline, req.Reason, userID, goalID, churchID)

	if err != nil {
		c.Logger().Error("Error extending goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al prorrogar objetivo",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Prórroga concedida exitosamente",
	})
}

// CloseIncomplete cierra un objetivo como incompleto
func (h *DiscipleshipGoalsHandler) CloseIncomplete(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	userID, err := getContextUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}
	userLevel := getContextRoleLevel(c)

	// Verificar permisos: creador, supervisor superior o admin
	var createdBy string
	err = q.QueryRow("SELECT created_by FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&createdBy)
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
	q.QueryRow("SELECT current_value, target_value FROM discipleship_goals WHERE id = $1 AND church_id = $2", goalID, churchID).Scan(&currentValue, &targetValue)

	_, err = q.Exec(`
		UPDATE discipleship_goals SET
			status = 'failed',
			closed_incomplete = true,
			closed_percentage = ($1::float / $2::float) * 100,
			closure_reason = $3,
			closed_by = $4,
			closed_at = NOW()
		WHERE id = $5 AND church_id = $6
	`, currentValue, targetValue, req.Reason, userID, goalID, churchID)

	if err != nil {
		c.Logger().Error("Error closing goal:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al cerrar objetivo",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message":             "Objetivo cerrado como incompleto",
		"achieved_percentage": fmt.Sprintf("%.2f%%", (float64(currentValue)/float64(targetValue))*100),
	})
}

// AutoUpdateProgress actualiza el progreso automáticamente basado en reportes
func (h *DiscipleshipGoalsHandler) AutoUpdateProgress(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")

	// Obtener goal para saber qué métrica actualizar
	var goal struct {
		GoalType     string
		TargetMetric string
		ZoneID       sql.NullString
		CreatedBy    string
		TargetValue  int
	}

	err = q.QueryRow(`
		SELECT goal_type, target_metric, zone_id, created_by, target_value
		FROM discipleship_goals WHERE id = $1 AND church_id = $2
	`, goalID, churchID).Scan(&goal.GoalType, &goal.TargetMetric, &goal.ZoneID, &goal.CreatedBy, &goal.TargetValue)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Objetivo no encontrado",
		})
	}

	// Determinar el nivel del creador para saber qué reportes leer
	var creatorLevel int
	q.QueryRow("SELECT COALESCE((SELECT r.role_level FROM discipleship_hierarchy r WHERE r.user_id = $1 AND r.church_id = $2), (SELECT utils.GetRoleLevel(role) FROM users WHERE id = $1 AND church_id = $2))", goal.CreatedBy, churchID).Scan(&creatorLevel)

	// Calcular current_value basado en reportes
	var currentValue int
	var query string
	var args []interface{}

	switch goal.TargetMetric {
	case "member_count":
		query = "SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE status = 'active' AND church_id = $1"
		args = append(args, churchID)
		if goal.ZoneID.Valid {
			query += " AND zone_id = $2"
			args = append(args, goal.ZoneID.String)
		}
	case "attendance":
		query = `
			SELECT COALESCE(AVG(
				COALESCE((report_data->>'attendance_nd')::int, 0) +
				COALESCE((report_data->>'attendance_dm')::int, 0) +
				COALESCE((report_data->>'attendance_friends')::int, 0) +
				COALESCE((report_data->>'attendance_kids')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE church_id = $1 AND report_level <= $2 AND period_end >= CURRENT_DATE - INTERVAL '28 days'
		`
		args = append(args, churchID, creatorLevel)
		if goal.ZoneID.Valid {
			query += " AND (report_data->>'group_id')::uuid IN (SELECT id FROM discipleship_groups WHERE zone_id = $3 AND church_id = $1)"
			args = append(args, goal.ZoneID.String)
		}
	case "conversions":
		query = `
			SELECT COALESCE(SUM(
				COALESCE((report_data->>'group_evangelism')::int, 0) +
				COALESCE((report_data->>'leader_evangelism')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE church_id = $1 AND report_level <= $2 AND period_end >= CURRENT_DATE - INTERVAL '365 days'
		`
		args = append(args, churchID, creatorLevel)
	case "baptisms":
		query = `
			SELECT COALESCE(SUM(
				COALESCE((report_data->>'baptisms')::int, 0)
			), 0)
			FROM discipleship_reports
			WHERE church_id = $1 AND report_level <= $2 AND period_end >= CURRENT_DATE - INTERVAL '365 days'
		`
		args = append(args, churchID, creatorLevel)
	case "group_count":
		query = "SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active' AND church_id = $1"
		args = append(args, churchID)
		if goal.ZoneID.Valid {
			query += " AND zone_id = $2"
			args = append(args, goal.ZoneID.String)
		}
	case "multiplication_count":
		query = `
			SELECT COUNT(*) FROM cell_multiplication_tracking
			WHERE success_status = 'successful' AND multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
			AND church_id = $1
		`
		args = append(args, churchID)
		if goal.ZoneID.Valid {
			query += " AND parent_group_id IN (SELECT id FROM discipleship_groups WHERE zone_id = $2 AND church_id = $1)"
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
			WHERE church_id = $1 AND report_level <= $2 AND period_end >= CURRENT_DATE - INTERVAL '90 days'
		`
		args = append(args, churchID, creatorLevel)
	}

	err = q.QueryRow(query, args...).Scan(&currentValue)
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
	} else if time.Now().After(time.Now()) { // Simplificado: verificar deadline real
		newStatus = "pending_review"
	}

	_, err = q.Exec(`
		UPDATE discipleship_goals SET
			current_value = $1,
			progress_percentage = $2,
			status = $3,
			updated_at = NOW()
		WHERE id = $4 AND church_id = $5
	`, currentValue, progressPercentage, newStatus, goalID, churchID)

	if err != nil {
		c.Logger().Error("Error updating goal progress:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al actualizar progreso",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":             "Progreso actualizado",
		"current_value":       currentValue,
		"progress_percentage": progressPercentage,
		"status":              newStatus,
	})
}

// =====================================================
// PHASE 1 — CASCADE ASSIGNMENT HANDLERS
// =====================================================

// canAssignTo checks whether a creator at creatorLevel can assign to a user at assigneeLevel.
// Only adjacent level-down assignments are permitted (creator == assignee+1), or canSeeAll.
func canAssignTo(creatorLevel *int, assigneeLevel int, canSeeAll bool) bool {
	if canSeeAll {
		return true
	}
	return creatorLevel != nil && *creatorLevel == assigneeLevel+1
}

// CreateAssignments handles POST /goals/:id/assignments
// Accepts an array of assignments; checks canAssignTo per row.
// Returns {created: [...], skipped: [...]} where skipped entries had permission errors.
func (h *DiscipleshipGoalsHandler) CreateAssignments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, hierarchyLevel, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	type AssignmentItem struct {
		AssignedTo         string  `json:"assigned_to"`
		TargetValue        float64 `json:"target_value"`
		ParentAssignmentID *string `json:"parent_assignment_id,omitempty"`
		Notes              *string `json:"notes,omitempty"`
	}
	type CreateAssignmentsRequest struct {
		Assignments []AssignmentItem `json:"assignments"`
	}

	var req CreateAssignmentsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos: " + err.Error()})
	}
	if len(req.Assignments) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Se requiere al menos una asignación"})
	}

	// Verify the goal exists and belongs to this church
	var goalExists bool
	err = q.QueryRow("SELECT EXISTS(SELECT 1 FROM discipleship_goals WHERE id = $1 AND church_id = $2)", goalID, churchID).Scan(&goalExists)
	if err != nil || !goalExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Objetivo no encontrado"})
	}

	type CreatedAssignment struct {
		ID                 string  `json:"id"`
		GoalID             string  `json:"goal_id"`
		AssignedTo         string  `json:"assigned_to"`
		AssignedBy         string  `json:"assigned_by"`
		AssignedLevel      int     `json:"assigned_level"`
		TargetValue        float64 `json:"target_value"`
		CurrentValue       float64 `json:"current_value"`
		ParentAssignmentID *string `json:"parent_assignment_id,omitempty"`
		Status             string  `json:"status"`
		CreatedAt          string  `json:"created_at"`
	}
	type SkippedAssignment struct {
		AssignedTo string `json:"assigned_to"`
		Reason     string `json:"reason"`
	}

	var created []CreatedAssignment
	var skipped []SkippedAssignment

	for _, item := range req.Assignments {
		// Fetch assignee's hierarchy level (scoped to church)
		var assigneeLevel int
		err = q.QueryRow("SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1 AND church_id = $2", item.AssignedTo, churchID).Scan(&assigneeLevel)
		if err != nil {
			skipped = append(skipped, SkippedAssignment{AssignedTo: item.AssignedTo, Reason: "usuario sin nivel jerárquico"})
			continue
		}

		if !canAssignTo(hierarchyLevel, assigneeLevel, canSeeAll) {
			skipped = append(skipped, SkippedAssignment{AssignedTo: item.AssignedTo, Reason: "nivel jerárquico no permitido (solo nivel adyacente)"})
			continue
		}

		var newID, createdAt string
		var currentVal float64
		err = q.QueryRow(`
			INSERT INTO goal_assignments (goal_id, assigned_to, assigned_by, assigned_level, target_value, parent_assignment_id, notes, church_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (goal_id, assigned_to, parent_assignment_id) DO UPDATE
				SET target_value = EXCLUDED.target_value, updated_at = NOW()
			RETURNING id, current_value, created_at
		`, goalID, item.AssignedTo, userID, assigneeLevel, item.TargetValue, item.ParentAssignmentID, item.Notes, churchID).Scan(&newID, &currentVal, &createdAt)
		if err != nil {
			c.Logger().Error("Error creating assignment:", err)
			skipped = append(skipped, SkippedAssignment{AssignedTo: item.AssignedTo, Reason: "error al insertar"})
			continue
		}

		created = append(created, CreatedAssignment{
			ID:                 newID,
			GoalID:             goalID,
			AssignedTo:         item.AssignedTo,
			AssignedBy:         userID,
			AssignedLevel:      assigneeLevel,
			TargetValue:        item.TargetValue,
			CurrentValue:       currentVal,
			ParentAssignmentID: item.ParentAssignmentID,
			Status:             "active",
			CreatedAt:          createdAt,
		})
	}

	// Audit log para cada asignación creada
	for _, ca := range created {
		caCopy := ca
		go logGoalAudit(config.GetDB(), goalID, userID, "INSERT", "goal_assignments",
			fmt.Sprintf(`{"assigned_to":%q,"target_value":%g,"goal_id":%q}`,
				caCopy.AssignedTo, caCopy.TargetValue, goalID))
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"created": created,
		"skipped": skipped,
	})
}

// BatchAssignToZones handles POST /goals/:id/assignments/batch-zones
// Pastor-only: assigns goal to all level-3 users across all zones.
func (h *DiscipleshipGoalsHandler) BatchAssignToZones(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}
	if !canSeeAll {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "Solo el pastor puede asignar a todas las zonas"})
	}

	type BatchRequest struct {
		DefaultTargetValue *float64 `json:"default_target_value,omitempty"`
	}
	var req BatchRequest
	c.Bind(&req) // optional body — ignore error

	defaultTarget := 0.0
	if req.DefaultTargetValue != nil {
		defaultTarget = *req.DefaultTargetValue
	}

	// Fetch all level-3 users (Supervisor General) scoped to this church
	rows, err := q.Query(`
		SELECT user_id FROM discipleship_hierarchy WHERE hierarchy_level = 3 AND church_id = $1
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error consultando supervisores"})
	}
	defer rows.Close()

	type CreatedAssignment struct {
		ID            string  `json:"id"`
		GoalID        string  `json:"goal_id"`
		AssignedTo    string  `json:"assigned_to"`
		AssignedBy    string  `json:"assigned_by"`
		AssignedLevel int     `json:"assigned_level"`
		TargetValue   float64 `json:"target_value"`
		CreatedAt     string  `json:"created_at"`
	}
	type SkippedAssignment struct {
		AssignedTo string `json:"assigned_to"`
		Reason     string `json:"reason"`
	}

	var created []CreatedAssignment
	var skipped []SkippedAssignment

	for rows.Next() {
		var supervisorID string
		if err := rows.Scan(&supervisorID); err != nil {
			continue
		}

		var newID, createdAt string
		err = q.QueryRow(`
			INSERT INTO goal_assignments (goal_id, assigned_to, assigned_by, assigned_level, target_value, church_id)
			VALUES ($1, $2, $3, 3, $4, $5)
			ON CONFLICT (goal_id, assigned_to, parent_assignment_id) DO UPDATE
				SET target_value = EXCLUDED.target_value, updated_at = NOW()
			RETURNING id, created_at
		`, goalID, supervisorID, userID, defaultTarget, churchID).Scan(&newID, &createdAt)
		if err != nil {
			skipped = append(skipped, SkippedAssignment{AssignedTo: supervisorID, Reason: "error al insertar"})
			continue
		}
		created = append(created, CreatedAssignment{
			ID: newID, GoalID: goalID, AssignedTo: supervisorID,
			AssignedBy: userID, AssignedLevel: 3, TargetValue: defaultTarget, CreatedAt: createdAt,
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"created": created,
		"skipped": skipped,
	})
}

// GetAssignmentTree handles GET /goals/:id/assignments
// Returns the full cascade tree via recursive CTE.
func (h *DiscipleshipGoalsHandler) GetAssignmentTree(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	queryStr := `
		WITH RECURSIVE assignment_tree AS (
			SELECT ga.id, ga.goal_id, ga.assigned_to, ga.assigned_by, ga.assigned_level,
				ga.target_value, ga.current_value, ga.progress_percentage,
				ga.parent_assignment_id, ga.status, ga.notes, ga.created_at, ga.updated_at,
				0 AS depth
			FROM goal_assignments ga
			JOIN discipleship_goals dg ON dg.id = ga.goal_id AND dg.church_id = $2
			WHERE ga.goal_id = $1 AND ga.parent_assignment_id IS NULL
			UNION ALL
			SELECT child.id, child.goal_id, child.assigned_to, child.assigned_by, child.assigned_level,
				child.target_value, child.current_value, child.progress_percentage,
				child.parent_assignment_id, child.status, child.notes, child.created_at, child.updated_at,
				parent.depth + 1
			FROM goal_assignments child
			JOIN assignment_tree parent ON child.parent_assignment_id = parent.id
		)
		SELECT at.id, at.goal_id, at.assigned_to, at.assigned_by, at.assigned_level,
			at.target_value, at.current_value, at.progress_percentage,
			at.parent_assignment_id, at.status, at.notes, at.created_at, at.updated_at,
			at.depth, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') AS assigned_to_name
		FROM assignment_tree at
		JOIN users u ON u.id = at.assigned_to AND u.church_id = $2
		ORDER BY at.depth, at.created_at
	`

	rows, err := q.Query(queryStr, goalID, churchID)
	if err != nil {
		c.Logger().Error("Error fetching assignment tree:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener árbol de asignaciones"})
	}
	defer rows.Close()

	type FlatNode struct {
		ID                 string        `json:"id"`
		GoalID             string        `json:"goal_id"`
		AssignedTo         string        `json:"assigned_to"`
		AssignedBy         string        `json:"assigned_by"`
		AssignedLevel      int           `json:"assigned_level"`
		TargetValue        float64       `json:"target_value"`
		CurrentValue       float64       `json:"current_value"`
		ProgressPercentage float64       `json:"progress_percentage"`
		ParentAssignmentID *string       `json:"parent_assignment_id,omitempty"`
		Status             string        `json:"status"`
		Notes              *string       `json:"notes,omitempty"`
		CreatedAt          string        `json:"created_at"`
		UpdatedAt          string        `json:"updated_at"`
		Depth              int           `json:"-"`
		AssignedToName     string        `json:"assigned_to_name"`
		Children           []interface{} `json:"children"`
	}

	allNodes := map[string]*FlatNode{}
	var orderedIDs []string

	for rows.Next() {
		var n FlatNode
		var notes sql.NullString
		var parentID sql.NullString
		err := rows.Scan(
			&n.ID, &n.GoalID, &n.AssignedTo, &n.AssignedBy, &n.AssignedLevel,
			&n.TargetValue, &n.CurrentValue, &n.ProgressPercentage,
			&parentID, &n.Status, &notes, &n.CreatedAt, &n.UpdatedAt,
			&n.Depth, &n.AssignedToName,
		)
		if err != nil {
			c.Logger().Error("Error scanning assignment row:", err)
			continue
		}
		if parentID.Valid {
			n.ParentAssignmentID = &parentID.String
		}
		if notes.Valid {
			n.Notes = &notes.String
		}
		n.Children = []interface{}{}
		allNodes[n.ID] = &n
		orderedIDs = append(orderedIDs, n.ID)
	}

	// Visibility filter for non-pastor: show subtrees assigned TO me, or that I
	// assigned/cascaded to someone else — but "root" here means the TRUE root
	// of the cascade (parent_assignment_id IS NULL), not "the node closest to
	// me". A batch cascade is typically created in one call by whoever owns the
	// top level (e.g. a Coordinador assigning down to General→Auxiliar→Líder in
	// one request), so assigned_by is the SAME person on every row — checking
	// only the true root's assigned_to/assigned_by would mean nobody but that
	// one creator ever sees the tree, even the líder holding the leaf. Instead:
	// include each of MY OWN nodes, their full ancestor chain (so I see the
	// goal's overall context up to the top) and their full descendant subtree
	// (what I supervise) — but never an unrelated sibling branch.
	included := map[string]bool{}
	myNodes := map[string]bool{}
	if canSeeAll {
		for _, id := range orderedIDs {
			included[id] = true
		}
	} else {
		for _, id := range orderedIDs {
			n := allNodes[id]
			if n.AssignedTo == userID || n.AssignedBy == userID {
				myNodes[id] = true
			}
		}
		for id := range myNodes {
			cur := allNodes[id]
			for {
				included[cur.ID] = true
				if cur.ParentAssignmentID == nil {
					break
				}
				parent, ok := allNodes[*cur.ParentAssignmentID]
				if !ok {
					break
				}
				cur = parent
			}
		}
		frontier := map[string]bool{}
		for id := range myNodes {
			frontier[id] = true
		}
		for len(frontier) > 0 {
			next := map[string]bool{}
			for _, id := range orderedIDs {
				if included[id] {
					continue
				}
				n := allNodes[id]
				if n.ParentAssignmentID != nil && frontier[*n.ParentAssignmentID] {
					included[id] = true
					next[id] = true
				}
			}
			frontier = next
		}
	}

	var roots []*FlatNode
	for _, id := range orderedIDs {
		if !included[id] {
			continue
		}
		n := allNodes[id]
		if n.ParentAssignmentID == nil {
			roots = append(roots, n)
		} else if parent, ok := allNodes[*n.ParentAssignmentID]; ok && included[parent.ID] {
			parent.Children = append(parent.Children, n)
		} else {
			// Parent exists but is out of scope (shouldn't happen — the
			// ancestor walk above always includes the full chain to root —
			// kept as a safety net so a node is never silently dropped).
			roots = append(roots, n)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"goal_id": goalID,
		"tree":    roots,
	})
}

// DeleteAssignment handles DELETE /assignments/:id
// Requires assigned_by == me OR canSeeAll. FK ON DELETE CASCADE removes children.
func (h *DiscipleshipGoalsHandler) DeleteAssignment(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	assignmentID := c.Param("id")
	db := config.GetDB()
	userID, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	// Verify the goal for this assignment belongs to this church
	var assignedBy string
	err = q.QueryRow(`
		SELECT ga.assigned_by FROM goal_assignments ga
		JOIN discipleship_goals dg ON dg.id = ga.goal_id AND dg.church_id = $2
		WHERE ga.id = $1
	`, assignmentID, churchID).Scan(&assignedBy)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error consultando asignación"})
	}

	if !canSeeAll && assignedBy != userID {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "No tenés permiso para eliminar esta asignación"})
	}

	_, err = q.Exec("DELETE FROM goal_assignments WHERE id = $1", assignmentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al eliminar asignación"})
	}

	return c.NoContent(http.StatusNoContent)
}

// CreateProgress handles POST /assignments/:id/progress
// Inserts a goal_manual_progress row and runs 3-step upward aggregation in one transaction.
func (h *DiscipleshipGoalsHandler) CreateProgress(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	assignmentID := c.Param("id")
	db := config.GetDB()
	userID, _, _, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	// Fetch assignment to verify ownership and get goal_id (scoped by church via goal join)
	var assignedTo, goalID string
	err = q.QueryRow(`
		SELECT ga.assigned_to, ga.goal_id FROM goal_assignments ga
		JOIN discipleship_goals dg ON dg.id = ga.goal_id AND dg.church_id = $2
		WHERE ga.id = $1
	`, assignmentID, churchID).Scan(&assignedTo, &goalID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Asignación no encontrada"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error consultando asignación"})
	}

	if !canSeeAll && assignedTo != userID {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "Solo el asignado puede reportar progreso"})
	}

	type CreateProgressRequest struct {
		ValueReported float64 `json:"value_reported"`
		PeriodStart   *string `json:"period_start,omitempty"`
		PeriodEnd     *string `json:"period_end,omitempty"`
		ReportID      *string `json:"report_id,omitempty"`
		Notes         *string `json:"notes,omitempty"`
	}
	var req CreateProgressRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos: " + err.Error()})
	}

	// The TenantTx middleware already opened a transaction. Use q directly for all steps.
	// Insert progress (idempotent via ON CONFLICT)
	var progressID string
	err = q.QueryRow(`
		INSERT INTO goal_manual_progress (assignment_id, reporter_id, report_id, value_reported, period_start, period_end, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (assignment_id, report_id) DO UPDATE
			SET value_reported = EXCLUDED.value_reported
		RETURNING id
	`, assignmentID, userID, req.ReportID, req.ValueReported, req.PeriodStart, req.PeriodEnd, req.Notes).Scan(&progressID)
	if err != nil {
		c.Logger().Error("Error inserting progress:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al guardar progreso"})
	}

	// Step A: Recompute leaf assignment from its progress entries
	_, err = q.Exec(`
		UPDATE goal_assignments
		SET current_value = COALESCE(
			(SELECT SUM(value_reported) FROM goal_manual_progress WHERE assignment_id = $1), 0),
			updated_at = NOW()
		WHERE id = $1
	`, assignmentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error actualizando progreso (Step A)"})
	}

	// Step B: Walk ancestors via CTE and recompute each as SUM of children
	_, err = q.Exec(`
		WITH RECURSIVE ancestors AS (
			SELECT parent_assignment_id AS id
			FROM goal_assignments WHERE id = $1 AND parent_assignment_id IS NOT NULL
			UNION ALL
			SELECT ga.parent_assignment_id
			FROM goal_assignments ga
			JOIN ancestors a ON ga.id = a.id
			WHERE ga.parent_assignment_id IS NOT NULL
		)
		UPDATE goal_assignments ga
		SET current_value = COALESCE(
			(SELECT SUM(c.current_value) FROM goal_assignments c WHERE c.parent_assignment_id = ga.id), 0),
			updated_at = NOW()
		FROM ancestors a WHERE ga.id = a.id
	`, assignmentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error actualizando progreso (Step B)"})
	}

	// Step C: Sync root assignment total into discipleship_goals.current_value
	_, err = q.Exec(`
		UPDATE discipleship_goals g
		SET current_value = COALESCE(
			(SELECT SUM(current_value) FROM goal_assignments WHERE goal_id = g.id AND parent_assignment_id IS NULL), 0)
		WHERE g.id = $1 AND g.church_id = $2
	`, goalID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error actualizando progreso (Step C)"})
	}

	go logGoalAudit(config.GetDB(), goalID, userID, "UPDATE", "goal_manual_progress",
		fmt.Sprintf(`{"value_reported":%g,"assignment_id":%q}`, req.ValueReported, assignmentID))

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"id":             progressID,
		"assignment_id":  assignmentID,
		"value_reported": req.ValueReported,
		"message":        "Progreso registrado y propagado",
	})
}

// GetGoalActivity handles GET /goals/:id/activity
// Returns chronological audit log for a specific goal.
func (h *DiscipleshipGoalsHandler) GetGoalActivity(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, _, _, _ := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	// Verify goal belongs to this church first
	var goalExists bool
	q.QueryRow("SELECT EXISTS(SELECT 1 FROM discipleship_goals WHERE id = $1 AND church_id = $2)", goalID, churchID).Scan(&goalExists)
	if !goalExists {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Objetivo no encontrado"})
	}

	rows, err := q.Query(`
		SELECT
			a.id, a.action, a.table_name, a.new_values,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sistema') AS user_name,
			a.changed_at
		FROM audit_logs a
		LEFT JOIN users u ON a.changed_by = u.id AND u.church_id = $2
		WHERE a.record_id = $1::uuid
		ORDER BY a.changed_at DESC
		LIMIT 50
	`, goalID, churchID)
	if err != nil {
		c.Logger().Error("Error fetching goal activity:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener actividad"})
	}
	defer rows.Close()

	type ActivityEntry struct {
		ID        string `json:"id"`
		Action    string `json:"action"`
		Table     string `json:"table"`
		Meta      string `json:"meta"`
		UserName  string `json:"user_name"`
		CreatedAt string `json:"created_at"`
	}

	var entries []ActivityEntry
	for rows.Next() {
		var e ActivityEntry
		var newValues sql.NullString
		var changedAt time.Time
		if err := rows.Scan(&e.ID, &e.Action, &e.Table, &newValues, &e.UserName, &changedAt); err != nil {
			continue
		}
		e.Meta = newValues.String
		e.CreatedAt = changedAt.Format(time.RFC3339)
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []ActivityEntry{}
	}
	return c.JSON(http.StatusOK, entries)
}

// GetActiveManualAssignments handles GET /me/active-manual-assignments?period=YYYY-WW
// Returns all active manual goal assignments for the current user, with already_reported_for_period flag.
func (h *DiscipleshipGoalsHandler) GetActiveManualAssignments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	db := config.GetDB()
	userID, _, _, _ := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	// Parse period param (YYYY-WW) and compute ISO week start/end
	period := c.QueryParam("period")
	var periodStart, periodEnd string
	if period != "" {
		t, parseErr := parseISOWeek(period)
		if parseErr == nil {
			periodStart = t.Format("2006-01-02")
			// ISO week ends on Sunday (6 days after Monday)
			periodEnd = t.AddDate(0, 0, 6).Format("2006-01-02")
		}
	}

	rows, err := q.Query(`
		SELECT
			ga.id AS assignment_id,
			ga.goal_id,
			dg.title AS goal_title,
			dg.goal_type,
			ga.target_value,
			ga.current_value,
			dg.deadline::text AS deadline,
			CASE WHEN $3 != '' AND EXISTS (
				SELECT 1 FROM goal_manual_progress gmp
				WHERE gmp.assignment_id = ga.id
				  AND gmp.period_start >= $3::date
				  AND gmp.period_end <= $4::date
			) THEN true ELSE false END AS already_reported_for_period
		FROM goal_assignments ga
		JOIN discipleship_goals dg ON dg.id = ga.goal_id AND dg.church_id = $2
		WHERE ga.assigned_to = $1
		  AND dg.measurement_type = 'manual'
		  AND ga.status = 'active'
		  AND dg.deadline >= NOW()
		ORDER BY dg.deadline ASC
	`, userID, churchID, periodStart, periodEnd)
	if err != nil {
		c.Logger().Error("Error fetching active manual assignments:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignaciones"})
	}
	defer rows.Close()

	type ActiveAssignment struct {
		AssignmentID             string  `json:"assignment_id"`
		GoalID                   string  `json:"goal_id"`
		GoalTitle                string  `json:"goal_title"`
		GoalType                 string  `json:"goal_type"`
		TargetValue              float64 `json:"target_value"`
		CurrentValue             float64 `json:"current_value"`
		Deadline                 string  `json:"deadline"`
		AlreadyReportedForPeriod bool    `json:"already_reported_for_period"`
	}

	var assignments []ActiveAssignment
	for rows.Next() {
		var a ActiveAssignment
		if err := rows.Scan(
			&a.AssignmentID, &a.GoalID, &a.GoalTitle, &a.GoalType,
			&a.TargetValue, &a.CurrentValue, &a.Deadline, &a.AlreadyReportedForPeriod,
		); err != nil {
			continue
		}
		assignments = append(assignments, a)
	}

	if assignments == nil {
		assignments = []ActiveAssignment{}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"assignments": assignments,
	})
}

// parseISOWeek parses a "YYYY-WW" string and returns the Monday of that ISO week.
func parseISOWeek(s string) (time.Time, error) {
	var year, week int
	if _, err := fmt.Sscanf(s, "%d-W%d", &year, &week); err != nil {
		return time.Time{}, fmt.Errorf("formato de semana inválido: %s", s)
	}
	// Jan 4 is always in week 1 of ISO year
	jan4 := time.Date(year, 1, 4, 0, 0, 0, 0, time.UTC)
	// Monday of week 1
	weekday := int(jan4.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	mondayWeek1 := jan4.AddDate(0, 0, -(weekday - 1))
	// Add (week-1) * 7 days
	return mondayWeek1.AddDate(0, 0, (week-1)*7), nil
}

// GetAvailableAssignees handles GET /goals/:id/available-assignees
// Returns users eligible to be assigned to this goal (not already assigned).
func (h *DiscipleshipGoalsHandler) GetAvailableAssignees(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}

	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	goalID := c.Param("id")
	db := config.GetDB()
	userID, hierarchyLevel, zoneID, canSeeAll := getDiscipleshipAccessInfo(c, db)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Usuario no autenticado"})
	}

	type Assignee struct {
		UserID         string `json:"user_id"`
		UserName       string `json:"user_name"`
		HierarchyLevel int    `json:"hierarchy_level"`
	}

	var rows interface {
		Next() bool
		Scan(dest ...any) error
		Close() error
	}

	if canSeeAll || (hierarchyLevel != nil && *hierarchyLevel >= 5) {
		// Pastor / admin → Coordinadores (level 4) no asignados aún
		rows, err = q.Query(`
			SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') AS user_name, h.hierarchy_level
			FROM discipleship_hierarchy h
			JOIN users u ON u.id = h.user_id AND u.church_id = $2
			WHERE h.hierarchy_level = 4
			  AND h.church_id = $2
			  AND h.user_id NOT IN (
			  	SELECT assigned_to FROM goal_assignments WHERE goal_id = $1 AND status != 'cancelled'
			  )
			ORDER BY u.first_name
		`, goalID, churchID)
	} else if hierarchyLevel != nil && *hierarchyLevel == 4 {
		// Coordinador → todos en su zona (niveles 3, 2, 1) no asignados
		zoneFilter := ""
		args := []interface{}{goalID, churchID}
		if zoneID != nil && *zoneID != "" {
			args = append(args, *zoneID)
			zoneFilter = fmt.Sprintf(" AND h.zone_id = $%d", len(args))
		}
		rows, err = q.Query(`
			SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') AS user_name, h.hierarchy_level
			FROM discipleship_hierarchy h
			JOIN users u ON u.id = h.user_id AND u.church_id = $2
			WHERE h.hierarchy_level < 4
			  AND h.church_id = $2
			`+zoneFilter+`
			  AND h.user_id NOT IN (
			  	SELECT assigned_to FROM goal_assignments WHERE goal_id = $1 AND status != 'cancelled'
			  )
			ORDER BY h.hierarchy_level DESC, u.first_name
		`, args...)
	} else if hierarchyLevel != nil {
		// Otros niveles → subordinados directos (nivel - 1)
		targetLevel := *hierarchyLevel - 1
		zoneFilter := ""
		args := []interface{}{goalID, churchID, targetLevel}
		if zoneID != nil && *zoneID != "" {
			args = append(args, *zoneID)
			zoneFilter = fmt.Sprintf(" AND h.zone_id = $%d", len(args))
		}
		rows, err = q.Query(`
			SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, '') AS user_name, h.hierarchy_level
			FROM discipleship_hierarchy h
			JOIN users u ON u.id = h.user_id AND u.church_id = $2
			WHERE h.hierarchy_level = $3
			  AND h.church_id = $2
			`+zoneFilter+`
			  AND h.user_id NOT IN (
			  	SELECT assigned_to FROM goal_assignments WHERE goal_id = $1 AND status != 'cancelled'
			  )
			ORDER BY u.first_name
		`, args...)
	} else {
		return c.JSON(http.StatusOK, []Assignee{})
	}

	if err != nil {
		c.Logger().Error("Error fetching available assignees:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Error al obtener asignables"})
	}
	defer rows.Close()

	var assignees []Assignee
	for rows.Next() {
		var a Assignee
		if err := rows.Scan(&a.UserID, &a.UserName, &a.HierarchyLevel); err != nil {
			continue
		}
		assignees = append(assignees, a)
	}
	if assignees == nil {
		assignees = []Assignee{}
	}

	return c.JSON(http.StatusOK, assignees)
}
