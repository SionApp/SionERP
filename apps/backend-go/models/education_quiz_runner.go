// education_quiz_runner.go - the ONLY wire shapes served to a student BEFORE
// they submit a quiz attempt (PR-F, education-quiz-runtime).
//
// Spec ref: education-quiz-runtime, "answer-leak boundary - MUST NOT be
// simplified". Design ref: sdd/education-module/design (obs #504), decision
// A7 - "Three DTO families, in two files ... models/education_quiz_runner.go
// contains ONLY pre-submit types and is asserted by test to contain zero
// occurrences of the answer-key identifiers. A leak becomes a compile
// error plus a failing grep, not a review miss."
//
// THIS FILE MUST NEVER DECLARE ANY OF THE FOLLOWING, ANYWHERE - not as a
// field, not as a json struct tag, not as omitempty, not even spelled out
// inside a comment (the enforcement test greps raw source bytes, so writing
// the literal names here to "explain the rule" would itself trip it):
//   - the boolean option-correctness flag (its Go name and its json tag)
//   - the two author-feedback-text fields (their Go names and json tags)
//   - any field that names a correct option's id directly
//
// handlers/education_quiz_leak_test.go's TestQuizRunnerModelDeclaresNoAnswerKey
// reads this exact file from disk (os.ReadFile, not reflection) and fails
// the build/test if any of those identifiers appear. See that test file for
// the enforcement mechanism and its exact forbidden-string list - a leak
// here is provably impossible, not merely discouraged.
//
// The correct-answer / feedback-text fields live exclusively in
// education_quiz.go's author-view family (author-only, level >= 3) and
// result-view family (released only after submit, and only the caller's
// own attempt). This file's structs are structurally incapable of carrying
// that data - assigning correctness onto a QuizRunnerOption is a Go compile
// error, since the field does not exist.
package models

// QuizRunnerView is the ONLY shape returned before submit (GetQuizRunner /
// StartAttempt). AttemptID/AttemptNumber are empty/zero when the caller has
// no open attempt yet (GetQuizRunner called before StartAttempt).
type QuizRunnerView struct {
	ID               string               `json:"id"`
	LessonID         string               `json:"lesson_id"`
	AttemptID        string               `json:"attempt_id"`
	AttemptNumber    int                  `json:"attempt_number"`
	AttemptsLeft     int                  `json:"attempts_left"`
	TimeLimitMinutes *int                 `json:"time_limit_minutes"`
	ExpiresAt        *string              `json:"expires_at"`
	ShowResult       bool                 `json:"show_result"`
	MaxScore         int                  `json:"max_score"`
	Questions        []QuizRunnerQuestion `json:"questions"`
}

// QuizRunnerQuestion carries only what a student needs to ANSWER a
// question - never why an answer would be right or wrong. Selected/Draft
// reflect the CALLER's OWN previously-saved draft only (self-only by
// construction in the handler's query, never another student's).
type QuizRunnerQuestion struct {
	ID       string             `json:"id"`
	Position int                `json:"position"`
	Type     string             `json:"type"` // multiple | true_false | short
	Prompt   string             `json:"prompt"`
	Points   int                `json:"points"`
	Selected *string            `json:"selected_option_id"` // the caller's own draft
	Draft    *string            `json:"text_answer"`        // the caller's own draft
	Options  []QuizRunnerOption `json:"options"`            // empty for `short`
}

// QuizRunnerOption carries only an id and display text. Display ORDER is
// never derived from this struct's slice-construction order alone without
// having first been permuted according to the attempt's own persisted
// option-order map (design decision A5/A6) - the runner SQL that populates
// this struct never selects the options table's own order column at all,
// closing the "author listed the correct answer first" side channel.
type QuizRunnerOption struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}
