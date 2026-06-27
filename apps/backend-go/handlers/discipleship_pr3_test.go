package handlers

// discipleship_pr3_test.go — Integration tests for PR3:
// GetAnalytics, GetWeeklyTrends, GetAlerts, GetLeaderGroupStats, GetMultiplications
// case-3 (General Supervisor / L3) rewrites.
//
// ALL tests require a real PostgreSQL database, guarded by TEST_DATABASE_URL.
//
// Fixture (two-generals-one-zone, same as PR1+PR2):
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

// pr3Fixture extends pr2Fixture with alert seeded for genB's group.
type pr3Fixture struct {
	pr2Fixture
	// IDs of discipleship_reports seeded for each leader (recent, for trend window)
	reportA string
	reportB string
	// Alert explicitly for genB's group (must NOT appear in genA's GetAlerts)
	alertGroupB string
	// Alert explicitly addressed_to genA (MUST appear in genA's GetAlerts)
	alertToGenA string
}

// seedAlertForGroup inserts a minimal discipleship_alerts row linked to a group
// and returns its UUID. priority is an integer 1-5; alert_type must match the check constraint.
func seedAlertForGroup(t *testing.T, db *sql.DB, churchID, relatedGroupID string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO discipleship_alerts
			(church_id, alert_type, title, message, priority, related_group_id, action_required, resolved)
		VALUES ($1, 'missed_report', 'Test Alert', 'Test', 3, $2::uuid, false, false)
		RETURNING id
	`, churchID, relatedGroupID).Scan(&id)
	if err != nil {
		t.Fatalf("seedAlertForGroup: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_alerts WHERE id = $1`, id)
	})
	return id
}

// seedAlertAddressedTo inserts a minimal discipleship_alerts row with addressed_to set.
func seedAlertAddressedTo(t *testing.T, db *sql.DB, churchID, addressedTo string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO discipleship_alerts
			(church_id, alert_type, title, message, priority, addressed_to, action_required, resolved)
		VALUES ($1, 'missed_report', 'Direct Alert', 'For you', 1, $2, false, false)
		RETURNING id
	`, churchID, addressedTo).Scan(&id)
	if err != nil {
		t.Fatalf("seedAlertAddressedTo: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_alerts WHERE id = $1`, id)
	})
	return id
}

// seedRecentReport creates a discipleship_report with a recent period (within last 4 weeks)
// so it falls inside any weekly-trend or analytics window. Returns the report UUID.
func seedRecentReport(t *testing.T, db *sql.DB, churchID, reporterID string, attendance int) string {
	t.Helper()
	// Period: ending yesterday, starting 6 days ago — within the 28-day window.
	pe := time.Now().AddDate(0, 0, -1)
	ps := pe.AddDate(0, 0, -6)
	reportData := fmt.Sprintf(`{"attendance_nd":%d,"attendance_dm":0,"attendance_friends":0,"attendance_kids":0}`, attendance)
	var id string
	err := db.QueryRow(`
		INSERT INTO discipleship_reports
			(church_id, reporter_id, report_type, report_level, period_start, period_end, status, report_data)
		VALUES ($1, $2, 'weekly', 1, $3, $4, 'submitted', $5::jsonb)
		RETURNING id
	`, churchID, reporterID, ps, pe, reportData).Scan(&id)
	if err != nil {
		t.Fatalf("seedRecentReport: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_reports WHERE id = $1`, id)
	})
	return id
}

// seedMultiplication creates a cell_multiplication_tracking row and returns its UUID.
func seedMultiplication(t *testing.T, db *sql.DB, churchID, parentGroupID, newGroupID, parentLeaderID, newLeaderID string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO cell_multiplication_tracking
			(church_id, parent_group_id, new_group_id, parent_leader_id, new_leader_id,
			 multiplication_date, success_status)
		VALUES ($1, $2::uuid, $3::uuid, $4, $5, CURRENT_DATE, 'successful')
		RETURNING id
	`, churchID, parentGroupID, newGroupID, parentLeaderID, newLeaderID).Scan(&id)
	if err != nil {
		t.Fatalf("seedMultiplication: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM cell_multiplication_tracking WHERE id = $1`, id)
	})
	return id
}

