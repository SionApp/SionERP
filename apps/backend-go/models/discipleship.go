package models

import (
	"time"
)

// =====================================================
// GRUPOS DE DISCIPULADO
// =====================================================

type DiscipleshipGroup struct {
	ID              string   `json:"id"`
	GroupName       string   `json:"group_name"`
	LeaderID        string   `json:"leader_id"`
	SupervisorID    *string  `json:"supervisor_id"`
	ZoneID          *string  `json:"zone_id" db:"zone_id"`
	ZoneName        *string  `json:"zone_name" db:"zone_name"`
	MeetingDay      *string  `json:"meeting_day"`
	MeetingTime     *string  `json:"meeting_time"`
	MeetingLocation *string  `json:"meeting_location"`
	MeetingAddress  *string  `json:"meeting_address"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	MemberCount     int      `json:"member_count"`
	ActiveMembers   int      `json:"active_members"`
	Status          string   `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type DiscipleshipGroupWithDetails struct {
	DiscipleshipGroup
	LeaderName     string `json:"leader_name"`
	SupervisorName string `json:"supervisor_name,omitempty"`
}

type CreateGroupRequest struct {
	GroupName       string   `json:"group_name" validate:"required"`
	LeaderID        string   `json:"leader_id" validate:"required,uuid"`
	SupervisorID    string   `json:"supervisor_id,omitempty"`
	ZoneID          string   `json:"zone_id,omitempty" validate:"omitempty,uuid"`
	ZoneName        string   `json:"zone_name,omitempty"` // Deprecated: usar zone_id
	MeetingDay      string   `json:"meeting_day,omitempty"`
	MeetingTime     string   `json:"meeting_time,omitempty"`
	MeetingLocation string   `json:"meeting_location,omitempty"`
	MeetingAddress  string   `json:"meeting_address,omitempty"`
	Latitude        *float64 `json:"latitude,omitempty"`
	Longitude       *float64 `json:"longitude,omitempty"`
}

type UpdateGroupRequest struct {
	GroupName       *string  `json:"group_name,omitempty"`
	LeaderID        *string  `json:"leader_id,omitempty"`
	SupervisorID    *string  `json:"supervisor_id,omitempty"`
	ZoneID          *string  `json:"zone_id,omitempty" validate:"omitempty,uuid"`
	ZoneName        *string  `json:"zone_name,omitempty"` // Deprecated: usar zone_id
	MeetingDay      *string  `json:"meeting_day,omitempty"`
	MeetingTime     *string  `json:"meeting_time,omitempty"`
	MeetingLocation *string  `json:"meeting_location,omitempty"`
	MeetingAddress  *string  `json:"meeting_address,omitempty"`
	Latitude        *float64 `json:"latitude,omitempty"`
	Longitude       *float64 `json:"longitude,omitempty"`
	MemberCount     *int     `json:"member_count,omitempty"`
	ActiveMembers   *int     `json:"active_members,omitempty"`
	Status          *string  `json:"status,omitempty"`
}

// =====================================================
// JERARQUÍA DE DISCIPULADO
// =====================================================

type DiscipleshipHierarchy struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"user_id"`
	HierarchyLevel       int       `json:"hierarchy_level"`
	SupervisorID         *string   `json:"supervisor_id"`
	ZoneID               *string   `json:"zone_id" db:"zone_id"`
	ZoneName             *string   `json:"zone_name" db:"zone_name"` // Obtenido de JOIN, mantener para compatibilidad
	Territory            *string   `json:"territory"`
	ActiveGroupsAssigned int       `json:"active_groups_assigned"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
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
	ZoneID         string `json:"zone_id,omitempty" validate:"omitempty,uuid"`
	ZoneName       string `json:"zone_name,omitempty"` // Deprecated: usar zone_id
	Territory      string `json:"territory,omitempty"`
}

// =====================================================
// REPORTES DE DISCIPULADO
// =====================================================

