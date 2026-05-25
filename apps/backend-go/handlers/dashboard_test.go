package handlers

import (
	"testing"
	"time"
)

func TestFormatTimeAgo(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		t    time.Time
		want string
	}{
		{"just now (30s ago)", now.Add(-30 * time.Second), "ahora"},
		{"5 minutes ago", now.Add(-5 * time.Minute), "5 min"},
		{"59 minutes ago", now.Add(-59 * time.Minute), "59 min"},
		{"1 hour ago", now.Add(-1 * time.Hour), "1 h"},
		{"3 hours ago", now.Add(-3 * time.Hour), "3 h"},
		{"1 day ago", now.Add(-24 * time.Hour), "1 d"},
		{"2 days ago", now.Add(-48 * time.Hour), "2 d"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := formatTimeAgo(tc.t)
			if got != tc.want {
				t.Errorf("formatTimeAgo = %q; want %q", got, tc.want)
			}
		})
	}
}

func TestFormatAction(t *testing.T) {
	cases := []struct {
		name      string
		action    string
		tableName string
		want      string
	}{
		{"insert user", "INSERT", "users", "creó usuario"},
		{"insert event", "INSERT", "events", "creó evento"},
		{"insert report", "INSERT", "reports", "creó reporte"},
		{"insert goal", "INSERT", "discipleship_goals", "creó objetivo"},
		{"insert assignment", "INSERT", "goal_assignments", "creó asignación de objetivo"},
		{"insert progress", "INSERT", "goal_manual_progress", "creó progreso de objetivo"},
		{"update user", "UPDATE", "users", "actualizó usuario"},
		{"delete event", "DELETE", "events", "eliminó evento"},
		{"unknown action", "MERGE", "users", "MERGE usuario"},
		{"unknown table", "INSERT", "some_other_table", "creó some_other_table"},
		{"both unknown", "PATCH", "other", "PATCH other"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := formatAction(tc.action, tc.tableName)
			if got != tc.want {
				t.Errorf("formatAction(%q, %q) = %q; want %q",
					tc.action, tc.tableName, got, tc.want)
			}
		})
	}
}