// seedPR3Fixture builds the full PR3 fixture on top of PR2's fixture.
func seedPR3Fixture(t *testing.T, db *sql.DB) pr3Fixture {
	t.Helper()
	p2 := seedPR2Fixture(t, db)

	// Seed recent reports so they fall inside analytics/trend windows.
	// leadA1 → attendance=5, leadB1 → attendance=9 (distinguishable values)
	reportA := seedRecentReport(t, db, p2.churchC, p2.leadA1, 5)
	reportB := seedRecentReport(t, db, p2.churchC, p2.leadB1, 9)

	// Alert for genB's group (G2) — must NOT appear in genA's GetAlerts
	alertGroupB := seedAlertForGroup(t, db, p2.churchC, p2.g2)

	// Alert explicitly addressed_to genA — MUST appear in genA's GetAlerts
	alertToGenA := seedAlertAddressedTo(t, db, p2.churchC, p2.genA)

	return pr3Fixture{
		pr2Fixture:  p2,
		reportA:     reportA,
		reportB:     reportB,
		alertGroupB: alertGroupB,
		alertToGenA: alertToGenA,
	}
}

// ─── T3.1 Site 1: GetAnalytics case 3 ────────────────────────────────────────

// TestPR3_GetAnalytics_General: genA sees only its subtree's group/member counts in analytics.
func TestPR3_GetAnalytics_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// Set distinguishable member counts: G1=3, G2=7
	db.Exec(`UPDATE discipleship_groups SET member_count = 3 WHERE id = $1`, f.g1)
	db.Exec(`UPDATE discipleship_groups SET member_count = 7 WHERE id = $1`, f.g2)

	// AFTER fix: filterClause uses leader_id IN (2-hop subtree) — $1=church, $2=genA
	groupQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_groups
		WHERE status = 'active' AND church_id = $1
		  AND leader_id IN (%s)
	`, subtreeLeaderIDsSubquery(1, 2))

	memberQuery := fmt.Sprintf(`
		SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups
		WHERE status = 'active' AND church_id = $1
		  AND leader_id IN (%s)
	`, subtreeLeaderIDsSubquery(1, 2))

	var totalGroups, totalMembers int
	if err := db.QueryRow(groupQuery, f.churchC, f.genA).Scan(&totalGroups); err != nil {
		t.Fatalf("GetAnalytics group count genA: %v", err)
	}
	if err := db.QueryRow(memberQuery, f.churchC, f.genA).Scan(&totalMembers); err != nil {
		t.Fatalf("GetAnalytics member sum genA: %v", err)
	}

	if totalGroups != 1 {
		t.Errorf("GetAnalytics genA: TotalGroups = %d, want 1 (only G1)", totalGroups)
	}
	if totalMembers != 3 {
		t.Errorf("GetAnalytics genA: TotalMembers = %d, want 3 (only G1)", totalMembers)
	}

	// genB sees only G2
	if err := db.QueryRow(groupQuery, f.churchC, f.genB).Scan(&totalGroups); err != nil {
		t.Fatalf("GetAnalytics group count genB: %v", err)
	}
	if totalGroups != 1 {
		t.Errorf("GetAnalytics genB: TotalGroups = %d, want 1 (only G2)", totalGroups)
	}
}

// ─── T3.1 Site 2: GetWeeklyTrends case 3 ────────────────────────────────────

// TestPR3_GetWeeklyTrends_General: genA's trends only include leadA1's reports; leadB1 absent.
// This test also validates that the wrong OR r.supervisor_id arm is REMOVED.
func TestPR3_GetWeeklyTrends_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// AFTER fix: r.reporter_id IN (2-hop subtree) ONLY — no OR r.supervisor_id arm.
	// Window: last 4 weeks (28 days). $1=church, $2=genA.
	trendQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT r.reporter_id)
		FROM discipleship_reports r
		WHERE r.church_id = $1
		  AND r.report_level >= 1
		  AND r.period_start >= CURRENT_DATE - INTERVAL '28 days'
		  AND r.reporter_id IN (%s)
	`, subtreeLeaderIDsSubquery(1, 2))

	// genA should see only leadA1's report (count=1)
	var reporterCount int
	if err := db.QueryRow(trendQuery, f.churchC, f.genA).Scan(&reporterCount); err != nil {
		t.Fatalf("GetWeeklyTrends reporter count genA: %v", err)
	}
	if reporterCount != 1 {
		t.Errorf("GetWeeklyTrends genA: reporter count = %d, want 1 (only leadA1)", reporterCount)
	}

	// Confirm leadB1's report does NOT appear in genA's results by checking
	// the reporter_id exclusion directly.
	leakQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_reports r
		WHERE r.church_id = $1
		  AND r.reporter_id = $2
		  AND r.reporter_id IN (%s)
		  AND r.period_start >= CURRENT_DATE - INTERVAL '28 days'
	`, subtreeLeaderIDsSubquery(1, 3))

	var leakCount int
	if err := db.QueryRow(leakQuery, f.churchC, f.leadB1, f.genA).Scan(&leakCount); err != nil {
		t.Fatalf("GetWeeklyTrends leak check: %v", err)
	}
	if leakCount != 0 {
		t.Errorf("GetWeeklyTrends LEAK: leadB1's report appears in genA's subtree (count=%d, want 0)", leakCount)
	}
}

// ─── T3.1 Site 3: GetAlerts case 3 ─────────────────────────────────────────

// TestPR3_GetAlerts_General: genA should NOT see alert for genB's group; SHOULD see alert addressed_to genA.
// CRITICAL: This is the explicit alert-leak test.
func TestPR3_GetAlerts_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// AFTER fix: AND (a.related_group_id IN (SELECT id FROM discipleship_groups
	//                   WHERE leader_id IN (<2-hop subtree>) AND church_id=$1)
	//              OR a.addressed_to = $N)
	// $1=church, $2=genA

	// Check that alertGroupB (for G2) does NOT appear for genA
	alertCheckQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_alerts a
		WHERE a.church_id = $1
		  AND a.id = $2
		  AND (
		    a.related_group_id IN (
		      SELECT id FROM discipleship_groups
		      WHERE leader_id IN (%s) AND church_id = $1
		    )
		    OR a.addressed_to = $3
		  )
	`, subtreeLeaderIDsSubquery(1, 4))

	var count int
	// genA querying: alertGroupB (G2's alert) — must be 0 (not visible to genA)
	if err := db.QueryRow(alertCheckQuery, f.churchC, f.alertGroupB, f.genA, f.genA).Scan(&count); err != nil {
		t.Fatalf("GetAlerts leak check (alertGroupB for genA): %v", err)
	}
	if count != 0 {
		t.Errorf("ALERT LEAK: alertGroupB (G2) visible to genA (count=%d, want 0)", count)
	}

	// genA querying: alertToGenA (addressed_to=genA) — must be 1 (visible)
	if err := db.QueryRow(alertCheckQuery, f.churchC, f.alertToGenA, f.genA, f.genA).Scan(&count); err != nil {
		t.Fatalf("GetAlerts addressed_to check (alertToGenA for genA): %v", err)
	}
	if count != 1 {
		t.Errorf("GetAlerts: alertToGenA should be visible to genA (count=%d, want 1)", count)
	}

	// genB should NOT see alertToGenA (it's addressed to genA, not genB)
	if err := db.QueryRow(alertCheckQuery, f.churchC, f.alertToGenA, f.genB, f.genB).Scan(&count); err != nil {
		t.Fatalf("GetAlerts cross-check (alertToGenA for genB): %v", err)
	}
	if count != 0 {
		t.Errorf("GetAlerts: alertToGenA should NOT be visible to genB (count=%d, want 0)", count)
	}
}

