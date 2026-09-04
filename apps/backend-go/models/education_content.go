package models

import "encoding/json"

// EducationBlock is the wire shape of one block inside a step's `blocks`
// jsonb array — `{id,type,data}` per spec (education-content-model, "Block
// envelope and type whitelist"). Writes never go through this struct: the
// raw request bytes are validated by handlers.ValidateLessonBlocks (the
// ONLY write path into education_lesson_steps.blocks) and stored verbatim
// once proven conformant. This struct is read-side only.
type EducationBlock struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// EducationStep is the wire shape for one education_lesson_steps row.
type EducationStep struct {
	ID         string           `json:"id"`
	LessonID   string           `json:"lesson_id"`
	OrderIndex int              `json:"order_index"`
	Label      string           `json:"label"`
	Blocks     []EducationBlock `json:"blocks"`
	CreatedAt  string           `json:"created_at"`
	UpdatedAt  string           `json:"updated_at"`
}

// EducationLessonDetail is the response shape for GET /education/lessons/:id
// — lesson metadata plus its ordered steps (each with blocks). This is the
// PR-B replacement for the pre-PR-A single `content`/`attachment_*` fields:
// GetLessons (the list, PR-A) still returns lesson SHELLS only (title,
// duration, no body) for the browsable syllabus; this endpoint is the one
// that actually serves lesson content, and — per the explicit read-access
// rule for this PR — requires the caller to be an author (level >= 3) OR
// hold an assignment on the lesson's curriculum (level 1-2), not merely be
// any level-1 user in the church. A published-but-unenrolled browsing user
// sees the syllabus shell via GetLessons/GetSyllabus but not step content.
//
// Progress is a PR-E addition (design A2/A3, education-lesson-consumption
// "Resume after refresh"): the endpoint every LessonViewer mount already
// calls is the natural place to surface the caller's OWN step pointer —
// there was no other read path into education_lesson_progress.current_step_id
// / visited_step_ids at all before this. Populated only for level < 3 (self,
// when an assignment exists); nil for authors, who have no personal
// progress concept on a lesson they're not enrolled in.
type EducationLessonDetail struct {
	ID              string                          `json:"id"`
	CurriculumID    string                          `json:"curriculum_id"`
	ModuleID        *string                         `json:"module_id"`
	OrderIndex      int                             `json:"order_index"`
	Title           string                          `json:"title"`
	DurationMinutes *int                            `json:"duration_minutes"`
	Steps           []EducationStep                 `json:"steps"`
	Progress        *EducationLessonProgressPointer `json:"progress"`
}

// EducationLessonProgressPointer is the caller's own step-pointer for one
// lesson (design A2/A3: current_step_id uuid + visited_step_ids uuid[] on
// education_lesson_progress — NOT an ordinal, so step identity survives
// reorder). CurrentStepID is nil when the student has never advanced past
// step 1 (no progress row written yet); VisitedStepIDs is always a
// (possibly empty) array, never null.
type EducationLessonProgressPointer struct {
	AssignmentID   string   `json:"assignment_id"`
	CurrentStepID  *string  `json:"current_step_id"`
	VisitedStepIDs []string `json:"visited_step_ids"`
}

// EducationCourseModule is the wire shape for one education_course_modules
// row — the grouping level above lessons ("Módulo 1: Quién es Dios").
type EducationCourseModule struct {
	ID           string  `json:"id"`
	CurriculumID string  `json:"curriculum_id"`
	OrderIndex   int     `json:"order_index"`
	Title        string  `json:"title"`
	Description  *string `json:"description"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// EducationSyllabusLesson is one lesson row inside a course's syllabus read,
// with a server-computed `state`: `completed` | `in_progress` | `locked` |
// `pending`. `locked` (design A8, wired in PR-F) is derived purely at read
// time from the previous lesson's completion + quiz-pass status — never a
// stored flag. HasQuiz (PR-F addition) lets the frontend show "Ir al mini
// quiz" instead of "Siguiente lección" on the last step without a second
// request.
type EducationSyllabusLesson struct {
	ID              string  `json:"id"`
	ModuleID        *string `json:"module_id"`
	OrderIndex      int     `json:"order_index"`
	Title           string  `json:"title"`
	DurationMinutes *int    `json:"duration_minutes"`
	State           string  `json:"state"`
	HasQuiz         bool    `json:"has_quiz"`
}

// EducationSyllabusModule groups EducationSyllabusLesson rows under a
// course_modules row. `ID` is nil for the implicit "General" pseudo-module
// that collects lessons with a NULL module_id (spec: education-catalog,
// "Course modules group lessons without owning order").
type EducationSyllabusModule struct {
	ID      *string                   `json:"id"`
	Title   string                    `json:"title"`
	Lessons []EducationSyllabusLesson `json:"lessons"`
}

// EducationCatalogCourse is one row of the published-courses catalog list
// (GET /education/catalog). Teacher display name is resolved from the user
// row at read time (spec: "Teacher rename propagates" — no denormalized
// name string is stored). `HasQuiz` is stubbed to false until PR-F ships the
// quizzes table.
type EducationCatalogCourse struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  *string  `json:"description"`
	Track        *string  `json:"track"`
	Level        *string  `json:"level"`
	Hours        *float64 `json:"hours"`
	TeacherName  *string  `json:"teacher_name"`
	CoverPath    *string  `json:"cover_path"`
	LessonCount  int      `json:"lesson_count"`
	StudentCount int      `json:"student_count"`
	HasQuiz      bool     `json:"has_quiz"`
	CreatedAt    string   `json:"created_at"`
}

// EducationHomeAggregate is the response shape for GET /education/me/home —
// the student home aggregate PR-D's StudentHome screen consumes.
type EducationHomeAggregate struct {
	InProgressCount int                   `json:"in_progress_count"`
	CompletedCount  int                   `json:"completed_count"`
	Continue        *EducationAssignment  `json:"continue"`
	Assignments     []EducationAssignment `json:"assignments"`
}

// EducationReflection is the wire shape for one education_lesson_reflections
// row.
type EducationReflection struct {
	ID        string `json:"id"`
	LessonID  string `json:"lesson_id"`
	BlockID   string `json:"block_id"`
	UserID    string `json:"user_id"`
	Answer    string `json:"answer"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// EducationLessonBookmark is the wire shape for GET /education/me/bookmarks —
// one education_lesson_bookmarks row joined with enough lesson/curriculum
// data for StudentHome's "Lecciones guardadas" card to render without a
// second round trip (design: personal "save for later" list, unrelated to
// education_lesson_progress/education_assignments completion tracking).
// ModuleTitle is nil when the lesson has no course_module assigned.
type EducationLessonBookmark struct {
	ID             string  `json:"id"`
	LessonID       string  `json:"lesson_id"`
	LessonTitle    string  `json:"lesson_title"`
	CurriculumID   string  `json:"curriculum_id"`
	CurriculumName string  `json:"curriculum_name"`
	ModuleTitle    *string `json:"module_title"`
	CreatedAt      string  `json:"created_at"`
}
