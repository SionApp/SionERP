package handlers

// discipleship_subtree_test.go — Integration tests for the subtree resolution helper.
//
// ALL tests here require a real PostgreSQL database. They are guarded with:
//   if os.Getenv("TEST_DATABASE_URL") == "" { t.Skip(...) }
//
// To run locally:
//   TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
//     go test ./handlers/... -v -run "Subtree|ZoneRollup|SubordinatesCompliance"
//
// Fixture (two-generals-one-zone):
//
//   churchC
//   └─ zoneZ
//      ├─ genA (L3, supervisor_id=NULL)
//      │   └─ auxA1 (L2, supervisor_id=genA)
//      │       └─ leadA1 (L1, supervisor_id=auxA1)
//      └─ genB (L3, supervisor_id=NULL)
//          └─ auxB1 (L2, supervisor_id=genB)
//              └─ leadB1 (L1, supervisor_id=auxB1)

import (
	"database/sql"
	"fmt"
	"os"
	"sort"
	"testing"
	"time"
)

// ─── Fixture seed helpers ─────────────────────────────────────────────────────

// seedZone creates a minimal zone row and returns its UUID.
func seedZone(t *testing.T, db *sql.DB, churchID, name string) string {
	t.Helper()
	var id string
	err := db.QueryRow(
		`INSERT INTO zones (church_id, name) VALUES ($1, $2) RETURNING id`,
		churchID, name,
	).Scan(&id)
	if err != nil {
		t.Fatalf("seedZone %q: %v", name, err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM zones WHERE id = $1`, id)
	})
	return id
}

// seedHierarchyWithZone inserts a discipleship_hierarchy row with a zone.
func seedHierarchyWithZone(t *testing.T, db *sql.DB, churchID, userID, supervisorID string, level int, zoneID string) {
	t.Helper()
	var err error
	if supervisorID == "" {
		_, err = db.Exec(`
			INSERT INTO discipleship_hierarchy (church_id, user_id, supervisor_id, hierarchy_level, zone_id)
			VALUES ($1, $2, NULL, $3, $4::uuid)
			ON CONFLICT DO NOTHING
		`, churchID, userID, level, zoneID)
	} else {
		_, err = db.Exec(`
			INSERT INTO discipleship_hierarchy (church_id, user_id, supervisor_id, hierarchy_level, zone_id)
			VALUES ($1, $2, $3, $4, $5::uuid)
			ON CONFLICT DO NOTHING
		`, churchID, userID, supervisorID, level, zoneID)
	}
	if err != nil {
		t.Fatalf("seedHierarchyWithZone: %v", err)
	}
}

// seedDiscipleshipReport creates a minimal discipleship_report and returns its UUID.
func seedDiscipleshipReport(t *testing.T, db *sql.DB, churchID, reporterID string, disc, evang int) string {
	t.Helper()
	var id string
	ps := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC) // Monday
	pe := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC) // Saturday
	reportData := fmt.Sprintf(`{"group_discipleships":%d,"group_evangelism":%d,"leader_evangelism":0}`, disc, evang)
	err := db.QueryRow(`
		INSERT INTO discipleship_reports
			(church_id, reporter_id, report_type, report_level, period_start, period_end, status, report_data)
		VALUES ($1, $2, 'weekly', 1, $3, $4, 'submitted', $5::jsonb)
		RETURNING id
	`, churchID, reporterID, ps, pe, reportData).Scan(&id)
	if err != nil {
		t.Fatalf("seedDiscipleshipReport: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_reports WHERE id = $1`, id)
	})
	return id
}

