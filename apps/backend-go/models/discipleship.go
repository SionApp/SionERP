package models

import (
	"database/sql"
	"time"
)

// =====================================================
// GRUPOS DE DISCIPULADO
// =====================================================

type DiscipleshipGroup struct {
	ID              string         `json:"id"`
	GroupName       string         `json:"group_name"`
	LeaderID        string         `json:"leader_id"`
	SupervisorID    sql.NullString `json:"supervisor_id"`
	ZoneName        sql.NullString `json:"zone_name"`
	MeetingDay      sql.NullString `json:"meeting_day"`
	MeetingTime     sql.NullString `json:"meeting_time"`
	MeetingLocation sql.NullString `json:"meeting_location"`
	MemberCount     int            `json:"member_count"`
	ActiveMembers   int            `json:"active_members"`
	Status          string         `json:"status"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

type DiscipleshipGroupWithDetails struct {
	DiscipleshipGroup
	LeaderName     string `json:"leader_name"`
	SupervisorName string `json:"supervisor_name,omitempty"`
}

type CreateGroupRequest struct {
	GroupName       string `json:"group_name" validate:"required"`
	LeaderID        string `json:"leader_id" validate:"required,uuid"`
	SupervisorID    string `json:"supervisor_id,omitempty"`
	ZoneName        string `json:"zone_name,omitempty"`
	MeetingDay      string `json:"meeting_day,omitempty"`
	MeetingTime     string `json:"meeting_time,omitempty"`
	MeetingLocation string `json:"meeting_location,omitempty"`
}

type UpdateGroupRequest struct {
	GroupName       *string `json:"group_name,omitempty"`
	LeaderID        *string `json:"leader_id,omitempty"`
	SupervisorID    *string `json:"supervisor_id,omitempty"`
	ZoneName        *string `json:"zone_name,omitempty"`
	MeetingDay      *string `json:"meeting_day,omitempty"`
	MeetingTime     *string `json:"meeting_time,omitempty"`
	MeetingLocation *string `json:"meeting_location,omitempty"`
	MemberCount     *int    `json:"member_count,omitempty"`
	ActiveMembers   *int    `json:"active_members,omitempty"`
	Status          *string `json:"status,omitempty"`
}

// =====================================================
// JERARQUÍA DE DISCIPULADO
// =====================================================

type DiscipleshipHierarchy struct {
	ID                  string         `json:"id"`
	UserID              string         `json:"user_id"`
	HierarchyLevel      int            `json:"hierarchy_level"`
	SupervisorID        sql.NullString `json:"supervisor_id"`
	ZoneName            sql.NullString `json:"zone_name"`
	Territory           sql.NullString `json:"territory"`
	ActiveGroupsAssigned int           `json:"active_groups_assigned"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
}

type HierarchyWithUser struct {
	DiscipleshipHierarchy
	UserName       string `json:"user_name"`
	UserEmail      string `json:"user_email"`
	SupervisorName string `json:"supervisor_name,omitempty"`
}

type AssignHierarchyRequest struct {
	UserID         string `json:"user_id" validate:"required,uuid"`
	HierarchyLevel int    `json:"hierarchy_level" validate:"required,min=1,max=5"`
	SupervisorID   string `json:"supervisor_id,omitempty"`
	ZoneName       string `json:"zone_name,omitempty"`
	Territory      string `json:"territory,omitempty"`
}

// =====================================================
// MÉTRICAS DE DISCIPULADO
// =====================================================

