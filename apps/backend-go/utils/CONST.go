package utils

const (
	RolePastor     = "pastor"
	RoleStaff      = "staff"
	RoleAdmin      = "admin"
	RoleOwner      = "owner"
	RoleServer     = "server"
	RoleSupervisor = "supervisor"
	RoleMember     = "member"
)

// RoleLevel returns the numeric hierarchy level for a given role.
// Higher numbers = more permissions.
// admin=5, pastor=4, staff=3, supervisor=2, server=1, member=0
func GetRoleLevel(role string) int {
	switch role {
	case RoleAdmin, RoleOwner:
		return 5
	case RolePastor:
		return 4
	case RoleStaff:
		return 3
	case RoleSupervisor:
		return 2
	case RoleServer:
		return 1
	default:
		return 0
	}
}