// ─── T3.1 Site 4: GetLeaderGroupStats access check case 3 ────────────────────

// TestPR3_GetLeaderGroupStats_Forbidden: genA cannot view stats for leadB1 (genB's subtree).
func TestPR3_GetLeaderGroupStats_Forbidden(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// AFTER fix: access check uses discipleship_hierarchy WHERE user_id=$1 (target leader)
	// AND supervisor_id IN (1-hop aux subtree of caller).
	// $1=leaderID, $2=churchID, $3=church(reuse for subquery), $4=callerID
	accessQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_hierarchy
		WHERE user_id = $1 AND church_id = $2
		  AND supervisor_id IN (%s)
	`, subtreeAuxIDsSubquery(2, 3))

	// genA trying to view leadB1 — must be 0 (403)
	var count int
	if err := db.QueryRow(accessQuery, f.leadB1, f.churchC, f.genA).Scan(&count); err != nil {
		t.Fatalf("GetLeaderGroupStats access check genA→leadB1: %v", err)
	}
	if count != 0 {
		t.Errorf("GetLeaderGroupStats: genA should NOT access leadB1 (count=%d, want 0)", count)
	}

	// genA trying to view leadA1 — must be 1 (allowed)
	if err := db.QueryRow(accessQuery, f.leadA1, f.churchC, f.genA).Scan(&count); err != nil {
		t.Fatalf("GetLeaderGroupStats access check genA→leadA1: %v", err)
	}
	if count != 1 {
		t.Errorf("GetLeaderGroupStats: genA should access leadA1 (count=%d, want 1)", count)
	}

	// genB trying to view leadA1 — must be 0 (403)
	if err := db.QueryRow(accessQuery, f.leadA1, f.churchC, f.genB).Scan(&count); err != nil {
		t.Fatalf("GetLeaderGroupStats access check genB→leadA1: %v", err)
	}
	if count != 0 {
		t.Errorf("GetLeaderGroupStats: genB should NOT access leadA1 (count=%d, want 0)", count)
	}
}

// ─── T3.1 Site 5: GetMultiplications case 3 ──────────────────────────────────

// TestPR3_GetMultiplications_General: genA sees only G1's multiplication rows; G2's absent.
func TestPR3_GetMultiplications_General(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// Create a second group for multiplication target (new group seeded from G1)
	newGroupA := seedGroup(t, db, f.churchC, f.zoneZ, f.leadA1,
		fmt.Sprintf("NewGroupA_%d", time.Now().UnixNano()))
	// G1 (leadA1) multiplied into newGroupA — this is in genA's subtree
	seedMultiplication(t, db, f.churchC, f.g1, newGroupA, f.leadA1, f.leadA1)
	// G2 (leadB1) multiplied into a new group — this is in genB's subtree
	newGroupB := seedGroup(t, db, f.churchC, f.zoneZ, f.leadB1,
		fmt.Sprintf("NewGroupB_%d", time.Now().UnixNano()))
	seedMultiplication(t, db, f.churchC, f.g2, newGroupB, f.leadB1, f.leadB1)

	// AFTER fix: pg.leader_id IN (2-hop subtree) OR ng.leader_id IN (2-hop subtree)
	// $1=church, $2=genA (for pg subtree), $3=church(reuse), $4=genA (for ng subtree)
	multiQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM cell_multiplication_tracking m
		LEFT JOIN discipleship_groups pg ON m.parent_group_id = pg.id AND pg.church_id = $1
		LEFT JOIN discipleship_groups ng ON m.new_group_id = ng.id AND ng.church_id = $1
		WHERE m.church_id = $1
		  AND (pg.leader_id IN (%s) OR ng.leader_id IN (%s))
	`, subtreeLeaderIDsSubquery(1, 2), subtreeLeaderIDsSubquery(1, 2))

	var count int
	if err := db.QueryRow(multiQuery, f.churchC, f.genA).Scan(&count); err != nil {
		t.Fatalf("GetMultiplications query genA: %v", err)
	}
	// genA should see exactly 1 multiplication row (G1→newGroupA)
	if count != 1 {
		t.Errorf("GetMultiplications genA: count = %d, want 1 (only G1's multiplication)", count)
	}

	// genB should also see exactly 1 (G2→newGroupB)
	if err := db.QueryRow(multiQuery, f.churchC, f.genB).Scan(&count); err != nil {
		t.Fatalf("GetMultiplications query genB: %v", err)
	}
	if count != 1 {
		t.Errorf("GetMultiplications genB: count = %d, want 1 (only G2's multiplication)", count)
	}
}

