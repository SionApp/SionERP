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

// TraceabilityEntry es una fila de audit_logs para el módulo de
// Trazabilidad (/dashboard/trazabilidad) — trae old/new values para el modal
// de detalle, a diferencia del resumen liviano que se mostraba antes en el
// Dashboard (retirado: ver GetTraceability).
type TraceabilityEntry struct {
	ID        string                 `json:"id"`
	TableName string                 `json:"table_name"`
	RecordID  string                 `json:"record_id"`
	Action    string                 `json:"action"`
	User      string                 `json:"user"`
	OldValues map[string]interface{} `json:"old_values,omitempty"`
	NewValues map[string]interface{} `json:"new_values,omitempty"`
	ChangedAt string                 `json:"changed_at"`
}

type TraceabilityResponse struct {
	Items []TraceabilityEntry `json:"items"`
	Total int                 `json:"total"`
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
	DiscipleshipStats DiscipleshipStats  `json:"discipleshipStats"`
	CurrentUserRole   string             `json:"currentUserRole,omitempty"`
	InstalledModules  []string           `json:"installedModules"`
}
