package models

import "encoding/json"

// EducationCurriculum is the wire shape for a curriculum row. Catalog
// metadata (Track/Level/Hours/TeacherUserID/CoverPath/Objectives/
// Requirements) was added in the design-handoff expansion (PR-A); `Cadence`
// was dropped in the same migration (spec: "Cadence is descriptive" — the
// only deletion in the plan).
type EducationCurriculum struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   *string  `json:"description"`
	Status        string   `json:"status"`
	Track         *string  `json:"track"`
	Level         *string  `json:"level"`
	Hours         *float64 `json:"hours"`
	TeacherUserID *string  `json:"teacher_user_id"`
	// TeacherName is resolved at read time from the user row (spec: "Teacher
	// rename propagates ... no backfill"). Populated only by
	// GetCurriculumByID (PR-D's CourseDetail hero) — nil on GetCurricula/
	// CreateCurriculum/UpdateCurriculum, which have no consumer that needs
	// it yet. Additive, non-breaking for every existing caller.
	TeacherName  *string         `json:"teacher_name,omitempty"`
	CoverPath    *string         `json:"cover_path"`
	Objectives   json.RawMessage `json:"objectives"`
	Requirements *string         `json:"requirements"`
	LessonCount  int             `json:"lesson_count"`
	// StudentCount mirrors GetCatalog's COUNT(DISTINCT assignments) — same
	// additive, GetCurriculumByID-only population as TeacherName above.
	StudentCount int     `json:"student_count,omitempty"`
	CreatedBy    *string `json:"created_by"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// EducationLesson is the wire shape for a lesson row. `Content`/
// `AttachmentPath`/`AttachmentName` were dropped in the design-handoff
// expansion (PR-A) — content now lives in `education_lesson_steps.blocks`,
// authored/read via PR-B's step endpoints, not this struct. `ModuleID`/
// `DurationMinutes` were added in the same migration.
type EducationLesson struct {
	ID              string  `json:"id"`
	CurriculumID    string  `json:"curriculum_id"`
	ModuleID        *string `json:"module_id"`
	OrderIndex      int     `json:"order_index"`
	Title           string  `json:"title"`
	DurationMinutes *int    `json:"duration_minutes"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

// EducationMember is the wire shape for a user's education module role row,
// used by the level-5 members/role management endpoints.
type EducationMember struct {
	UserID    string  `json:"user_id"`
	Name      string  `json:"name"`
	Email     *string `json:"email"`
	RoleLevel int     `json:"role_level"`
	RoleName  string  `json:"role_name"`
}

// EducationAssignment is the wire shape for an assignment row plus its
// derived progress rollup (PR3a). Status is computed server-side (design D3)
// — never stored. AssignedToName/AssignedToEmail are populated only by the
// admin-facing GetCurriculumProgress listing (nil on the student-facing
// GetMyAssignments/GetMyAssignmentByID responses, which only ever return the
// caller's own rows and have no reason to name the caller back to themself).
type EducationAssignment struct {
	ID               string  `json:"id"`
	CurriculumID     string  `json:"curriculum_id"`
	CurriculumName   string  `json:"curriculum_name"`
	AssignedTo       string  `json:"assigned_to"`
	AssignedBy       *string `json:"assigned_by"`
	SourceModule     *string `json:"source_module"`
	SourceRefID      *string `json:"source_ref_id"`
	DueDate          *string `json:"due_date"`
	CompletedAt      *string `json:"completed_at"`
	CreatedAt        string  `json:"created_at"`
	CompletedLessons int     `json:"completed_lessons"`
	TotalLessons     int     `json:"total_lessons"`
	Status           string  `json:"status"`
	AssignedToName   *string `json:"assigned_to_name,omitempty"`
	AssignedToEmail  *string `json:"assigned_to_email,omitempty"`
	// Track/TeacherName are PR-D additions (assignmentSelectSQL) — populated
	// on GetMyAssignments/GetMyAssignmentByID/GetHome; nil on
	// GetCurriculumProgress (own separate query, doesn't need them since the
	// admin already has the curriculum in context).
	Track       *string `json:"track,omitempty"`
	TeacherName *string `json:"teacher_name,omitempty"`
}
