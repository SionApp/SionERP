package handlers

import (
	"backend-sion/config"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type DashboardHandler struct{}

type DashboardStats struct {
	TotalUsers       int       `json:"totalUsers"`
	NewRegistrations int       `json:"newRegistrations"`
	ActiveRoles      int       `json:"activeRoles"`
	SystemActivity   float64   `json:"systemActivity"`
	LastLogin        time.Time `json:"lastLogin"`
}

type RoleDistribution struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
	Color string `json:"color"`
}

type RecentActivity struct {
	ID      string                 `json:"id,omitempty"`
	Action  string                 `json:"action"`
	User    string                 `json:"user"`
	Time    string                 `json:"time"`
	Type    string                 `json:"type"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// Estructura para estadísticas de discipulado
type DiscipleshipStats struct {
	TotalGroups     int     `json:"totalGroups"`
	TotalMembers    int     `json:"totalMembers"`
	ActiveLeaders   int     `json:"activeLeaders"`
	AvgAttendance   float64 `json:"avgAttendance"`
	MonthlyGrowth   float64 `json:"monthlyGrowth"`
	SpiritualHealth float64 `json:"spiritualHealth"`
	Multiplications int     `json:"multiplications"`
	AlertsCount     int     `json:"alertsCount"`
}

type DashboardResponse struct {
	Stats             DashboardStats     `json:"stats"`
	RoleDistribution  []RoleDistribution `json:"roleDistribution"`
	RecentActivity    []RecentActivity   `json:"recentActivity"`
	DiscipleshipStats DiscipleshipStats  `json:"discipleshipStats"`
	CurrentUserRole   string             `json:"currentUserRole,omitempty"`
}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

// GetStats returns dashboard statistics
func (h *DashboardHandler) GetStats(c echo.Context) error {
	db := config.GetDB()
	var totalUser int

	err := db.DB.QueryRow(`
    	SELECT COUNT(*)
			FROM users
			WHERE is_active = true
		`).Scan(&totalUser)
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
			WHERE is_active = true AND created_at >= $1`,
		oneMonthAgo).Scan(&newRegistrations)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch new registrations count",
		})
	}

	var activeRoles int

	err = db.DB.QueryRow(
		`SELECT COUNT(*)
			FROM users
		  WHERE is_active = true
		`).Scan(&activeRoles)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch active roles count",
		})
	}

	rolesDistribution, err := h.GetRoleDistribution(c)
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
			`SELECT role FROM users WHERE email = $1`,
			userEmail,
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
	stats := DashboardStats{
		TotalUsers:       totalUser,
		NewRegistrations: newRegistrations,
		ActiveRoles:      activeRoles,
		SystemActivity:   systemActivity,
		LastLogin:        time.Now(),
	}

	// TODO: Implementar estadísticas de discipulado
	discipleshipStats := DiscipleshipStats{
		TotalGroups:     0,
		TotalMembers:    0,
		ActiveLeaders:   0,
		AvgAttendance:   0,
		MonthlyGrowth:   0,
		SpiritualHealth: 0,
		Multiplications: 0,
		AlertsCount:     0,
	}

	response := DashboardResponse{
		Stats:             stats,
		RoleDistribution:  rolesDistribution,
		RecentActivity:    recentActivity,
		DiscipleshipStats: discipleshipStats,
		CurrentUserRole:   currentUserRole,
	}

	return c.JSON(http.StatusOK, response)
}

func (h *DashboardHandler) GetRoleDistribution(c echo.Context) ([]RoleDistribution, error) {
	roleColors := map[string]string{
		"pastor":     "#ff7c7c",
		"staff":      "#ffc658",
		"supervisor": "#82ca9d",
		"server":     "#8884d8",
	}
	roleNames := map[string]string{
		"pastor":     "Pastor",
		"staff":      "Personal",
		"supervisor": "Supervisor",
		"server":     "Servidor",
	}

	query := `
		SELECT
			role,
			COUNT(*) as count
		FROM users
		WHERE is_active = true
		GROUP BY role
	`

	rows, err := config.GetDB().DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var distribution []RoleDistribution
	for rows.Next() {
		var role string
		var count int
		err := rows.Scan(&role, &count)
		if err != nil {
			fmt.Printf("Error scanning role: %v\n", err)
			continue
		}

		// Obtener color y nombre, usar defaults si no existen
		color := roleColors[role]
		if color == "" {
			color = "#cccccc" // Gris por defecto
		}

		name := roleNames[role]
		if name == "" {
			name = role // Usar el rol tal cual si no hay traducción
		}

		fmt.Printf("Adding role: %s, count: %d, color: %s\n", name, count, color)

		distribution = append(distribution, RoleDistribution{
			Name:  name,
			Value: count,
			Color: color,
		})
	}

	fmt.Printf("Total roles in distribution: %d\n", len(distribution))
	return distribution, nil
}

func (h *DashboardHandler) GetRecentActivity(c echo.Context) ([]RecentActivity, error) {
	query := `
		SELECT
			a.id,
			a.action,
			a.table_name,
			u.email as user_email,
			u.first_name || ' ' || u.last_name as user_name,
			a.changed_at
		FROM audit_logs a 
		JOIN users u ON a.changed_by = u.id
		ORDER BY a.changed_at DESC
		LIMIT 10
	`

	rows, err := config.GetDB().DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []RecentActivity
	for rows.Next() {

		var id, action, tableName, userEmail string
		var changedAt time.Time

		if err := rows.Scan(&id, &action, &tableName, &userEmail, &changedAt); err != nil {
			continue
		}

		timeAgo := formatTimeAgo(changedAt)

		activityType := "info"
		switch action {
		case "INSERT":
			activityType = "success"
		case "UPDATE":
			activityType = "warning"
		case "DELETE":
			activityType = "danger"
		}
		formattedAction := formatAction(action, tableName)
		activities = append(activities, RecentActivity{
			ID:     id,
			Action: formattedAction,
			User:   userEmail,
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

func formatAction(action, tableName string) string {
	actionTextMap := map[string]string{
		"INSERT": "creó",
		"UPDATE": "actualizó",
		"DELETE": "eliminó",
	}
	tableTextMap := map[string]string{
		"users":   "usuario",
		"events":  "evento",
		"reports": "reporte",
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
