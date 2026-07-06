package handlers

// compliance_test.go — Integration tests for the compliance sweep and write-through.
//
// ALL tests here require a real PostgreSQL database. They are guarded with:
//   if os.Getenv("TEST_DATABASE_URL") == "" { t.Skip(...) }
//
// so `go test ./handlers/...` passes cleanly in CI without a DB.
// To run locally:
//   TEST_DATABASE_URL="postgres://postgres:password@localhost:5432/postgres?sslmode=disable" \
//     go test ./handlers/... -v -run TestCompliance

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// openTestDB opens a *sql.DB from TEST_DATABASE_URL.
// Returns (nil, skip-message) when the env var is absent.
func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping DB integration test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("db.Ping: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// seedChurch creates a minimal church row and returns its UUID.
// Cleaned up via t.Cleanup.
func seedChurch(t *testing.T, db *sql.DB, name string) string {
	t.Helper()
	var id string
	err := db.QueryRow(
		`INSERT INTO churches (name) VALUES ($1) RETURNING id`, name,
	).Scan(&id)
	if err != nil {
		t.Fatalf("seedChurch %q: %v", name, err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM discipleship_alerts   WHERE church_id = $1`, id)
		db.Exec(`DELETE FROM report_compliance     WHERE church_id = $1`, id)
		db.Exec(`DELETE FROM discipleship_reports  WHERE church_id = $1`, id)
		db.Exec(`DELETE FROM discipleship_hierarchy WHERE church_id = $1`, id)
		db.Exec(`DELETE FROM users                 WHERE church_id = $1`, id)
		db.Exec(`DELETE FROM churches              WHERE id = $1`, id)
	})
	return id
}

// seedUser creates a minimal active user and returns their UUID.
func seedUser(t *testing.T, db *sql.DB, churchID string, email string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO users (email, church_id, role, is_active, id_number, first_name, last_name, phone, address)
		VALUES ($1, $2, 'server', true, $3, 'Test', 'User', '000', 'n/a')
		RETURNING id
	`, email, churchID, email).Scan(&id)
	if err != nil {
		t.Fatalf("seedUser %q: %v", email, err)
	}
	return id
}

// seedHierarchy inserts a discipleship_hierarchy row.
func seedHierarchy(t *testing.T, db *sql.DB, churchID, userID, supervisorID string, level int) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO discipleship_hierarchy (church_id, user_id, supervisor_id, hierarchy_level)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING
	`, churchID, userID, supervisorID, level)
	if err != nil {
		t.Fatalf("seedHierarchy: %v", err)
	}
}

// seedNullSupervisorHierarchy inserts a hierarchy row without a supervisor.
func seedNullSupervisorHierarchy(t *testing.T, db *sql.DB, churchID, userID string, level int) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO discipleship_hierarchy (church_id, user_id, supervisor_id, hierarchy_level)
		VALUES ($1, $2, NULL, $3)
		ON CONFLICT DO NOTHING
	`, churchID, userID, level)
	if err != nil {
		t.Fatalf("seedNullSupervisorHierarchy: %v", err)
	}
}

