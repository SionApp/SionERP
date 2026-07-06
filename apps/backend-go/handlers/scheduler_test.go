package handlers

import (
	"testing"
	"time"
)

// ─── isoWeek pure-function tests (no DB required) ────────────────────────────

// TestISOWeekLabel verifies that isoWeek() matches Go stdlib time.ISOWeek()
// for the W52/W53/W01 year-boundary dates — the canonical regression suite for
// spec R6 (Frontend/Backend ISO Week Parity).
//
// These dates are intentionally chosen to exercise the Jan4 rule:
//   2020-12-28 (Mon) → 2020-W53   (last week of 2020 is W53)
//   2021-01-04 (Mon) → 2021-W01   (first Mon of 2021 in its own year)
//   2025-12-29 (Mon) → 2026-W01   (Mon after Tue 2025-12-30; Jan 4 2026 is in this week)
//   2026-01-01 (Thu) → 2026-W01   (same week as 2025-12-29)
func TestISOWeekLabel(t *testing.T) {
	cases := []struct {
		date string
		want string
	}{
		{"2020-12-28", "2020-W53"},
		{"2021-01-04", "2021-W01"},
		{"2025-12-29", "2026-W01"},
		{"2026-01-01", "2026-W01"},
	}

	for _, tc := range cases {
		t.Run(tc.date, func(t *testing.T) {
			parsed, err := time.Parse("2006-01-02", tc.date)
			if err != nil {
				t.Fatalf("cannot parse date %q: %v", tc.date, err)
			}
			got := isoWeek(parsed)
			if got != tc.want {
				t.Errorf("isoWeek(%s) = %q, want %q", tc.date, got, tc.want)
			}
		})
	}
}

// TestNextSaturdayAt23 verifies the scheduler fires at the right time.
func TestNextSaturdayAt23(t *testing.T) {
	loc := time.UTC

	cases := []struct {
		name    string
		from    time.Time
		wantDay time.Weekday
		wantH   int
		wantM   int
	}{
		{
			name:    "Wednesday → next Saturday 23:00",
			from:    time.Date(2026, 6, 24, 10, 0, 0, 0, loc), // Wednesday
			wantDay: time.Saturday,
			wantH:   23,
			wantM:   0,
		},
		{
			name:    "Saturday before 23:00 → same day 23:00",
			from:    time.Date(2026, 6, 27, 22, 0, 0, 0, loc), // Saturday 22:00
			wantDay: time.Saturday,
			wantH:   23,
			wantM:   0,
		},
		{
			name:    "Saturday after 23:01 → next Saturday",
			from:    time.Date(2026, 6, 27, 23, 30, 0, 0, loc), // Saturday 23:30
			wantDay: time.Saturday,
			wantH:   23,
			wantM:   0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := nextSaturdayAt23(tc.from)
			if got.Weekday() != tc.wantDay {
				t.Errorf("weekday = %v, want %v", got.Weekday(), tc.wantDay)
			}
			if got.Hour() != tc.wantH || got.Minute() != tc.wantM {
				t.Errorf("time = %02d:%02d, want %02d:%02d", got.Hour(), got.Minute(), tc.wantH, tc.wantM)
			}
			// "next Saturday after 23:01" must be 7 days later, not the same day.
			if tc.name == "Saturday after 23:01 → next Saturday" {
				diff := got.Sub(tc.from)
				if diff < 6*24*time.Hour {
					t.Errorf("expected next week Saturday, got diff=%v", diff)
				}
			}
		})
	}
}

// TestJustEndedWeekBounds verifies Mon..Sat derivation for a known input.
func TestJustEndedWeekBounds(t *testing.T) {
	loc := time.UTC
	// Fire on Saturday 2026-06-27 at 23:00.
	now := time.Date(2026, 6, 27, 23, 0, 0, 0, loc)
	monday, saturday, week := justEndedWeekBounds(now)

	wantMonday := "2026-06-22"
	wantSaturday := "2026-06-27"
	wantWeek := "2026-W26"

	if monday.Format("2006-01-02") != wantMonday {
		t.Errorf("monday = %s, want %s", monday.Format("2006-01-02"), wantMonday)
	}
	if saturday.Format("2006-01-02") != wantSaturday {
		t.Errorf("saturday = %s, want %s", saturday.Format("2006-01-02"), wantSaturday)
	}
	if week != wantWeek {
		t.Errorf("week = %s, want %s", week, wantWeek)
	}
}

// TestIsoWeekFromDateStr verifies the parse-and-derive helper used by the write-through.
func TestIsoWeekFromDateStr(t *testing.T) {
	isoW, monday, saturday, dueDate, err := isoWeekFromDateStr("2026-06-24")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if isoW != "2026-W26" {
		t.Errorf("isoW = %q, want 2026-W26", isoW)
	}
	if monday.Format("2006-01-02") != "2026-06-22" {
		t.Errorf("monday = %s, want 2026-06-22", monday.Format("2006-01-02"))
	}
	if saturday.Format("2006-01-02") != "2026-06-27" {
		t.Errorf("saturday = %s, want 2026-06-27", saturday.Format("2006-01-02"))
	}
	if dueDate.Format("2006-01-02") != "2026-06-27" {
		t.Errorf("dueDate = %s, want 2026-06-27", dueDate.Format("2006-01-02"))
	}

	_, _, _, _, err2 := isoWeekFromDateStr("not-a-date")
	if err2 == nil {
		t.Error("expected error for invalid date, got nil")
	}
}
