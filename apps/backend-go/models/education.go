package models

// EducationCurriculum is the wire shape for a curriculum row.
type EducationCurriculum struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Cadence     string  `json:"cadence"`
	Status      string  `json:"status"`
	LessonCount int     `json:"lesson_count"`
	CreatedBy   *string `json:"created_by"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// EducationLesson is the wire shape for a lesson row.
type EducationLesson struct {
	ID             string  `json:"id"`
	CurriculumID   string  `json:"curriculum_id"`
	OrderIndex     int     `json:"order_index"`
	Title          string  `json:"title"`
	Content        *string `json:"content"`
	AttachmentPath *string `json:"attachment_path"`
	AttachmentName *string `json:"attachment_name"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
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