// countAlerts returns the count of alerts of the given type for (church, user) combinations.
func countAlerts(t *testing.T, db *sql.DB, churchID, alertType string) int {
	t.Helper()
	var n int
	db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts
		WHERE church_id = $1 AND alert_type = $2
	`, churchID, alertType).Scan(&n)
	return n
}

// complianceStatus returns the status field for (church, user, isoWeek).
func complianceStatus(t *testing.T, db *sql.DB, churchID, userID, isoWeek string) string {
	t.Helper()
	var s string
	err := db.QueryRow(`
		SELECT status FROM report_compliance
		WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
	`, churchID, userID, isoWeek).Scan(&s)
	if err == sql.ErrNoRows {
		return ""
	}
	if err != nil {
		t.Fatalf("complianceStatus: %v", err)
	}
	return s
}

// complianceMissedCount returns the missed_count for (church, user, isoWeek).
func complianceMissedCount(t *testing.T, db *sql.DB, churchID, userID, isoWeek string) int {
	t.Helper()
	var n int
	db.QueryRow(`
		SELECT missed_count FROM report_compliance
		WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
	`, churchID, userID, isoWeek).Scan(&n)
	return n
}

// ─── DB integration tests (skipped without TEST_DATABASE_URL) ─────────────────

// TestComplianceMissedToLateTransition — spec R3 scenario "Late submission".
//
// Seed a compliance row with status=missed (as the sweep would create).
// Then simulate CreateReport write-through by running the write-through SQL directly.
// Assert: status flips to late, missed_count decrements, escalation_sent unchanged.
func TestComplianceMissedToLateTransition(t *testing.T) {
	db := openTestDB(t)

	churchID := seedChurch(t, db, "TestChurch_MissedLate")
	supID := seedUser(t, db, churchID, fmt.Sprintf("sup_%d@test.com", time.Now().UnixNano()))
	userID := seedUser(t, db, churchID, fmt.Sprintf("user_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchID, userID, supID, 1)

	week := "2026-W10"
	monday := time.Date(2026, 3, 2, 0, 0, 0, 0, time.UTC)
	saturday := monday.AddDate(0, 0, 5)

	// Seed three missed weeks so escalation_sent=true on week W10.
	for i, w := range []string{"2026-W08", "2026-W09", "2026-W10"} {
		wMon := monday.AddDate(0, 0, -(2-i)*7)
		wSat := wMon.AddDate(0, 0, 5)
		_, err := db.Exec(`
			INSERT INTO report_compliance
				(church_id, user_id, iso_week, period_start, period_end, due_date,
				 status, missed_count, escalation_sent, notified_failer)
			VALUES ($1, $2, $3, $4, $5, $5, 'missed', 3, true, true)
		`, churchID, userID, w, wMon, wSat)
		if err != nil {
			t.Fatalf("seeding compliance row %s: %v", w, err)
		}
	}

	// Now simulate write-through: user submits AFTER Saturday (so status=late).
	submitStatus := "late"
	_, err := db.Exec(`
		INSERT INTO report_compliance
			(church_id, user_id, iso_week, period_start, period_end, due_date, status, report_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, gen_random_uuid())
		ON CONFLICT (church_id, user_id, iso_week) DO UPDATE
		SET
			status = CASE
				WHEN report_compliance.status = 'missed'             THEN $7
				WHEN report_compliance.status IN ('on_time', 'late') THEN report_compliance.status
				ELSE $7
			END,
			report_id  = EXCLUDED.report_id,
			updated_at = now()
	`, churchID, userID, week, monday, saturday, saturday, submitStatus)
	if err != nil {
		t.Fatalf("write-through upsert: %v", err)
	}

	// Recompute missed_count.
	var missed int
	db.QueryRow(`
		SELECT COUNT(*) FROM report_compliance
		WHERE church_id = $1 AND user_id = $2 AND status = 'missed'
	`, churchID, userID).Scan(&missed)
	db.Exec(`
		UPDATE report_compliance SET missed_count = $1, updated_at = now()
		WHERE church_id = $2 AND user_id = $3
	`, missed, churchID, userID)

	// Assert: W10 flipped to late.
	if got := complianceStatus(t, db, churchID, userID, week); got != "late" {
		t.Errorf("status = %q, want late", got)
	}
	// missed_count should now be 2 (W08 and W09 remain missed; W10 → late).
	if got := complianceMissedCount(t, db, churchID, userID, week); got != 2 {
		t.Errorf("missed_count = %d, want 2", got)
	}
	// escalation_sent on W10 should remain true (historical — no re-fire).
	var escalated bool
	db.QueryRow(`
		SELECT escalation_sent FROM report_compliance
		WHERE church_id = $1 AND user_id = $2 AND iso_week = $3
	`, churchID, userID, week).Scan(&escalated)
	if !escalated {
		t.Error("escalation_sent should remain true after missed→late flip")
	}
}

// TestThreeMissedEscalationAndDedup — spec R4 "Escalation at 3 missed weeks + dedup".
//
// Run sweep for 3 distinct weeks with no report. Assert exactly 1 escalated_non_compliance
// alert. Re-run sweep for the 3rd week. Assert still exactly 1 alert.
func TestThreeMissedEscalationAndDedup(t *testing.T) {
	db := openTestDB(t)

	churchID := seedChurch(t, db, "TestChurch_Escalation")
	supID := seedUser(t, db, churchID, fmt.Sprintf("sup2_%d@test.com", time.Now().UnixNano()))
	userID := seedUser(t, db, churchID, fmt.Sprintf("user2_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchID, userID, supID, 1)

	loc := time.UTC
	// Three consecutive weeks with no report.
	weeks := []struct {
		week string
		mon  time.Time
	}{
		{"2025-W01", time.Date(2024, 12, 30, 0, 0, 0, 0, loc)},
		{"2025-W02", time.Date(2025, 1, 6, 0, 0, 0, 0, loc)},
		{"2025-W03", time.Date(2025, 1, 13, 0, 0, 0, 0, loc)},
	}

	for _, w := range weeks {
		sat := w.mon.AddDate(0, 0, 5)
		n, err := sweepChurch(db, churchID, w.mon, sat, w.week)
		if err != nil {
			t.Fatalf("sweepChurch week %s: %v", w.week, err)
		}
		t.Logf("sweepChurch(%s): created %d alerts", w.week, n)
	}

	// After 3 sweeps: exactly 1 escalated_non_compliance alert.
	got := countAlerts(t, db, churchID, "escalated_non_compliance")
	if got != 1 {
		t.Errorf("escalated_non_compliance count = %d, want 1", got)
	}

	// Re-run the 3rd week sweep → escalation_sent=true, so no new alert.
	w3 := weeks[2]
	sat3 := w3.mon.AddDate(0, 0, 5)
	sweepChurch(db, churchID, w3.mon, sat3, w3.week)

	got = countAlerts(t, db, churchID, "escalated_non_compliance")
	if got != 1 {
		t.Errorf("after re-sweep: escalated_non_compliance count = %d, want 1 (dedup failed)", got)
	}

	// Also check missed_report nudge dedup: each week should have exactly 1 alert.
	gotNudges := countAlerts(t, db, churchID, "missed_report")
	// 3 distinct weeks → 3 nudges, each deduplicated by notified_failer.
	if gotNudges != 3 {
		t.Errorf("missed_report count = %d, want 3 (one per week)", gotNudges)
	}
}

// TestFailerNudgeDedup — spec R4 "Failer nudge deduplication".
//
// Sweep week W once → 1 missed_report alert. Sweep again → still 1.
func TestFailerNudgeDedup(t *testing.T) {
	db := openTestDB(t)

	churchID := seedChurch(t, db, "TestChurch_NudgeDedup")
	supID := seedUser(t, db, churchID, fmt.Sprintf("sup3_%d@test.com", time.Now().UnixNano()))
	userID := seedUser(t, db, churchID, fmt.Sprintf("user3_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchID, userID, supID, 1)

	loc := time.UTC
	monday := time.Date(2025, 2, 3, 0, 0, 0, 0, loc) // 2025-W06
	saturday := monday.AddDate(0, 0, 5)
	week := "2025-W06"

	sweepChurch(db, churchID, monday, saturday, week)

	if n := countAlerts(t, db, churchID, "missed_report"); n != 1 {
		t.Fatalf("first sweep: missed_report count = %d, want 1", n)
	}

	// Re-sweep → notified_failer=true → no new alert.
	sweepChurch(db, churchID, monday, saturday, week)

	if n := countAlerts(t, db, churchID, "missed_report"); n != 1 {
		t.Errorf("re-sweep: missed_report count = %d, want 1 (dedup failed)", n)
	}
}

// TestPerChurchIsolation — spec R5 "Per-Church Sweep Isolation".
//
// Two churches, each with one failing user. runComplianceSweep should produce
// compliance rows and alerts scoped exclusively to their own church.
func TestPerChurchIsolation(t *testing.T) {
	db := openTestDB(t)

	churchA := seedChurch(t, db, "TestChurchA_Isolation")
	churchB := seedChurch(t, db, "TestChurchB_Isolation")

	supA := seedUser(t, db, churchA, fmt.Sprintf("supA_%d@test.com", time.Now().UnixNano()))
	userA := seedUser(t, db, churchA, fmt.Sprintf("userA_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchA, userA, supA, 1)

	supB := seedUser(t, db, churchB, fmt.Sprintf("supB_%d@test.com", time.Now().UnixNano()))
	userB := seedUser(t, db, churchB, fmt.Sprintf("userB_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchB, userB, supB, 1)

	loc := time.UTC
	// Use a unique past week to avoid colliding with other tests.
	monday := time.Date(2025, 3, 3, 0, 0, 0, 0, loc) // 2025-W10
	saturday := monday.AddDate(0, 0, 5)
	week := "2025-W10"

	// Sweep both churches.
	sweepChurch(db, churchA, monday, saturday, week)
	sweepChurch(db, churchB, monday, saturday, week)

	// All compliance rows for churchA must have church_id=A.
	var crossCount int
	db.QueryRow(`
		SELECT COUNT(*) FROM report_compliance
		WHERE church_id = $1 AND user_id = $2
	`, churchB, userA).Scan(&crossCount)
	if crossCount > 0 {
		t.Errorf("church A user found in church B compliance rows: count=%d", crossCount)
	}

	db.QueryRow(`
		SELECT COUNT(*) FROM report_compliance
		WHERE church_id = $1 AND user_id = $2
	`, churchA, userB).Scan(&crossCount)
	if crossCount > 0 {
		t.Errorf("church B user found in church A compliance rows: count=%d", crossCount)
	}

	// All alerts for churchA must have church_id=A.
	db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts
		WHERE church_id = $1 AND (related_user_id = $2 OR addressed_to = $2)
	`, churchB, userA).Scan(&crossCount)
	if crossCount > 0 {
		t.Errorf("church A user found in church B alerts: count=%d", crossCount)
	}

	db.QueryRow(`
		SELECT COUNT(*) FROM discipleship_alerts
		WHERE church_id = $1 AND (related_user_id = $2 OR addressed_to = $2)
	`, churchA, userB).Scan(&crossCount)
	if crossCount > 0 {
		t.Errorf("church B user found in church A alerts: count=%d", crossCount)
	}
}

