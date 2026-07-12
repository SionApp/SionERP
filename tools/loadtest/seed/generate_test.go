package main

import (
	"strings"
	"testing"
)

func TestTenantNameAndSlugAreNamespacedAndUnique(t *testing.T) {
	n1 := TenantName(1)
	n7 := TenantName(7)
	if !strings.HasPrefix(n1, loadtestPrefix) {
		t.Fatalf("TenantName(1) = %q, want prefix %q", n1, loadtestPrefix)
	}
	if n1 == n7 {
		t.Fatalf("TenantName(1) and TenantName(7) must differ, got %q for both", n1)
	}

	s1 := TenantSlug(1)
	if !strings.HasPrefix(s1, "loadtest-") {
		t.Fatalf("TenantSlug(1) = %q, want prefix %q", s1, "loadtest-")
	}
	if strings.Contains(s1, " ") {
		t.Fatalf("TenantSlug(1) = %q must not contain spaces", s1)
	}
}

func TestUserEmailIsUniquePerTenantAndUser(t *testing.T) {
	a := UserEmail(1, 0)
	b := UserEmail(1, 1)
	c := UserEmail(2, 0)
	if a == b || a == c || b == c {
		t.Fatalf("UserEmail must be unique per (tenant, user): got a=%q b=%q c=%q", a, b, c)
	}
	if !strings.HasSuffix(a, "@loadtest.local") {
		t.Fatalf("UserEmail(1,0) = %q, want @loadtest.local suffix", a)
	}
}

func TestUserIDNumberIsNamespacedAndUnique(t *testing.T) {
	a := UserIDNumber(3, 10)
	b := UserIDNumber(3, 11)
	if !strings.HasPrefix(a, loadtestPrefix) {
		t.Fatalf("UserIDNumber(3,10) = %q, want prefix %q", a, loadtestPrefix)
	}
	if a == b {
		t.Fatalf("UserIDNumber must differ per user index, got %q for both", a)
	}
}

func TestRoleForUserIndexSessionUserIsPastor(t *testing.T) {
	if got := RoleForUserIndex(0); got != "pastor" {
		t.Fatalf("RoleForUserIndex(0) = %q, want %q (designated load-test session user)", got, "pastor")
	}
}

func TestRoleForUserIndexOnlyReturnsValidEnumValues(t *testing.T) {
	valid := map[string]bool{"admin": true, "pastor": true, "staff": true, "supervisor": true, "server": true}
	for i := 0; i < 200; i++ {
		role := RoleForUserIndex(i)
		if !valid[role] {
			t.Fatalf("RoleForUserIndex(%d) = %q, not a valid user_role enum value", i, role)
		}
	}
}

func TestZoneAndGroupNamesAreNamespaced(t *testing.T) {
	z := ZoneName(4, 2)
	g := GroupName(4, 2)
	if !strings.HasPrefix(z, loadtestPrefix) {
		t.Fatalf("ZoneName(4,2) = %q, want prefix %q", z, loadtestPrefix)
	}
	if !strings.HasPrefix(g, loadtestPrefix) {
		t.Fatalf("GroupName(4,2) = %q, want prefix %q", g, loadtestPrefix)
	}
}

func TestAssertLocalDBURLRejectsRemoteHosts(t *testing.T) {
	cases := []struct {
		url     string
		wantErr bool
	}{
		{"postgresql://postgres:postgres@127.0.0.1:54322/postgres", false},
		{"postgresql://postgres:postgres@localhost:54322/postgres", false},
		{"postgresql://user:pass@db.rpacdeyavjodixeymzpb.supabase.co:5432/postgres", true},
		{"postgresql://user:pass@some-host.onrender.com:5432/postgres", true},
	}
	for _, tc := range cases {
		err := assertLocalDBURL(tc.url)
		if tc.wantErr && err == nil {
			t.Errorf("assertLocalDBURL(%q) = nil, want error (remote host must be rejected)", tc.url)
		}
		if !tc.wantErr && err != nil {
			t.Errorf("assertLocalDBURL(%q) = %v, want nil (local host must be allowed)", tc.url, err)
		}
	}
}
