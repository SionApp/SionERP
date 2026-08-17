package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"backend-sion/utils"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

// GetStats returns dashboard statistics
func (h *DashboardHandler) GetStats(c echo.Context) error {
	db := config.GetDB()
	churchID, _ := c.Get("church_id").(string)
	var totalUser int

	err := db.DB.QueryRow(`
    	SELECT COUNT(*)
			FROM users
			WHERE is_active = true AND is_active_member = true AND church_id = $1
		`, churchID).Scan(&totalUser)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch total users countt",
		})
	}

	var newRegistrations int
	oneMonthAgo := time.Now().AddDate(0, 0, -30)
	err = db.DB.QueryRow(
		`SELECT COUNT(*)
			FROM users
			WHERE is_active = true AND created_at >= $1 AND church_id = $2`,
		oneMonthAgo, churchID).Scan(&newRegistrations)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch new registrations count",
		})
	}

	var activeRoles int

	err = db.DB.QueryRow(
		`SELECT COUNT(DISTINCT role)
			FROM users
		  WHERE is_active = true AND church_id = $1
		`, churchID).Scan(&activeRoles)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch active roles count",
		})
	}

	rolesDistribution, err := h.GetRoleDistribution(churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch roles distribution",
		})
	}

	recentActivity, err := h.GetRecentActivity(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch recent activity",
		})
	}

	currentUserRole := ""
	if email := c.Get("email"); email != nil {
		userEmail := email.(string)
		err = db.DB.QueryRow(
			`SELECT role FROM users WHERE email = $1 AND church_id = $2`,
			userEmail, churchID,
		).Scan(&currentUserRole)
		if err != nil {
			fmt.Printf("Error fetching user role for %s: %v\n", userEmail, err)
		} else {
			fmt.Printf("User role found: %s\n", currentUserRole)
		}
	}

	systemActivity := 0.0
	if db != nil && db.DB.Ping() == nil {
		systemActivity = 100.0
	} else {
		systemActivity = 0.0
	}
	stats := models.DashboardStats{
		TotalUsers:       totalUser,
		NewRegistrations: newRegistrations,
		ActiveRoles:      activeRoles,
		SystemActivity:   systemActivity,
		LastLogin:        time.Now(),
	}

	discipleshipStats := h.getDiscipleshipStats(db.DB, churchID)

	// Fetch installed modules — NOT scoped by church_id: la tabla `modules` es global
	// hoy (sin columna church_id), así que instalar/desinstalar un módulo afecta a
	// TODAS las iglesias por igual. Es un gap real de multi-tenancy, pero requiere una
	// migración de schema — queda para el trabajo de "puerta de comercialización
	// multi-tenant" (ver roadmap), no es parte de este fix de analítica.
	installedModules := []string{}
	rows, err := db.DB.Query("SELECT key FROM modules WHERE is_installed = true")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var key string
			if err := rows.Scan(&key); err == nil {
				installedModules = append(installedModules, key)
			}
		}
	} else {
		fmt.Printf("Error fetching installed modules: %v\n", err)
	}

	response := models.DashboardResponse{
		Stats:             stats,
		RoleDistribution:  rolesDistribution,
		RecentActivity:    recentActivity,
		DiscipleshipStats: discipleshipStats,
		CurrentUserRole:   currentUserRole,
		InstalledModules:  installedModules,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *DashboardHandler) GetRoleDistribution(churchID string) ([]models.RoleDistribution, error) {
	roleColors := map[string]string{
		utils.RolePastor:     "#ff7c7c",
		utils.RoleStaff:      "#ffc658",
		utils.RoleSupervisor: "#82ca9d",
		utils.RoleServer:     "#8884d8",
	}
	roleNames := map[string]string{
		utils.RolePastor:     "Pastor",
		utils.RoleStaff:      "Personal",
		utils.RoleSupervisor: "Supervisor",
		utils.RoleServer:     "Servidor",
	}

	query := `
		SELECT
			role,
			COUNT(*) as count
		FROM users
		WHERE is_active = true AND church_id = $1
		GROUP BY role
	`

	rows, err := config.GetDB().DB.Query(query, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var distribution []models.RoleDistribution
	for rows.Next() {
		var role string
		var count int
		err := rows.Scan(&role, &count)
		if err != nil {
			fmt.Printf("Error scanning role: %v\n", err)
			continue
		}

		color := roleColors[role]
		if color == "" {
			color = "#cccccc"
		}

		name := roleNames[role]
		if name == "" {
			name = role // Usar el rol tal cual si no hay traducción
		}

		fmt.Printf("Adding role: %s, count: %d, color: %s\n", name, count, color)

		distribution = append(distribution, models.RoleDistribution{
			Name:  name,
			Value: count,
			Color: color,
		})
	}

	fmt.Printf("Total roles in distribution: %d\n", len(distribution))
	return distribution, nil
}

func (h *DashboardHandler) GetRecentActivity(c echo.Context) ([]models.RecentActivity, error) {
	churchID, _ := c.Get("church_id").(string)

	// Usar LEFT JOIN para capturar registros donde changed_by es NULL (ej: seed data)
	// church_id scoping: audit_logs es multi-tenant (ver phase2b_tenant_schema_group_b) —
	// sin este WHERE, cada dashboard mostraba actividad de TODAS las iglesias.
	query := `
		SELECT
			a.id,
			a.action,
			a.table_name,
			COALESCE(u.email, 'Sistema') as user_email,
			COALESCE(u.first_name || ' ' || u.last_name, 'Sistema') as user_name,
			a.changed_at
		FROM audit_logs a
		LEFT JOIN users u ON a.changed_by = u.id
		WHERE a.church_id = $1
		ORDER BY a.changed_at DESC
		LIMIT 10
	`

	rows, err := config.GetDB().DB.Query(query, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []models.RecentActivity
	for rows.Next() {

		var id, action, tableName, userEmail, userName string
		var changedAt time.Time

		if err := rows.Scan(&id, &action, &tableName, &userEmail, &userName, &changedAt); err != nil {
			continue
		}

		timeAgo := formatTimeAgo(changedAt)

		displayUser := userName
		if displayUser == "" || displayUser == "Sistema" {
			displayUser = userEmail
		}

		activityType := "info"
		switch action {
		case "INSERT", "create":
			activityType = "success"
		case "UPDATE", "update", "edit":
			activityType = "warning"
		case "DELETE", "delete", "remove":
			activityType = "error"
		default:
			activityType = "info"
		}
		formattedAction := formatAction(action, tableName)
		activities = append(activities, models.RecentActivity{
			ID:     id,
			Action: formattedAction,
			User:   displayUser,
			Time:   timeAgo,
			Type:   activityType,
		})

	}
	return activities, nil
}

func formatTimeAgo(t time.Time) string {
	duration := time.Since(t)

	if duration.Hours() < 1 {
		minutes := int(duration.Minutes())
		if minutes == 0 {
			return "ahora"
		}
		return fmt.Sprintf("%d min", minutes)
	} else if duration.Hours() < 24 {
		hours := int(duration.Hours())
		return fmt.Sprintf("%d h", hours)
	} else {
		days := int(duration.Hours() / 24)
		return fmt.Sprintf("%d d", days)
	}
}

func (h *DashboardHandler) getDiscipleshipStats(q config.Querier, churchID string) models.DiscipleshipStats {
	stats := models.DiscipleshipStats{}

	q.QueryRow(`SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active' AND church_id = $1`, churchID).Scan(&stats.TotalGroups)

	q.QueryRow(`SELECT COALESCE(SUM(active_members), 0) FROM discipleship_groups WHERE status = 'active' AND church_id = $1`, churchID).Scan(&stats.TotalMembers)

	q.QueryRow(`SELECT COUNT(DISTINCT leader_id) FROM discipleship_groups WHERE status = 'active' AND church_id = $1`, churchID).Scan(&stats.ActiveLeaders)

	q.QueryRow(`
		SELECT COALESCE(
			AVG(CASE WHEN member_count > 0 THEN active_members::float / member_count * 100 ELSE 0 END), 0
		)
		FROM discipleship_groups WHERE status = 'active' AND church_id = $1
	`, churchID).Scan(&stats.AvgAttendance)

	stats.Multiplications = countSuccessfulMultiplications(q, churchID)

	q.QueryRow(`SELECT COUNT(*) FROM discipleship_alerts WHERE resolved = false AND church_id = $1`, churchID).Scan(&stats.AlertsCount)

	stats.SpiritualHealth = calculateSpiritualHealth(q, churchID)

	var prevMembers int
	q.QueryRow(`
		SELECT COALESCE(SUM(active_members), 0)
		FROM discipleship_groups
		WHERE status = 'active' AND church_id = $1 AND created_at <= NOW() - INTERVAL '30 days'
	`, churchID).Scan(&prevMembers)
	if prevMembers > 0 {
		stats.MonthlyGrowth = float64(stats.TotalMembers-prevMembers) / float64(prevMembers) * 100
	}

	return stats
}

// countSuccessfulMultiplications es la única fuente de verdad para "Multiplicaciones"
// en todo el sistema. Antes existían 3 definiciones distintas (una sobre una tabla
// inexistente `discipleship_multiplications`, otra contando grupos con
// status='multiplying', otra sobre cell_multiplication_tracking) — se unifican acá
// sobre la tabla real y dedicada a este propósito. Ventana: año calendario en curso,
// el criterio que ya usaba GetDashboardStatsByLevel para niveles 3 y 5.
func countSuccessfulMultiplications(q config.Querier, churchID string) int {
	var count int
	q.QueryRow(`
		SELECT COUNT(*) FROM cell_multiplication_tracking
		WHERE church_id = $1
		AND multiplication_date >= DATE_TRUNC('year', CURRENT_DATE)
		AND success_status = 'successful'
	`, churchID).Scan(&count)
	return count
}

// calculateSpiritualHealth es la única fuente de verdad para "Salud Espiritual" a nivel
// de iglesia. Promedia 13 indicadores binarios del reporte semanal de cada líder y
// reescala a /10 (sin el ×10/13 el índice llega a 13 y la UI, que lo rotula "/10",
// mostraba cosas como "11.5/10"). Antes dashboard.go usaba una fórmula completamente
// distinta (promedio de una columna spiritual_temperature en discipleship_attendance).
func calculateSpiritualHealth(q config.Querier, churchID string) float64 {
	var health float64
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
		) * 10.0 / 13.0, 0)
		FROM discipleship_reports
		WHERE church_id = $1
		AND period_end >= CURRENT_DATE - INTERVAL '28 days'
	`, churchID).Scan(&health)
	return health
}

func formatAction(action, tableName string) string {
	actionTextMap := map[string]string{
		"INSERT": "creó",
		"UPDATE": "actualizó",
		"DELETE": "eliminó",
	}
	tableTextMap := map[string]string{
		"users":                "usuario",
		"events":               "evento",
		"reports":              "reporte",
		"discipleship_goals":   "objetivo",
		"goal_assignments":     "asignación de objetivo",
		"goal_manual_progress": "progreso de objetivo",
	}

	actionText := actionTextMap[action]
	if actionText == "" {
		actionText = action
	}

	tableText := tableTextMap[tableName]
	if tableText == "" {
		tableText = tableName
	}

	return fmt.Sprintf("%s %s", actionText, tableText)
}
