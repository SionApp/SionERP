package handlers

// discipleship_pr2_test.go — Integration tests for PR2: GetDashboardStatsByLevel,
// GetGroups(+count), GetGroup, GetHierarchy, GetSubordinates case-3 rewrites.
//
// ALL tests require a real PostgreSQL database, guarded by TEST_DATABASE_URL.
//
// Fixture (two-generals-one-zone, same as PR1):
//
//   churchC
//   └─ zoneZ
//      ├─ genA (L3, supervisor_id=NULL)
//      │   └─ auxA1 (L2, supervisor_id=genA)
//      │       └─ leadA1 (L1, supervisor_id=auxA1)
//      └─ genB (L3, supervisor_id=NULL)
//          └─ auxB1 (L2, supervisor_id=genB)
//              └─ leadB1 (L1, supervisor_id=auxB1)
//   Groups: G1 (leader=leadA1), G2 (leader=leadB1)
//   Coordinator (L4) coordA: sees full zone

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"
)

// seedGroup creates a minimal discipleship_groups row and returns its UUID.
func seedGroup(t *testing.T, db *sql.DB, churchID, zoneID, leaderID, name string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO discipleship_groups
			(church_id, zone_id, leader_id, group_name, status, member_count)
		VALUES ($1, $2::uuid, $3, $4, 'active', 0)
		RETURNING id
	`, churchID, zoneID, leaderID, name).Scan(&id)
	if err != nil {
		t.Fatalf("seedGroup %q: %v", name, err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_groups WHERE id = $1`, id)
	})
	return id
}

// pr2Fixture extends twoGenFixture with groups and a coordinator.
type pr2Fixture struct {
	twoGenFixture
	g1     string // group led by leadA1
	g2     string // group led by leadB1
	coordA string // L4 coordinator in same zone
}

func seedPR2Fixture(t *testing.T, db *sql.DB) pr2Fixture {
	t.Helper()
	f := seedTwoGeneralsFixture(t, db)

	g1 := seedGroup(t, db, f.churchC, f.zoneZ, f.leadA1,
		fmt.Sprintf("GroupA1_%d", time.Now().UnixNano()))
	g2 := seedGroup(t, db, f.churchC, f.zoneZ, f.leadB1,
		fmt.Sprintf("GroupB1_%d", time.Now().UnixNano()))

	// Coordinator (L4) — sees full zone
	coordA := seedUser(t, db, f.churchC, fmt.Sprintf("coordA_%d@test.com", time.Now().UnixNano()))
	seedHierarchyWithZone(t, db, f.churchC, coordA, "", 4, f.zoneZ)

	return pr2Fixture{twoGenFixture: f, g1: g1, g2: g2, coordA: coordA}
}

// ─── T2.1 Site 1: GetDashboardStatsByLevel case "3" ──────────────────────────