type DiscipleshipReport struct {
	ID           string                 `json:"id"`
	ReporterID   string                 `json:"reporter_id"`
	SupervisorID *string                `json:"supervisor_id"`
	ReportType   string                 `json:"report_type"`
	ReportLevel  int                    `json:"report_level"`
	PeriodStart  string                 `json:"period_start"`
	PeriodEnd    string                 `json:"period_end"`
	Status       string                 `json:"status"`
	ReportData   map[string]interface{} `json:"report_data"`
	SubmittedAt  *time.Time             `json:"submitted_at"`
	ApprovedAt   *time.Time             `json:"approved_at"`
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
	ID             string     `json:"id"`
	AlertType      string     `json:"alert_type"`
	Title          string     `json:"title"`
	Message        string     `json:"message"`
	Priority       int        `json:"priority"`
	RelatedGroupID *string    `json:"related_group_id"`
	RelatedUserID  *string    `json:"related_user_id"`
	AddressedTo    *string    `json:"addressed_to,omitempty" db:"addressed_to"`
	ZoneID         *string    `json:"zone_id" db:"zone_id"`
	ZoneName       *string    `json:"zone_name" db:"zone_name"` // Obtenido de JOIN, mantener para compatibilidad
	ActionRequired bool       `json:"action_required"`
	Resolved       bool       `json:"resolved"`
	ResolvedBy     *string    `json:"resolved_by"`
	ResolvedAt     *time.Time `json:"resolved_at"`
	ExpiresAt      *time.Time `json:"expires_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type CreateAlertRequest struct {
	AlertType      string `json:"alert_type" validate:"required"`
	Title          string `json:"title" validate:"required"`
	Message        string `json:"message" validate:"required"`
	Priority       int    `json:"priority" validate:"min=1,max=5"`
	RelatedGroupID string `json:"related_group_id,omitempty"`
	RelatedUserID  string `json:"related_user_id,omitempty"`
	ZoneID         string `json:"zone_id,omitempty" validate:"omitempty,uuid"`
	ZoneName       string `json:"zone_name,omitempty"` // Deprecated: usar zone_id
	ActionRequired bool   `json:"action_required"`
}

// =====================================================
// MULTIPLICACIÓN DE CÉLULAS
// =====================================================

type CellMultiplication struct {
	ID                 string    `json:"id"`
	ParentGroupID      string    `json:"parent_group_id"`
	ParentLeaderID     string    `json:"parent_leader_id"`
	NewGroupID         *string   `json:"new_group_id"`
	NewLeaderID        *string   `json:"new_leader_id"`
	MultiplicationDate string    `json:"multiplication_date"`
	MultiplicationType string    `json:"multiplication_type"`
	SuccessStatus      string    `json:"success_status"`
	InitialMembers     int       `json:"initial_members"`
	Notes              *string   `json:"notes"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
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
	TotalGroups       int                  `json:"total_groups"`
	TotalMembers      int                  `json:"total_members"`
	AverageAttendance float64              `json:"average_attendance"`
	GrowthRate        float64              `json:"growth_rate"`
	ActiveLeaders     int                  `json:"active_leaders"`
	Multiplications   int                  `json:"multiplications"`
	SpiritualHealth   float64              `json:"spiritual_health"`
	PendingAlerts     int                  `json:"pending_alerts"`
	GroupPerformance  []GroupPerformance   `json:"group_performance,omitempty"`
}

type GroupPerformance struct {
	GroupID        string  `json:"group_id"`
	GroupName      string  `json:"group_name"`
	LeaderName     string  `json:"leader_name"`
	AvgAttendance  float64 `json:"avg_attendance"`
	GrowthRate     float64 `json:"growth_rate"`
	SpiritualTemp  float64 `json:"spiritual_temp"`
	Status         string  `json:"status"`
	Phase          string  `json:"phase"`
	LastReportDate string  `json:"last_report_date"`
}

// =====================================================
// FILTROS Y PAGINACIÓN
// =====================================================

