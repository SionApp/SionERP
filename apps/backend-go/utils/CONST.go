package utils

// ─────────────────────────────────────────────────────────────────────────────
// User Roles (must match the user_role enum in PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
const (
	RoleAdmin      = "admin"      // Legacy/Reserved for level 0 logic
	RolePastor     = "pastor"
	RoleStaff      = "staff"
	RoleSupervisor = "supervisor"
	RoleServer     = "server"
)

// AllRoles returns all valid user_role enum values.
func AllRoles() []string {
	return []string{RoleAdmin, RolePastor, RoleStaff, RoleSupervisor, RoleServer}
}

// AdminRoles returns roles that have admin-level access (admin, pastor + staff).
func AdminRoles() []string {
	return []string{RoleAdmin, RolePastor, RoleStaff}
}

// IsAdminRole returns true if the role has admin-level access.
func IsAdminRole(role string) bool {
	return role == RoleAdmin || role == RolePastor || role == RoleStaff
}

// ─────────────────────────────────────────────────────────────────────────────
// Role fallback (not a real enum value, used when auth fails)
// ─────────────────────────────────────────────────────────────────────────────
const (
	RoleGuest = "guest"
)

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchy Levels (Higher numbers = more authority)
// Uses large gaps so you can add roles in between without renumbering.
// e.g., Super-Admin can be 600, Admin is 500.
// ─────────────────────────────────────────────────────────────────────────────
const (
	LevelAdmin      = 500
	LevelPastor     = 400
	LevelStaff      = 300
	LevelSupervisor = 200
	LevelServer     = 100
)

// RoleLevel returns the numeric hierarchy level for a given role.
// Higher number = higher privilege.
func GetRoleLevel(role string) int {
	switch role {
	case RoleAdmin:
		return LevelAdmin
	case RolePastor:
		return LevelPastor
	case RoleStaff:
		return LevelStaff
	case RoleSupervisor:
		return LevelSupervisor
	case RoleServer:
		return LevelServer
	default:
		return 0 // member/guest = no special power
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Keys (must match modules.key)
// ─────────────────────────────────────────────────────────────────────────────
const (
	ModuleBase         = "base"
	ModuleDiscipleship = "discipleship"
	ModuleZones        = "zones"
	ModuleEvents       = "events"
	ModuleReports      = "reports"
)

// AllModules returns all valid module keys.
func AllModules() []string {
	return []string{ModuleBase, ModuleDiscipleship, ModuleZones, ModuleEvents, ModuleReports}
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Membership Roles (not user_role enum — specific to group context)
// ─────────────────────────────────────────────────────────────────────────────
const (
	GroupRoleLeader   = "leader"
	GroupRoleCoLeader = "coleader"
	GroupRoleMember   = "member"
)

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Types
// ─────────────────────────────────────────────────────────────────────────────
const (
	AttendanceRegular = "regular"
	AttendanceGuest   = "guest"
)

// ─────────────────────────────────────────────────────────────────────────────
// Discipleship Group Statuses
// ─────────────────────────────────────────────────────────────────────────────
const (
	GroupStatusActive   = "active"
	GroupStatusInactive = "inactive"
	GroupStatusPaused   = "paused"
	GroupStatusArchived = "archived"
)

// ─────────────────────────────────────────────────────────────────────────────
// Group Phases (calculated from discipleship_reports data)
const (
	PhaseGerminating = "germinating"
	PhaseGrowing     = "growing"
	PhaseSolid       = "solid"
	PhaseStruggling  = "at_risk"
	PhaseMultiplying = "multiplying"
)

// ─────────────────────────────────────────────────────────────────────────────
// Report Types
// ─────────────────────────────────────────────────────────────────────────────
const (
	ReportTypeWeekly   = "weekly"
	ReportTypeMonthly  = "monthly"
	ReportTypeQuarterly = "quarterly"
)

// ─────────────────────────────────────────────────────────────────────────────
// Report Statuses
// ─────────────────────────────────────────────────────────────────────────────
const (
	ReportStatusDraft     = "draft"
	ReportStatusSubmitted = "submitted"
	ReportStatusApproved  = "approved"
	ReportStatusRejected  = "rejected"
)

// ─────────────────────────────────────────────────────────────────────────────
// Alert Types
// ─────────────────────────────────────────────────────────────────────────────
const (
	AlertNoReports       = "no_reports"
	AlertLowAttendance   = "low_attendance"
	AlertDeclining       = "declining"
	AlertStagnant        = "stagnant"
	AlertCareDeficit     = "care_deficit"
	AlertEvangelismDeficit = "evangelism_deficit"
	AlertAttendanceDrop  = "attendance_drop"
)

// ─────────────────────────────────────────────────────────────────────────────
// Invitation Statuses
// ─────────────────────────────────────────────────────────────────────────────
const (
	InvitePending   = "pending"
	InviteAccepted  = "accepted"
	InviteExpired   = "expired"
	InviteCancelled = "cancelled"
)

// ─────────────────────────────────────────────────────────────────────────────
// User Statuses
// ─────────────────────────────────────────────────────────────────────────────
const (
	UserStatusActive   = "active"
	UserStatusInactive = "inactive"
)