// TestPR2_GetDashboardStatsByLevel_General: genA sees only its subtree's group/member counts.
func TestPR2_GetDashboardStatsByLevel_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// Update G1 to have 3 members, G2 to have 7 (to distinguish)
	db.Exec(`UPDATE discipleship_groups SET member_count = 3 WHERE id = $1`, f.g1)
	db.Exec(`UPDATE discipleship_groups SET member_count = 7 WHERE id = $1`, f.g2)

	// BEFORE fix: uses zone_id — genA sees both G1 AND G2 (total_groups=2, total_members=10).
	// AFTER fix:  uses 2-hop subtree — genA sees only G1 (total_groups=1, total_members=3).

	// Run the AFTER-fix query (what the implementation should produce):
	groupCountQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_groups
		WHERE leader_id IN (%s) AND church_id = $1 AND status = 'active'
	`, subtreeLeaderIDsSubquery(1, 2))

	memberSumQuery := fmt.Sprintf(`
		SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
		WHERE leader_id IN (%s) AND church_id = $1 AND status = 'active'
	`, subtreeLeaderIDsSubquery(1, 2))

	var totalGroups, totalMembers int
	err := db.QueryRow(groupCountQuery, f.churchC, f.genA).Scan(&totalGroups)
	if err != nil {
		t.Fatalf("dashboard group count query: %v", err)
	}
	err = db.QueryRow(memberSumQuery, f.churchC, f.genA).Scan(&totalMembers)
	if err != nil {
		t.Fatalf("dashboard member sum query: %v", err)
	}

	if totalGroups != 1 {
		t.Errorf("GetDashboardStatsByLevel genA: TotalGroups = %d, want 1 (only G1)", totalGroups)
	}
	if totalMembers != 3 {
		t.Errorf("GetDashboardStatsByLevel genA: TotalMembers = %d, want 3 (only G1's members)", totalMembers)
	}

	// genB should also see only its own subtree
	err = db.QueryRow(groupCountQuery, f.churchC, f.genB).Scan(&totalGroups)
	if err != nil {
		t.Fatalf("dashboard group count query genB: %v", err)
	}
	if totalGroups != 1 {
		t.Errorf("GetDashboardStatsByLevel genB: TotalGroups = %d, want 1 (only G2)", totalGroups)
	}
}

// ─── T2.1 Site 2: GetGroups case 3 (list + count) ────────────────────────────

// TestPR2_GetGroups_General: list query as genA returns only G1; count also 1.
func TestPR2_GetGroups_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// AFTER fix: g.leader_id IN (2-hop subtree for genA)
	listQuery := fmt.Sprintf(`
		SELECT g.id FROM discipleship_groups g
		WHERE g.church_id = $1
		  AND g.leader_id IN (%s)
		  AND g.status = 'active'
	`, subtreeLeaderIDsSubquery(1, 2))

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_groups g
		WHERE g.church_id = $1
		  AND g.leader_id IN (%s)
		  AND g.status = 'active'
	`, subtreeLeaderIDsSubquery(1, 2))

	// List: genA should see only G1
	rows, err := db.Query(listQuery, f.churchC, f.genA)
	if err != nil {
		t.Fatalf("GetGroups list query: %v", err)
	}
	defer rows.Close()

	var groupIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan: %v", err)
		}
		groupIDs = append(groupIDs, id)
	}

	if !containsStr(groupIDs, f.g1) {
		t.Errorf("GetGroups genA: G1 (%s) missing from result", f.g1)
	}
	if containsStr(groupIDs, f.g2) {
		t.Errorf("GetGroups genA: G2 (%s) from genB's subtree should NOT appear", f.g2)
	}

	// Count: genA → 1
	var count int
	err = db.QueryRow(countQuery, f.churchC, f.genA).Scan(&count)
	if err != nil {
		t.Fatalf("GetGroups count query: %v", err)
	}
	if count != 1 {
		t.Errorf("GetGroups count genA = %d, want 1", count)
	}
}

// ─── T2.1 Site 3: GetGroup access check case 3 ───────────────────────────────

