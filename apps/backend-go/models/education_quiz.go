package models

// education_quiz.go — the AUTHOR-only and RESULT-only wire shapes (PR-F,
// design decision A7: "Three DTO families, in two files"). Author types
// carry the full answer key and are served ONLY by the author route
// (level >= 3, education_quiz_admin.go). Result types are released ONLY
// after a caller's own attempt is submitted (education_quiz_runner.go's
// GetAttemptResult/SubmitAttempt) — a third, distinct shape, never the
// runner view and never the raw author view.
//
// The pre-submit runner types live in the SEPARATE
// models/education_quiz_runner.go, which must never import or reference
// anything declared here.

// QuizAuthorView is the full quiz shape returned to an author (level >= 3)
// — the only place the answer key and feedback text are ever served.
type QuizAuthorView struct {
	ID               string               `json:"id"`
	LessonID         string               `json:"lesson_id"`
	PassScore        int                  `json:"pass_score"`
	TimeLimitMinutes *int                 `json:"time_limit_minutes"`
	ShuffleOptions   bool                 `json:"shuffle_options"`
	AllowRetry       bool                 `json:"allow_retry"`
	ShowResult       bool                 `json:"show_result"`
	Questions        []QuizAuthorQuestion `json:"questions"`
}

// QuizAuthorQuestion carries feedback_ok/feedback_bad and each option's
// correctness — author-only. AnswerCount powers the ?force=true guard on
// question deletion (handlers.DeleteQuestion).
type QuizAuthorQuestion struct {
	ID          string             `json:"id"`
	OrderIndex  int                `json:"order_index"`
	Type        string             `json:"type"`
	Prompt      string             `json:"prompt"`
	Points      int                `json:"points"`
	FeedbackOk  *string            `json:"feedback_ok"`
	FeedbackBad *string            `json:"feedback_bad"`
	AnswerCount int                `json:"answer_count"`
	Options     []QuizAuthorOption `json:"options"`
}

// QuizAuthorOption is the only struct in this codebase that carries the raw
// correctness flag as a JSON field — author-only, never reachable from any
// student-facing route.
type QuizAuthorOption struct {
	ID         string `json:"id"`
	OrderIndex int    `json:"order_index"`
	Text       string `json:"text"`
	IsCorrect  bool   `json:"is_correct"`
}

// QuizResultView is released ONLY after the caller's own attempt is
// submitted (GetAttemptResult / SubmitAttempt's response). Passed is nil
// while ReviewPending is true (a short-answer question is awaiting manual
// grading, so the final pass/fail verdict isn't decided yet). Questions is
// nil entirely when the quiz's show_result=false — the Go handler nils the
// slice before serializing, it does not merely omit fields client-side.
type QuizResultView struct {
	AttemptID     string               `json:"attempt_id"`
	AttemptNumber int                  `json:"attempt_number"`
	AutoScore     int                  `json:"auto_score"`
	MaxScore      int                  `json:"max_score"`
	PassScore     int                  `json:"pass_score"`
	Passed        *bool                `json:"passed"`
	ReviewPending bool                 `json:"review_pending"`
	CanRetry      bool                 `json:"can_retry"`
	NextLessonID  *string              `json:"next_lesson_id"`
	Questions     []QuizResultQuestion `json:"questions"`
}

// QuizResultQuestion is the per-question post-submit review shape — a
// third, distinct DTO from both QuizRunnerQuestion (pre-submit, no verdict)
// and QuizAuthorQuestion (author-only, no per-student "your answer"
// fields). CorrectText is nil unless Verdict == "incorrect" (never reveal
// the right answer for a question the student already got right — nothing
// to add — or one still in_review).
type QuizResultQuestion struct {
	ID             string  `json:"id"`
	Prompt         string  `json:"prompt"`
	Verdict        string  `json:"verdict"` // correct | incorrect | in_review
	YourOptionText *string `json:"your_option_text"`
	YourTextAnswer *string `json:"your_text_answer"`
	CorrectText    *string `json:"correct_text"`
	Feedback       *string `json:"feedback"`
}
