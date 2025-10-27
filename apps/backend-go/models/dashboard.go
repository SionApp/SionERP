package models

import "time"

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