// seedReportCompliance creates a report_compliance row for the given user.
func seedReportCompliance(t *testing.T, db *sql.DB, churchID, userID, isoWeek string) {
	t.Helper()
	// Use a recent week so rows fall inside the compliance look-back window
	// (GetSubordinatesCompliance filters period_start >= CURRENT_DATE - N weeks).
	pe := time.Now().AddDate(0, 0, -1)
	ps := pe.AddDate(0, 0, -5)
	_, err := db.Exec(`
		INSERT INTO report_compliance
			(church_id, user_id, iso_week, period_start, period_end, due_date, status, missed_count)
		VALUES ($1, $2, $3, $4, $5, $5, 'on_time', 0)
		ON CONFLICT DO NOTHING
	`, churchID, userID, isoWeek, ps, pe)
	if err != nil {
		t.Fatalf("seedReportCompliance: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM report_compliance WHERE church_id = $1 AND user_id = $2 AND iso_week = $3`, churchID, userID, isoWeek)
	})
}

// twoGeneralsFixture seeds the standard two-generals-one-zone fixture and returns all IDs.
type twoGenFixture struct {
	churchC string
	zoneZ   string
	genA    string
	genB    string
	auxA1   string
	auxB1   string
	leadA1  string
	leadB1  string
}

func seedTwoGeneralsFixture(t *testing.T, db *sql.DB) twoGenFixture {
	t.Helper()
	churchC := seedChurch(t, db, fmt.Sprintf("TestChurch_TwoGenerals_%d", time.Now().UnixNano()))
	zoneZ := seedZone(t, db, churchC, "ZoneZ")

	genA := seedUser(t, db, churchC, fmt.Sprintf("genA_%d@test.com", time.Now().UnixNano()))
	genB := seedUser(t, db, churchC, fmt.Sprintf("genB_%d@test.com", time.Now().UnixNano()))

	auxA1 := seedUser(t, db, churchC, fmt.Sprintf("auxA1_%d@test.com", time.Now().UnixNano()))
	auxB1 := seedUser(t, db, churchC, fmt.Sprintf("auxB1_%d@test.com", time.Now().UnixNano()))

	leadA1 := seedUser(t, db, churchC, fmt.Sprintf("leadA1_%d@test.com", time.Now().UnixNano()))
	leadB1 := seedUser(t, db, churchC, fmt.Sprintf("leadB1_%d@test.com", time.Now().UnixNano()))

	// Generals (L3) in the zone — no supervisor above them in hierarchy
	seedHierarchyWithZone(t, db, churchC, genA, "", 3, zoneZ)
	seedHierarchyWithZone(t, db, churchC, genB, "", 3, zoneZ)

	// Auxiliaries (L2): supervisor = their General
	seedHierarchyWithZone(t, db, churchC, auxA1, genA, 2, zoneZ)
	seedHierarchyWithZone(t, db, churchC, auxB1, genB, 2, zoneZ)

	// Leaders (L1): supervisor = their Auxiliary
	seedHierarchyWithZone(t, db, churchC, leadA1, auxA1, 1, zoneZ)
	seedHierarchyWithZone(t, db, churchC, leadB1, auxB1, 1, zoneZ)

	return twoGenFixture{
		churchC: churchC,
		zoneZ:   zoneZ,
		genA:    genA,
		genB:    genB,
		auxA1:   auxA1,
		auxB1:   auxB1,
		leadA1:  leadA1,
		leadB1:  leadB1,
	}
}

// sortedStringSlice sorts a string slice in place and returns it.
func sortedStringSlice(s []string) []string {
	sort.Strings(s)
	return s
}

// containsStr reports whether needle is in haystack.
func containsStr(haystack []string, needle string) bool {
	for _, v := range haystack {
		if v == needle {
			return true
		}
	}
	return false
}

// ─── T1.1: Helper unit tests ──────────────────────────────────────────────────

// TestSubtreeHelper_1hop: subtreeUserIDs(db, churchC, genA, 1) == {auxA1} only.
func TestSubtreeHelper_1hop(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	ids, err := subtreeUserIDs(db, f.churchC, f.genA, 1)
	if err != nil {
		t.Fatalf("subtreeUserIDs(1-hop): %v", err)
	}

	if len(ids) != 1 {
		t.Fatalf("expected 1 result, got %d: %v", len(ids), ids)
	}
	if ids[0] != f.auxA1 {
		t.Errorf("expected %s (auxA1), got %s", f.auxA1, ids[0])
	}
}

