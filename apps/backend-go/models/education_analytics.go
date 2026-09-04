package models

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS + REVIEW QUEUE (PR-K, education-manual-review / education-
// assignments DELTA) — admin roster, per-lesson funnel, CSV export.
//
// RosterStatus adds two derived values (`in_review`, `inactive`) on top of
// the 4 statuses `deriveAssignmentStatusSQL` (education_assignments.go)
// already produces. Unlike that shared CASE expression, roster status is
// computed in Go (handlers/education_analytics.go's deriveRosterStatus) —
// deliberately NOT folded into one giant SQL CASE, because the `in_review`
// branch needs an EXISTS subquery against education_quiz_attempts and the
// `inactive` branch needs a MAX(updated_at) comparison against wall-clock
// time; both are already available as plain columns/booleans selected by
// the roster query, so the precedence itself is a straightforward Go
// switch — easier to unit-test in isolation than a nested SQL CASE.
// ─────────────────────────────────────────────────────────────────────────────

// RosterStudent is one row of the admin student-progress roster for a single
// curriculum (GET /education/curricula/:id/roster).
type RosterStudent struct {
	AssignmentID     string  `json:"assignment_id"`
	UserID           string  `json:"user_id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Status           string  `json:"status"` // pending|in_progress|completed|overdue|in_review|inactive
	CompletedLessons int     `json:"completed_lessons"`
	TotalLessons     int     `json:"total_lessons"`
	ProgressPct      float64 `json:"progress_pct"`
	DueDate          *string `json:"due_date"`
	LastQuizScore    *int    `json:"last_quiz_score"`
	LastQuizMax      *int    `json:"last_quiz_max"`
	LastQuizVerdict  *string `json:"last_quiz_verdict"` // passed|failed|in_review, nil when no attempt yet
}

// RosterKPIs are the 4 aggregate cards `StudentProgress.tsx` renders,
// computed server-side in the SAME response as the roster (design: "avoid a
// second round trip").
type RosterKPIs struct {
	ActiveStudents int     `json:"active_students"`
	AvgProgressPct float64 `json:"avg_progress_pct"`
	QuizPassRate   float64 `json:"quiz_pass_rate"`
	InactiveCount  int     `json:"inactive_count"`
}

// StudentRosterResponse is GetStudentRoster's full payload.
type StudentRosterResponse struct {
	CurriculumID   string          `json:"curriculum_id"`
	CurriculumName string          `json:"curriculum_name"`
	Kpis           RosterKPIs      `json:"kpis"`
	Students       []RosterStudent `json:"students"`
}

// LessonFunnelPoint is one lesson's reached/completed counts, in course
// order — the raw numbers `LessonFunnel.tsx`'s drop-off chart renders.
type LessonFunnelPoint struct {
	LessonID   string `json:"lesson_id"`
	Title      string `json:"title"`
	OrderIndex int    `json:"order_index"`
	Reached    int    `json:"reached"`
	Completed  int    `json:"completed"`
}