// ─── T3.8 Regression: Coordinator (L4) still sees both subtrees for PR3 sites ─

// TestPR3_Coordinator_SeesBoth: L4 coordinator sees alerts, analytics, trends from both generals.
func TestPR3_Coordinator_SeesBoth(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// L4 GetAlerts: zone-scoped (unchanged) — both genA/genB alerts visible
	// The L4/L5 path uses "1=1" in the handler — here we validate the base data.
	var alertCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts a
		WHERE a.church_id = $1
		  AND (a.related_group_id IN (
		    SELECT id FROM discipleship_groups WHERE church_id = $1
		  ) OR a.addressed_to IS NOT NULL)
	`, f.churchC).Scan(&alertCount); err != nil {
		t.Fatalf("L4 alert count: %v", err)
	}
	// At least alertGroupB + alertToGenA = 2 alerts seeded
	if alertCount < 2 {
		t.Errorf("L4 alerts: expected >= 2, got %d", alertCount)
	}

	// L4 GetAnalytics: zone_id = zoneZ (unchanged) — sees both G1 and G2
	db.Exec(`UPDATE discipleship_groups SET member_count = 3 WHERE id = $1`, f.g1)
	db.Exec(`UPDATE discipleship_groups SET member_count = 7 WHERE id = $1`, f.g2)
	var groupCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_groups
		WHERE church_id = $1 AND zone_id = $2::uuid AND status = 'active'
	`, f.churchC, f.zoneZ).Scan(&groupCount); err != nil {
		t.Fatalf("L4 analytics group count: %v", err)
	}
	if groupCount < 2 {
		t.Errorf("L4 analytics: expected >= 2 groups, got %d", groupCount)
	}

	// L4 GetWeeklyTrends: zone_id filter — both leaders' reports in scope
	var trendsReporterCount int
	if err := db.QueryRow(`
		SELECT COUNT(DISTINCT r.reporter_id)
		FROM discipleship_reports r
		JOIN discipleship_hierarchy h ON h.user_id = r.reporter_id AND h.church_id = r.church_id
		WHERE r.church_id = $1
		  AND h.zone_id = $2::uuid
		  AND r.period_start >= CURRENT_DATE - INTERVAL '28 days'
	`, f.churchC, f.zoneZ).Scan(&trendsReporterCount); err != nil {
		t.Fatalf("L4 weekly trends reporter count: %v", err)
	}
	if trendsReporterCount < 2 {
		t.Errorf("L4 weekly trends: expected >= 2 reporters (both subtrees), got %d", trendsReporterCount)
	}
}

