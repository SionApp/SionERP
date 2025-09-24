package handlers

import (
	"backend-sion/config"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type DashboardHandler struct {
	db *config.Database
}

type DashboardStats struct {
	TotalUsers        int `json:"totalUsers"`
	NewRegistrations  int `json:"newRegistrations"`
	ActiveRoles       int `json:"activeRoles"`
	SystemActivity    int `json:"systemActivity"`
}

type RoleDistribution struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
	Color string `json:"color"`
}

type RecentActivity struct {
	ID      string      `json:"id,omitempty"`
	Action  string      `json:"action"`
	User    string      `json:"user"`
	Time    string      `json:"time"`
	Type    string      `json:"type"`
	Details interface{} `json:"details,omitempty"`
}

func NewDashboardHandler(db *config.Database) *DashboardHandler {
	return &DashboardHandler{db: db}
}

// GetStats returns dashboard statistics
func (h *DashboardHandler) GetStats(c echo.Context) error {
	var stats DashboardStats

	// Get total active users
	err := h.db.DB.QueryRow(`
		SELECT COUNT(*) FROM users WHERE is_active = true
	`).Scan(&stats.TotalUsers)
	if err != nil {
		stats.TotalUsers = 0
	}

	// Get new registrations in last 7 days
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	err = h.db.DB.QueryRow(`
		SELECT COUNT(*) FROM users 
		WHERE is_active = true AND created_at >= $1
	`, sevenDaysAgo).Scan(&stats.NewRegistrations)
	if err != nil {
		stats.NewRegistrations = 0
	}

	// Set static values for now
	stats.ActiveRoles = 4
	stats.SystemActivity = 98

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": stats,
	})
}

// GetRoleDistribution returns the distribution of user roles
func (h *DashboardHandler) GetRoleDistribution(c echo.Context) error {
	rows, err := h.db.DB.Query(`
		SELECT role, COUNT(*) as count 
		FROM users 
		WHERE is_active = true 
		GROUP BY role
	`)
	if err != nil {
		// Return default empty distribution
		defaultDistribution := []RoleDistribution{
			{Name: "Pastor", Value: 0, Color: "hsl(var(--primary))"},
			{Name: "Staff", Value: 0, Color: "hsl(220 90% 50%)"},
			{Name: "Supervisor", Value: 0, Color: "hsl(45 93% 50%)"},
			{Name: "Server", Value: 0, Color: "hsl(217 32.6% 17.5%)"},
		}
		return c.JSON(http.StatusOK, map[string]interface{}{
			"data": defaultDistribution,
		})
	}
	defer rows.Close()

	// Create a map to count roles
	roleCounts := make(map[string]int)
	for rows.Next() {
		var role string
		var count int
		if err := rows.Scan(&role, &count); err != nil {
			continue
		}
		roleCounts[role] = count
	}

	// Build the distribution array
	distribution := []RoleDistribution{
		{Name: "Pastor", Value: roleCounts["pastor"], Color: "hsl(var(--primary))"},
		{Name: "Staff", Value: roleCounts["staff"], Color: "hsl(220 90% 50%)"},
		{Name: "Supervisor", Value: roleCounts["supervisor"], Color: "hsl(45 93% 50%)"},
		{Name: "Server", Value: roleCounts["server"], Color: "hsl(217 32.6% 17.5%)"},
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": distribution,
	})
}

// GetRecentActivity returns recent audit log activities
func (h *DashboardHandler) GetRecentActivity(c echo.Context) error {
	// For now, return empty array since audit logs require special handling
	// In a full implementation, this would query the audit_logs table
	// and format the activities similar to the frontend fallback
	
	activities := []RecentActivity{}
	
	return c.JSON(http.StatusOK, map[string]interface{}{
		"data": activities,
	})
}