// TestSubtreeHelper_2hop: subtreeUserIDs(db, churchC, genA, 2) == {leadA1} only.
func TestSubtreeHelper_2hop(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	ids, err := subtreeUserIDs(db, f.churchC, f.genA, 2)
	if err != nil {
		t.Fatalf("subtreeUserIDs(2-hop): %v", err)
	}

	if len(ids) != 1 {
		t.Fatalf("expected 1 result, got %d: %v", len(ids), ids)
	}
	if ids[0] != f.leadA1 {
		t.Errorf("expected %s (leadA1), got %s", f.leadA1, ids[0])
	}
}

// TestSubtreeHelper_SiblingExclusion: genA 2-hop result does NOT contain auxB1, leadB1.
func TestSubtreeHelper_SiblingExclusion(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	ids, err := subtreeUserIDs(db, f.churchC, f.genA, 2)
	if err != nil {
		t.Fatalf("subtreeUserIDs: %v", err)
	}

	if containsStr(ids, f.auxB1) {
		t.Errorf("genA 2-hop result incorrectly contains auxB1 (%s)", f.auxB1)
	}
	if containsStr(ids, f.leadB1) {
		t.Errorf("genA 2-hop result incorrectly contains leadB1 (%s)", f.leadB1)
	}
	if containsStr(ids, f.genB) {
		t.Errorf("genA 2-hop result incorrectly contains genB (%s)", f.genB)
	}
}