type GroupFilters struct {
	ZoneID       string `query:"zone_id"`
	ZoneName     string `query:"zone_name"` // Deprecated: usar zone_id
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

// =====================================================
// NIVELES DE DISCIPULADO
// =====================================================

type DiscipleshipLevel struct {
	ID          string `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	Description string `json:"description" db:"description"`
	Icon        string `json:"icon" db:"icon"`
	Color       string `json:"color" db:"color"`
	OrderIndex  int    `json:"order_index" db:"order_index"`
	IsActive    bool   `json:"is_active" db:"is_active"`
	CreatedAt   string `json:"created_at" db:"created_at"`
	UpdatedAt   string `json:"updated_at" db:"updated_at"`
}

type CreateDiscipleshipLevelRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
	Color       string `json:"color,omitempty"`
	OrderIndex  int    `json:"order_index,omitempty"`
}

type UpdateDiscipleshipLevelRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	OrderIndex  *int    `json:"order_index,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// =====================================================
// MIEMBROS DE GRUPO DE DISCIPULADO
// =====================================================

type GroupMember struct {
	ID          string    `json:"id" db:"id"`
	GroupID     string    `json:"group_id" db:"group_id"`
	UserID      string    `json:"user_id" db:"user_id"`
	RoleInGroup string    `json:"role_in_group" db:"role_in_group"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	JoinedAt    time.Time `json:"joined_at" db:"joined_at"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type GroupMemberWithDetails struct {
	GroupMember
	UserName  string `json:"user_name" db:"user_name"`
	UserEmail string `json:"user_email" db:"user_email"`
}

type AddGroupMemberRequest struct {
	UserID      string `json:"user_id" validate:"required,uuid"`
	RoleInGroup string `json:"role_in_group,omitempty"`
}

type UpdateGroupMemberRequest struct {
	RoleInGroup *string `json:"role_in_group,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// =====================================================
// CUMPLIMIENTO DE REPORTES (report_compliance)
// =====================================================

type ReportCompliance struct {
	ID               string     `json:"id" db:"id"`
	ChurchID         string     `json:"church_id" db:"church_id"`
	UserID           string     `json:"user_id" db:"user_id"`
	IsoWeek          string     `json:"iso_week" db:"iso_week"`
	PeriodStart      string     `json:"period_start" db:"period_start"`
	PeriodEnd        string     `json:"period_end" db:"period_end"`
	DueDate          string     `json:"due_date" db:"due_date"`
	Status           string     `json:"status" db:"status"`
	ReportID         *string    `json:"report_id,omitempty" db:"report_id"`
	MissedCount      int        `json:"missed_count" db:"missed_count"`
	EscalationSent   bool       `json:"escalation_sent" db:"escalation_sent"`
	NotifiedFailer   bool       `json:"notified_failer" db:"notified_failer"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

// SubordinateComplianceRow is the shape returned by GetSubordinatesCompliance.
type SubordinateComplianceRow struct {
	UserID      string `json:"user_id"`
	UserName    string `json:"user_name"`
	IsoWeek     string `json:"iso_week"`
	PeriodStart string `json:"period_start"`
	Status      string `json:"status"`
	MissedCount int    `json:"missed_count"`
}

// =====================================================
// ASISTENCIA A REUNIONES DE DISCIPULADO
// =====================================================

type Attendance struct {
	ID             string    `json:"id" db:"id"`
	GroupID        string    `json:"group_id" db:"group_id"`
	UserID         string    `json:"user_id" db:"user_id"`
	MeetingDate    string    `json:"meeting_date" db:"meeting_date"`
	Present        bool      `json:"present" db:"present"`
	AttendanceType string    `json:"attendance_type" db:"attendance_type"`
	Notes          string    `json:"notes" db:"notes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type AttendanceWithDetails struct {
	Attendance
	UserName string `json:"user_name" db:"user_name"`
}

type RecordAttendanceRequest struct {
	UserID         string `json:"user_id" validate:"required,uuid"`
	Present        bool   `json:"present"`
	AttendanceType string `json:"attendance_type,omitempty"`
	Notes          string `json:"notes,omitempty"`
}

type BulkAttendanceRequest struct {
	MeetingDate string                    `json:"meeting_date" validate:"required"`
	Attendance  []RecordAttendanceRequest `json:"attendance" validate:"required"`
}

// =====================================================
// ASIGNACIONES DE OBJETIVOS (CASCADE)
// =====================================================

type GoalAssignment struct {
	ID                 string           `json:"id" db:"id"`
	GoalID             string           `json:"goal_id" db:"goal_id"`
	AssignedTo         string           `json:"assigned_to" db:"assigned_to"`
	AssignedBy         string           `json:"assigned_by" db:"assigned_by"`
	AssignedLevel      int              `json:"assigned_level" db:"assigned_level"`
	TargetValue        float64          `json:"target_value" db:"target_value"`
	CurrentValue       float64          `json:"current_value" db:"current_value"`
	ProgressPercentage float64          `json:"progress_percentage" db:"progress_percentage"`
	ParentAssignmentID *string          `json:"parent_assignment_id,omitempty" db:"parent_assignment_id"`
	Status             string           `json:"status" db:"status"`
	Notes              *string          `json:"notes,omitempty" db:"notes"`
	CreatedAt          time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at" db:"updated_at"`
	// populated only by tree queries
	AssignedToName string           `json:"assigned_to_name,omitempty"`
	Children       []GoalAssignment `json:"children,omitempty"`
}

type GoalManualProgress struct {
	ID            string     `json:"id" db:"id"`
	AssignmentID  string     `json:"assignment_id" db:"assignment_id"`
	ReporterID    string     `json:"reporter_id" db:"reporter_id"`
	ReportID      *string    `json:"report_id,omitempty" db:"report_id"`
	ValueReported float64    `json:"value_reported" db:"value_reported"`
	PeriodStart   *time.Time `json:"period_start,omitempty" db:"period_start"`
	PeriodEnd     *time.Time `json:"period_end,omitempty" db:"period_end"`
	Notes         *string    `json:"notes,omitempty" db:"notes"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}