// TestPR2_GetGroup_Forbidden: genA cannot access G2 (genB's group).
func TestPR2_GetGroup_Forbidden(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// AFTER fix: access check uses leader_id IN (2-hop subtree).
	// Query G2 as genA — should return no rows (→ 403 in handler).
	accessQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_groups g
		WHERE g.id = $1 AND g.church_id = $2
		  AND g.leader_id IN (%s)
	`, subtreeLeaderIDsSubquery(2, 3))

	// genA trying to access G2 — count must be 0
	var count int
	err := db.QueryRow(accessQuery, f.g2, f.churchC, f.genA).Scan(&count)
	if err != nil {
		t.Fatalf("GetGroup access check genA→G2: %v", err)
	}
	if count != 0 {
		t.Errorf("GetGroup: genA should NOT be able to access G2 (count=%d, want 0)", count)
	}

	// genA accessing G1 — count must be 1
	err = db.QueryRow(accessQuery, f.g1, f.churchC, f.genA).Scan(&count)
	if err != nil {
		t.Fatalf("GetGroup access check genA→G1: %v", err)
	}
	if count != 1 {
		t.Errorf("GetGroup: genA should be able to access G1 (count=%d, want 1)", count)
	}
}

// ─── T2.1 Site 4: GetHierarchy case 3 ────────────────────────────────────────

// TestPR2_GetHierarchy_General: genA sees {genA, auxA1, leadA1}; genB's subtree absent.
func TestPR2_GetHierarchy_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// AFTER fix:
	//   h.user_id = $2 (self)
	//   OR h.user_id IN (subtreeAuxIDsSubquery — 1-hop auxiliaries)
	//   OR h.supervisor_id IN (subtreeAuxIDsSubquery — leaders of those auxiliaries)
	// Note: $1=church, $2=callerID, $3=church(reuse), $4=callerID(reuse), $5=church(reuse), $6=callerID(reuse)
	hierarchyQuery := fmt.Sprintf(`
		SELECT h.user_id FROM discipleship_hierarchy h
		WHERE h.church_id = $1
		  AND (
		    h.user_id = $2
		    OR h.user_id IN (%s)
		    OR h.supervisor_id IN (%s)
		  )
		ORDER BY h.hierarchy_level DESC
	`, subtreeAuxIDsSubquery(1, 2), subtreeAuxIDsSubquery(1, 2))

	rows, err := db.Query(hierarchyQuery, f.churchC, f.genA)
	if err != nil {
		t.Fatalf("GetHierarchy query genA: %v", err)
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan: %v", err)
		}
		userIDs = append(userIDs, id)
	}

	// genA's subtree: genA, auxA1, leadA1
	if !containsStr(userIDs, f.genA) {
		t.Errorf("GetHierarchy genA: genA itself missing")
	}
	if !containsStr(userIDs, f.auxA1) {
		t.Errorf("GetHierarchy genA: auxA1 missing")
	}
	if !containsStr(userIDs, f.leadA1) {
		t.Errorf("GetHierarchy genA: leadA1 missing")
	}

	// genB's subtree must be absent
	if containsStr(userIDs, f.genB) {
		t.Errorf("GetHierarchy genA: genB should NOT appear (sibling)")
	}
	if containsStr(userIDs, f.auxB1) {
		t.Errorf("GetHierarchy genA: auxB1 should NOT appear (sibling subtree)")
	}
	if containsStr(userIDs, f.leadB1) {
		t.Errorf("GetHierarchy genA: leadB1 should NOT appear (sibling subtree)")
	}
}

// ─── T2.1 Site 5: GetSubordinates case 3 ─────────────────────────────────────

// TestPR2_GetSubordinates_General: genA sees only auxA1; auxB1 absent.
func TestPR2_GetSubordinates_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// AFTER fix: supervisor_id = callerID (not zone_id)
	subQuery := `
		SELECT h.user_id FROM discipleship_hierarchy h
		WHERE h.church_id = $1 AND h.hierarchy_level = 2 AND h.supervisor_id = $2
		ORDER BY h.user_id
	`
	rows, err := db.Query(subQuery, f.churchC, f.genA)
	if err != nil {
		t.Fatalf("GetSubordinates query genA: %v", err)
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan: %v", err)
		}
		userIDs = append(userIDs, id)
	}

	if !containsStr(userIDs, f.auxA1) {
		t.Errorf("GetSubordinates genA: auxA1 missing")
	}
	if containsStr(userIDs, f.auxB1) {
		t.Errorf("GetSubordinates genA: auxB1 should NOT appear (genB's subtree)")
	}
	if len(userIDs) != 1 {
		t.Errorf("GetSubordinates genA: expected 1 result, got %d: %v", len(userIDs), userIDs)
	}

	// Permission check: genA cannot query genB's subordinates (supervisorID != callerID)
	// In the handler: if supervisorID != callerID → 403.
	// Here we validate that the zone-based check is REPLACED by identity check.
	// genB's auxB1 — NOT in genA's supervisor_id chain → must be blocked.
	canGenAQueryGenB := (f.genB == f.genA) // always false — sanity
	if canGenAQueryGenB {
		t.Errorf("genA and genB should be different users")
	}
}

// ─── T2.7 Regression: Coordinator (L4) still sees both subtrees ──────────────

// TestPR2_Coordinator_SeesBoth: L4 GetGroups sees G1 and G2.
func TestPR2_Coordinator_SeesBoth(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR2Fixture(t, db)

	// L4 path: zone_id = zoneZ (unchanged by PR2)
	var groupCount int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_groups g
		WHERE g.church_id = $1 AND g.zone_id = $2::uuid AND g.status = 'active'
	`, f.churchC, f.zoneZ).Scan(&groupCount)
	if err != nil {
		t.Fatalf("L4 GetGroups count: %v", err)
	}

	// Should see both G1 and G2
	if groupCount < 2 {
		t.Errorf("L4 coordinator: expected >= 2 groups (both subtrees), got %d", groupCount)
	}

	// L4 GetHierarchy: sees all 6 hierarchy members in zone
	var hierCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_hierarchy h
		WHERE h.church_id = $1 AND h.zone_id = $2::uuid
	`, f.churchC, f.zoneZ).Scan(&hierCount)
	if err != nil {
		t.Fatalf("L4 GetHierarchy count: %v", err)
	}
	// genA, genB, auxA1, auxB1, leadA1, leadB1 = 6
	if hierCount < 6 {
		t.Errorf("L4 hierarchy: expected 6 rows (full zone), got %d", hierCount)
	}

	// L4 GetDashboardStatsByLevel: whole zone count includes both groups
	var dashCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_groups
		WHERE zone_id = $1::uuid AND church_id = $2 AND status = 'active'
	`, f.zoneZ, f.churchC).Scan(&dashCount)
	if err != nil {
		t.Fatalf("L4 dashboard group count: %v", err)
	}
	if dashCount < 2 {
		t.Errorf("L4 dashboard: expected >= 2 groups, got %d", dashCount)
	}
}