// TestIdempotentSweep — spec R3 "Sweep idempotency".
//
// Sweep week W twice. Assert: row count unchanged, alert count unchanged,
// missed_count stable.
func TestIdempotentSweep(t *testing.T) {
	db := openTestDB(t)

	churchID := seedChurch(t, db, "TestChurch_Idempotent")
	supID := seedUser(t, db, churchID, fmt.Sprintf("sup5_%d@test.com", time.Now().UnixNano()))
	userID := seedUser(t, db, churchID, fmt.Sprintf("user5_%d@test.com", time.Now().UnixNano()))
	seedHierarchy(t, db, churchID, userID, supID, 1)

	loc := time.UTC
	monday := time.Date(2025, 4, 7, 0, 0, 0, 0, loc) // 2025-W15
	saturday := monday.AddDate(0, 0, 5)
	week := "2025-W15"

	sweepChurch(db, churchID, monday, saturday, week)

	// Snapshot counts after first sweep.
	var rowCount1, alertCount1, missedCount1 int
	db.QueryRow(`SELECT COUNT(*) FROM report_compliance WHERE church_id = $1 AND iso_week = $2`, churchID, week).Scan(&rowCount1)
	db.QueryRow(`SELECT COUNT(*) FROM discipleship_alerts WHERE church_id = $1`, churchID).Scan(&alertCount1)
	db.QueryRow(`SELECT missed_count FROM report_compliance WHERE church_id = $1 AND user_id = $2 AND iso_week = $3`, churchID, userID, week).Scan(&missedCount1)

	// Second sweep.
	sweepChurch(db, churchID, monday, saturday, week)

	var rowCount2, alertCount2, missedCount2 int
	db.QueryRow(`SELECT COUNT(*) FROM report_compliance WHERE church_id = $1 AND iso_week = $2`, churchID, week).Scan(&rowCount2)
	db.QueryRow(`SELECT COUNT(*) FROM discipleship_alerts WHERE church_id = $1`, churchID).Scan(&alertCount2)
	db.QueryRow(`SELECT missed_count FROM report_compliance WHERE church_id = $1 AND user_id = $2 AND iso_week = $3`, churchID, userID, week).Scan(&missedCount2)

	if rowCount1 != rowCount2 {
		t.Errorf("compliance row count changed: %d → %d (not idempotent)", rowCount1, rowCount2)
	}
	if alertCount1 != alertCount2 {
		t.Errorf("alert count changed: %d → %d (not idempotent)", alertCount1, alertCount2)
	}
	if missedCount1 != missedCount2 {
		t.Errorf("missed_count changed: %d → %d (not idempotent)", missedCount1, missedCount2)
	}
}
