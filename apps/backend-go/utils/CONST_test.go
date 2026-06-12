package utils

import "testing"

func TestGetRoleLevel(t *testing.T) {
	cases := []struct {
		role string
		want int
	}{
		{RoleAdmin, LevelAdmin},
		{RolePastor, LevelPastor},
		{RoleStaff, LevelStaff},
		{RoleSupervisor, LevelSupervisor},
		{RoleServer, LevelServer},
		{"member", 0},
		{"guest", 0},
		{"", 0},
		{"unknown", 0},
	}
	for _, tc := range cases {
		t.Run(tc.role, func(t *testing.T) {
			got := GetRoleLevel(tc.role)
			if got != tc.want {
				t.Errorf("GetRoleLevel(%q) = %d; want %d", tc.role, got, tc.want)
			}
		})
	}
}

func TestGetRoleLevelHierarchyOrder(t *testing.T) {
	// Invariant: admin > pastor > staff > supervisor > server > unknown
	levels := []int{
		GetRoleLevel(RoleAdmin),
		GetRoleLevel(RolePastor),
		GetRoleLevel(RoleStaff),
		GetRoleLevel(RoleSupervisor),
		GetRoleLevel(RoleServer),
	}
	for i := 1; i < len(levels); i++ {
		if levels[i] >= levels[i-1] {
			t.Errorf("hierarchy broken at index %d: level[%d]=%d >= level[%d]=%d",
				i, i, levels[i], i-1, levels[i-1])
		}
	}
}

func TestIsAdminRole(t *testing.T) {
	cases := []struct {
		role string
		want bool
	}{
		{RoleAdmin, true},
		{RolePastor, true},
		{RoleStaff, true},
		{RoleSupervisor, false},
		{RoleServer, false},
		{"member", false},
		{RoleGuest, false},
		{"", false},
	}
	for _, tc := range cases {
		t.Run(tc.role, func(t *testing.T) {
			got := IsAdminRole(tc.role)
			if got != tc.want {
				t.Errorf("IsAdminRole(%q) = %v; want %v", tc.role, got, tc.want)
			}
		})
	}
}

func TestAllRoles(t *testing.T) {
	roles := AllRoles()
	if len(roles) == 0 {
		t.Fatal("AllRoles() returned empty slice")
	}
	// Every role returned must resolve to a non-zero level
	for _, r := range roles {
		if GetRoleLevel(r) == 0 {
			t.Errorf("AllRoles() includes %q which resolves to level 0", r)
		}
	}
}

func TestAdminRoles(t *testing.T) {
	adminRoles := AdminRoles()
	if len(adminRoles) == 0 {
		t.Fatal("AdminRoles() returned empty slice")
	}
	for _, r := range adminRoles {
		if !IsAdminRole(r) {
			t.Errorf("AdminRoles() includes %q but IsAdminRole returns false", r)
		}
	}
}

func TestAllModules(t *testing.T) {
	modules := AllModules()
	want := 6
	if len(modules) != want {
		t.Errorf("AllModules() = %d modules; want %d", len(modules), want)
	}
	// Spot-check known keys
	found := make(map[string]bool, len(modules))
	for _, m := range modules {
		found[m] = true
	}
	for _, key := range []string{ModuleBase, ModuleDiscipleship, ModuleZones, ModuleEvents, ModuleReports, ModuleMusic} {
		if !found[key] {
			t.Errorf("AllModules() missing expected key %q", key)
		}
	}
}

func TestAllModulesIncludesMusic(t *testing.T) {
	modules := AllModules()
	for _, m := range modules {
		if m == ModuleMusic {
			return
		}
	}
	t.Errorf("AllModules() does not include %q", ModuleMusic)
}