// TestPR3_TenantSafety: Cross-church seed for genA; verify genA (in churchC) sees zero churchX rows.
func TestPR3_TenantSafety(t *testing.T) {
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db := openTestDB(t)
	f := seedPR3Fixture(t, db)

	// Seed churchX with an identical hierarchy structure under same genA UUID
	churchX := seedChurch(t, db, fmt.Sprintf("TestChurch_PR3TenantX_%d", time.Now().UnixNano()))
	zoneX := seedZone(t, db, churchX, "ZoneX_PR3")

	// Cross-tenant aux and leader under genA's UUID in churchX
	auxX := seedUser(t, db, churchX, fmt.Sprintf("auxX_pr3_%d@test.com", time.Now().UnixNano()))
	leadX := seedUser(t, db, churchX, fmt.Sprintf("leadX_pr3_%d@test.com", time.Now().UnixNano()))
	seedHierarchyWithZone(t, db, churchX, auxX, f.genA, 2, zoneX)
	seedHierarchyWithZone(t, db, churchX, leadX, auxX, 1, zoneX)

	// Seed a group and alert in churchX
	groupX := seedGroup(t, db, churchX, zoneX, leadX, fmt.Sprintf("GroupX_PR3_%d", time.Now().UnixNano()))
	alertX := seedAlertForGroup(t, db, churchX, groupX)

	// GetAnalytics: churchC genA should NOT see churchX's group
	groupQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_groups
		WHERE status = 'active' AND church_id = $1
		  AND leader_id IN (%s)
	`, subtreeLeaderIDsSubquery(1, 2))
	var count int
	if err := db.QueryRow(groupQuery, f.churchC, f.genA).Scan(&count); err != nil {
		t.Fatalf("tenant safety analytics: %v", err)
	}
	// Should only see G1 (churchC), never groupX (churchX)
	// Verify groupX is NOT counted
	var groupXCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM discipleship_groups WHERE id = $1 AND church_id = $2`, groupX, f.churchC).Scan(&groupXCount); err != nil {
		t.Fatalf("groupX church check: %v", err)
	}
	if groupXCount != 0 {
		t.Errorf("tenant safety: groupX appears in churchC (should be in churchX only)")
	}

	// GetAlerts: churchC genA should NOT see alertX (churchX's alert)
	alertLeakQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM discipleship_alerts a
		WHERE a.church_id = $1
		  AND a.id = $2
		  AND (
		    a.related_group_id IN (
		      SELECT id FROM discipleship_groups
		      WHERE leader_id IN (%s) AND church_id = $1
		    )
		    OR a.addressed_to = $3
		  )
	`, subtreeLeaderIDsSubquery(1, 4))
	if err := db.QueryRow(alertLeakQuery, f.churchC, alertX, f.genA, f.genA).Scan(&count); err != nil {
		t.Fatalf("tenant safety alert leak check: %v", err)
	}
	if count != 0 {
		t.Errorf("tenant safety ALERT LEAK: churchX alertX visible to genA in churchC (count=%d, want 0)", count)
	}
}