// TestSubtreeHelper_EmptySubtree: a General with no subordinates returns empty slice, nil error.
func TestSubtreeHelper_EmptySubtree(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	churchC := seedChurch(t, db, fmt.Sprintf("TestChurch_Empty_%d", time.Now().UnixNano()))
	genC := seedUser(t, db, churchC, fmt.Sprintf("genC_%d@test.com", time.Now().UnixNano()))

	// genC has no hierarchy row at all — no subordinates
	ids, err := subtreeUserIDs(db, churchC, genC, 2)
	if err != nil {
		t.Fatalf("subtreeUserIDs empty: unexpected error: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("expected empty slice, got %v", ids)
	}
}

// TestSubtreeHelper_CrossTenant: calling with churchC never returns rows from churchX.
func TestSubtreeHelper_CrossTenant(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	// Seed churchX with a different church but same-email pattern leader under genA-equivalent
	churchX := seedChurch(t, db, fmt.Sprintf("TestChurch_CrossTenant_%d", time.Now().UnixNano()))
	zoneX := seedZone(t, db, churchX, "ZoneX")
	// Create an auxiliary in churchX whose supervisor_id == f.genA (same UUID, different church)
	auxX := seedUser(t, db, churchX, fmt.Sprintf("auxX_%d@test.com", time.Now().UnixNano()))
	leadX := seedUser(t, db, churchX, fmt.Sprintf("leadX_%d@test.com", time.Now().UnixNano()))
	seedHierarchyWithZone(t, db, churchX, auxX, f.genA, 2, zoneX) // same genA UUID, but in churchX
	seedHierarchyWithZone(t, db, churchX, leadX, auxX, 1, zoneX)

	// Call with churchC — must NOT return churchX rows
	ids, err := subtreeUserIDs(db, f.churchC, f.genA, 2)
	if err != nil {
		t.Fatalf("subtreeUserIDs cross-tenant: %v", err)
	}

	if containsStr(ids, leadX) {
		t.Errorf("cross-tenant leak: leadX (%s) from churchX appeared in churchC results", leadX)
	}
	if containsStr(ids, auxX) {
		t.Errorf("cross-tenant leak: auxX (%s) from churchX appeared in churchC results", auxX)
	}
	// Should still return the correct churchC leader
	if !containsStr(ids, f.leadA1) {
		t.Errorf("churchC leadA1 (%s) missing from results", f.leadA1)
	}
}

// ─── T1.3: Keystone isolation tests (will be RED until T1.4+T1.5 are applied) ─

// TestSubtreeIsolation_GetZoneRollup: GetZoneRollup as genA only sums leadA1's reports.
func TestSubtreeIsolation_GetZoneRollup(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	// Seed reports: leadA1 submits 5 discipleships, leadB1 submits 10 discipleships.
	seedDiscipleshipReport(t, db, f.churchC, f.leadA1, 5, 3)
	seedDiscipleshipReport(t, db, f.churchC, f.leadB1, 10, 7)

	// Run the same SQL that GetZoneRollup case-3 (General) executes: church=$1,
	// period_start=$2, period_end=$3, general=$4; the subtree subquery reuses $1
	// for church and $4 for the supervisor.
	query := fmt.Sprintf(`
		SELECT
		  COALESCE(SUM((r.report_data->>'group_discipleships')::int), 0),
		  COALESCE(SUM(
		     COALESCE((r.report_data->>'group_evangelism')::int, 0) +
		     COALESCE((r.report_data->>'leader_evangelism')::int, 0)
		  ), 0),
		  COUNT(DISTINCT r.reporter_id)
		FROM discipleship_reports r
		JOIN discipleship_hierarchy h
		  ON h.user_id = r.reporter_id AND h.church_id = r.church_id
		WHERE r.church_id = $1
		  AND r.report_level = 1
		  AND r.status IN ('submitted', 'approved')
		  AND r.period_start >= $2
		  AND r.period_end <= $3
		  AND r.reporter_id IN (%s)
	`, subtreeLeaderIDsSubquery(1, 4))

	ps := "2026-01-01"
	pe := "2026-01-31"
	var disc, evang, contributing int
	err := db.QueryRow(query, f.churchC, ps, pe, f.genA).Scan(&disc, &evang, &contributing)
	if err != nil {
		t.Fatalf("GetZoneRollup subtree query: %v", err)
	}

	// genA should see only leadA1's 5 discipleships (not leadB1's 10)
	if disc != 5 {
		t.Errorf("disc = %d, want 5 (only leadA1's reports)", disc)
	}
	if evang != 3 {
		t.Errorf("evang = %d, want 3 (only leadA1's reports)", evang)
	}
	if contributing != 1 {
		t.Errorf("contributing = %d, want 1 (only leadA1)", contributing)
	}
}

// TestSubtreeIsolation_GetSubordinatesCompliance_General: genA compliance only shows leadA1.
func TestSubtreeIsolation_GetSubordinatesCompliance_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	isoWeek := "2026-W02"
	// Seed compliance rows for both leaders
	seedReportCompliance(t, db, f.churchC, f.leadA1, isoWeek)
	seedReportCompliance(t, db, f.churchC, f.leadB1, isoWeek)
	// Also seed compliance rows for both auxiliaries (to test that L3 sees LEADERS not auxes)
	seedReportCompliance(t, db, f.churchC, f.auxA1, isoWeek)
	seedReportCompliance(t, db, f.churchC, f.auxB1, isoWeek)

	// Test the L3 branch SQL (2-hop leader subtree): church=$1, general=$2;
	// the subtree subquery reuses $1 for church and $2 for the supervisor.
	query := fmt.Sprintf(`
		SELECT
			u.id AS user_id
		FROM discipleship_hierarchy h
		JOIN users u ON u.id = h.user_id AND u.church_id = $1
		JOIN report_compliance rc ON rc.user_id = h.user_id AND rc.church_id = $1
		WHERE h.church_id = $1
		  AND h.user_id IN (%s)
		  AND rc.period_start >= (CURRENT_DATE - '16 weeks'::interval)::date
		ORDER BY u.id ASC
	`, subtreeLeaderIDsSubquery(1, 2))

	rows, err := db.Query(query, f.churchC, f.genA)
	if err != nil {
		t.Fatalf("GetSubordinatesCompliance L3 query: %v", err)
	}
	defer rows.Close()

	var gotIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan: %v", err)
		}
		gotIDs = append(gotIDs, id)
	}

	// Must contain leadA1
	if !containsStr(gotIDs, f.leadA1) {
		t.Errorf("leadA1 (%s) not found in genA compliance result", f.leadA1)
	}
	// Must NOT contain leadB1 (sibling general's subtree)
	if containsStr(gotIDs, f.leadB1) {
		t.Errorf("leadB1 (%s) should NOT appear in genA compliance result (sibling leak)", f.leadB1)
	}
	// Must NOT contain auxiliaries (L3 sees leaders, not auxes)
	if containsStr(gotIDs, f.auxA1) {
		t.Errorf("auxA1 (%s) should NOT appear — L3 compliance shows leaders (L1), not auxiliaries", f.auxA1)
	}
	if containsStr(gotIDs, f.auxB1) {
		t.Errorf("auxB1 (%s) should NOT appear in genA compliance result", f.auxB1)
	}
}

