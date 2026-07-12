package main

import (
	"fmt"
	"strings"
)

// loadtestPrefix namespaces every synthetic row this tool creates so cleanup
// can identify and remove exactly (and only) load-test data.
const loadtestPrefix = "LOADTEST-"

// forbiddenDBHostSubstrings must never appear in a target Postgres URL.
// This is the hard safety gate: this tool only ever runs against a local stack.
var forbiddenDBHostSubstrings = []string{"supabase.co", "onrender.com"}

// assertLocalDBURL refuses to proceed if the DB URL looks like it points at a
// remote/prod host. Defense in depth alongside the default-to-localhost behavior.
func assertLocalDBURL(dbURL string) error {
	lower := strings.ToLower(dbURL)
	for _, bad := range forbiddenDBHostSubstrings {
		if strings.Contains(lower, bad) {
			return fmt.Errorf(
				"refusing to run: target DB URL contains %q — this tool is LOCAL-ONLY. "+
					"Got: %s", bad, redactDBURL(dbURL),
			)
		}
	}
	return nil
}

// redactDBURL hides credentials when the URL must be echoed in an error message.
func redactDBURL(dbURL string) string {
	at := strings.LastIndex(dbURL, "@")
	scheme := strings.Index(dbURL, "://")
	if at == -1 || scheme == -1 || at < scheme {
		return dbURL
	}
	return dbURL[:scheme+3] + "***:***" + dbURL[at:]
}

// TenantName returns the namespaced church name for synthetic tenant idx (1-based).
func TenantName(idx int) string {
	return fmt.Sprintf("%sIglesia-%03d", loadtestPrefix, idx)
}

// TenantSlug returns a URL-safe slug for synthetic tenant idx, matching the
// slugify() convention used by handlers/onboarding.go.
func TenantSlug(idx int) string {
	return fmt.Sprintf("loadtest-iglesia-%03d", idx)
}

// UserEmail returns a globally-unique synthetic email for tenant/user index.
func UserEmail(tenantIdx, userIdx int) string {
	return fmt.Sprintf("loadtest-t%03d-u%04d@loadtest.local", tenantIdx, userIdx)
}

// UserIDNumber returns a namespaced, unique id_number for tenant/user index.
func UserIDNumber(tenantIdx, userIdx int) string {
	return fmt.Sprintf("%s%03d-%04d", loadtestPrefix, tenantIdx, userIdx)
}

// ZoneName returns a namespaced, globally-unique zone name (zones.name has a
// UNIQUE constraint across the whole table, not per-church).
func ZoneName(tenantIdx, zoneIdx int) string {
	return fmt.Sprintf("%s%03d-Zone-%d", loadtestPrefix, tenantIdx, zoneIdx)
}

// GroupName returns a namespaced discipleship group name.
func GroupName(tenantIdx, groupIdx int) string {
	return fmt.Sprintf("%s%03d-Grupo-%d", loadtestPrefix, tenantIdx, groupIdx)
}

// RoleForUserIndex returns a valid public.user_role enum value for the given
// per-tenant user index, approximating a realistic role distribution.
//
// userIdx 0 is always "pastor" — the designated load-test session/login user.
// middleware.RequireModuleLevel bypasses entirely for role pastor/admin, and
// role pastor (level 400) satisfies every middleware.RequireRole gate used by
// the navigation mix this tool seeds data for — see tools/loadtest/README.md
// "Why role=pastor for the session user".
func RoleForUserIndex(userIdx int) string {
	switch {
	case userIdx == 0:
		return "pastor"
	case userIdx%23 == 0:
		return "staff"
	case userIdx%11 == 0:
		return "supervisor"
	default:
		return "server"
	}
}