type DiscipleshipMetrics struct {
	ID                   string         `json:"id"`
	GroupID              string         `json:"group_id"`
	WeekDate             string         `json:"week_date"`
	WeekNumber           sql.NullInt32  `json:"week_number"`
	Attendance           int            `json:"attendance"`
	NewVisitors          int            `json:"new_visitors"`
	ReturningVisitors    int            `json:"returning_visitors"`
	Conversions          int            `json:"conversions"`
	Baptisms             int            `json:"baptisms"`
	SpiritualTemperature int            `json:"spiritual_temperature"`
	TestimoniesCount     int            `json:"testimonies_count"`
	PrayerRequests       int            `json:"prayer_requests"`
	OfferingAmount       float64        `json:"offering_amount"`
	LeaderNotes          sql.NullString `json:"leader_notes"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

type CreateMetricsRequest struct {
	GroupID              string  `json:"group_id" validate:"required,uuid"`
	WeekDate             string  `json:"week_date" validate:"required"`
	Attendance           int     `json:"attendance" validate:"min=0"`
	NewVisitors          int     `json:"new_visitors" validate:"min=0"`
	ReturningVisitors    int     `json:"returning_visitors" validate:"min=0"`
	Conversions          int     `json:"conversions" validate:"min=0"`
	Baptisms             int     `json:"baptisms" validate:"min=0"`
	SpiritualTemperature int     `json:"spiritual_temperature" validate:"min=1,max=10"`
	TestimoniesCount     int     `json:"testimonies_count" validate:"min=0"`
	PrayerRequests       int     `json:"prayer_requests" validate:"min=0"`
	OfferingAmount       float64 `json:"offering_amount" validate:"min=0"`
	LeaderNotes          string  `json:"leader_notes,omitempty"`
}

// =====================================================
// REPORTES DE DISCIPULADO
// =====================================================

type DiscipleshipReport struct {
	ID           string                 `json:"id"`
	ReporterID   string                 `json:"reporter_id"`
	SupervisorID sql.NullString         `json:"supervisor_id"`
	ReportType   string                 `json:"report_type"`
	ReportLevel  int                    `json:"report_level"`
	PeriodStart  string                 `json:"period_start"`
	PeriodEnd    string                 `json:"period_end"`
	Status       string                 `json:"status"`
	ReportData   map[string]interface{} `json:"report_data"`
	SubmittedAt  sql.NullTime           `json:"submitted_at"`
	ApprovedAt   sql.NullTime           `json:"approved_at"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

type CreateReportRequest struct {
	ReportType  string                 `json:"report_type" validate:"required"`
	ReportLevel int                    `json:"report_level" validate:"required,min=1,max=5"`
	PeriodStart string                 `json:"period_start" validate:"required"`
	PeriodEnd   string                 `json:"period_end" validate:"required"`
	ReportData  map[string]interface{} `json:"report_data"`
}

// =====================================================
// ALERTAS DE DISCIPULADO
// =====================================================

type DiscipleshipAlert struct {
	ID             string         `json:"id"`
	AlertType      string         `json:"alert_type"`
	Title          string         `json:"title"`
	Message        string         `json:"message"`
	Priority       int            `json:"priority"`
	RelatedGroupID sql.NullString `json:"related_group_id"`
	RelatedUserID  sql.NullString `json:"related_user_id"`
	ZoneName       sql.NullString `json:"zone_name"`
	ActionRequired bool           `json:"action_required"`
	Resolved       bool           `json:"resolved"`
	ResolvedBy     sql.NullString `json:"resolved_by"`
	ResolvedAt     sql.NullTime   `json:"resolved_at"`
	ExpiresAt      sql.NullTime   `json:"expires_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type CreateAlertRequest struct {
	AlertType      string `json:"alert_type" validate:"required"`
	Title          string `json:"title" validate:"required"`
	Message        string `json:"message" validate:"required"`
	Priority       int    `json:"priority" validate:"min=1,max=5"`
	RelatedGroupID string `json:"related_group_id,omitempty"`
	RelatedUserID  string `json:"related_user_id,omitempty"`
	ZoneName       string `json:"zone_name,omitempty"`
	ActionRequired bool   `json:"action_required"`
}

// =====================================================
// MULTIPLICACIÓN DE CÉLULAS
// =====================================================

type CellMultiplication struct {
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
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

type CreateMultiplicationRequest struct {
	ParentGroupID      string `json:"parent_group_id" validate:"required,uuid"`
	NewLeaderID        string `json:"new_leader_id,omitempty"`
	MultiplicationDate string `json:"multiplication_date" validate:"required"`
	MultiplicationType string `json:"multiplication_type"`
	InitialMembers     int    `json:"initial_members"`
	Notes              string `json:"notes,omitempty"`
}

// =====================================================
// ANALYTICS / ESTADÍSTICAS
// =====================================================

type DiscipleshipAnalytics struct {
	TotalGroups       int     `json:"total_groups"`
	TotalMembers      int     `json:"total_members"`
	AverageAttendance float64 `json:"average_attendance"`
	GrowthRate        float64 `json:"growth_rate"`
	ActiveLeaders     int     `json:"active_leaders"`
	Multiplications   int     `json:"multiplications"`
	SpiritualHealth   float64 `json:"spiritual_health"`
	PendingAlerts     int     `json:"pending_alerts"`
}


type GroupPerformance struct {
	GroupID        string  `json:"group_id"`
	GroupName      string  `json:"group_name"`
	LeaderName     string  `json:"leader_name"`
	AvgAttendance  float64 `json:"avg_attendance"`
	GrowthRate     float64 `json:"growth_rate"`
	SpiritualTemp  float64 `json:"spiritual_temp"`
	Status         string  `json:"status"`
	LastReportDate string  `json:"last_report_date"`
}

// =====================================================
// FILTROS Y PAGINACIÓN
// =====================================================

type GroupFilters struct {
	ZoneName     string `query:"zone_name"`
	Status       string `query:"status"`
	LeaderID     string `query:"leader_id"`
	SupervisorID string `query:"supervisor_id"`
	Search       string `query:"search"`
	Page         int    `query:"page"`
	Limit        int    `query:"limit"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}