// ─── T1.6: Regression assertions ─────────────────────────────────────────────

// TestSubtreeIsolation_L2_StillSupervisorIDMe: L2 (auxA1) compliance still uses supervisor_id=me path.
func TestSubtreeIsolation_L2_StillSupervisorIDMe(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	isoWeek := "2026-W03"
	seedReportCompliance(t, db, f.churchC, f.leadA1, isoWeek)
	seedReportCompliance(t, db, f.churchC, f.leadB1, isoWeek)

	// L2 path: supervisor_id = auxA1 — should see only leadA1
	query := `
		SELECT
			u.id AS user_id
		FROM discipleship_hierarchy h
		JOIN users u ON u.id = h.user_id AND u.church_id = $1
		JOIN report_compliance rc ON rc.user_id = h.user_id AND rc.church_id = $1
		WHERE h.church_id = $1
		  AND h.supervisor_id = $2
		  AND rc.period_start >= (CURRENT_DATE - '16 weeks'::interval)::date
		ORDER BY u.id ASC
	`
	rows, err := db.Query(query, f.churchC, f.auxA1)
	if err != nil {
		t.Fatalf("L2 compliance query: %v", err)
	}
	defer rows.Close()

	var gotIDs []string
	for rows.Next() {
		var id string
		rows.Scan(&id)
		gotIDs = append(gotIDs, id)
	}

	if !containsStr(gotIDs, f.leadA1) {
		t.Errorf("L2: leadA1 should appear under auxA1")
	}
	if containsStr(gotIDs, f.leadB1) {
		t.Errorf("L2: leadB1 should NOT appear under auxA1 (different subtree)")
	}
}

// TestSubtreeIsolation_L4_SeesWholeZone: Coordinator (L4) GetZoneRollup sees both subtrees.
func TestSubtreeIsolation_L4_SeesWholeZone(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedTwoGeneralsFixture(t, db)

	seedDiscipleshipReport(t, db, f.churchC, f.leadA1, 5, 3)
	seedDiscipleshipReport(t, db, f.churchC, f.leadB1, 10, 7)

	// L4/L5 path uses zone_id = zoneZ — sees both leaders' reports
	var disc int
	err := db.QueryRow(`
		SELECT
		  COALESCE(SUM((r.report_data->>'group_discipleships')::int), 0)
		FROM discipleship_reports r
		JOIN discipleship_hierarchy h
		  ON h.user_id = r.reporter_id AND h.church_id = r.church_id
		WHERE r.church_id = $1
		  AND r.report_level = 1
		  AND r.status IN ('submitted', 'approved')
		  AND r.period_start >= $2
		  AND r.period_end <= $3
		  AND h.zone_id = $4::uuid
	`, f.churchC, "2026-01-01", "2026-01-31", f.zoneZ).Scan(&disc)
	if err != nil {
		t.Fatalf("L4 zone_id query: %v", err)
	}

	// L4 sees both: 5 + 10 = 15
	if disc != 15 {
		t.Errorf("L4 zone rollup disc = %d, want 15 (both subtrees)", disc)
	}
}
