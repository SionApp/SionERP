package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"
	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// SetupEducationRoutes registers all /api/v1/education endpoints (PR2a:
// curriculum/lesson CRUD + module role management; PR3a: assignment/progress
// tracking). The entire group is gated by RequireModule(ModuleEducation);
// write operations additionally require RequireModuleLevel(ModuleEducation, N)
// per the role ladder (1=student, 3=author, 5=module admin — spec:
// education-module-roles).
func SetupEducationRoutes(protected *echo.Group) {
	h := handlers.NewEducationHandler()
	education := protected.Group("/education")
	education.Use(middleware.RequireModule(utils.ModuleEducation))

	// Curricula — GET gated at module level only (level < 3 sees published
	// only, enforced inside the handler); writes require level 3 (author).
	education.GET("/curricula", h.GetCurricula)
	education.GET("/curricula/:id", h.GetCurriculumByID)
	education.POST("/curricula", h.CreateCurriculum, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/curricula/:id", h.UpdateCurriculum, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	// Publish requires level 3; archive/unpublish requires level 5 — enforced
	// inside the handler using the resolved module_role_level.
	education.PATCH("/curricula/:id/status", h.UpdateCurriculumStatus, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.DELETE("/curricula/:id", h.DeleteCurriculum, middleware.RequireModuleLevel(utils.ModuleEducation, 5))

	// Lessons — GET gated at module level only (same draft-hiding rule as
	// curricula); writes require level 3.
	education.GET("/curricula/:id/lessons", h.GetLessons)
	education.POST("/curricula/:id/lessons", h.CreateLesson, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	// /curricula/:id/lessons/reorder must be registered before it could ever
	// collide with a lesson-scoped route (it isn't — /lessons/:id is a
	// sibling path — kept here for readability alongside the other lesson
	// write endpoints).
	education.PUT("/curricula/:id/lessons/reorder", h.ReorderLessons, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/lessons/:id", h.UpdateLesson, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.DELETE("/lessons/:id", h.DeleteLesson, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	// Members / roles — level 5 (module admin) only.
	education.GET("/members", h.GetMembers, middleware.RequireModuleLevel(utils.ModuleEducation, 5))
	education.PUT("/members/:userId/role", h.UpdateMemberRole, middleware.RequireModuleLevel(utils.ModuleEducation, 5))
	education.POST("/members/bulk-leaders", h.BulkGrantLeaders, middleware.RequireModuleLevel(utils.ModuleEducation, 5))

	// Assignments + progress (PR3a) — self-service ("me") endpoints require
	// only level 1 (student); assign/unassign and the admin progress view
	// require level 3 (author). Self-enroll is a level-1 action registered
	// alongside /curricula/:id so a student can enroll in a published
	// curriculum without author-level access.
	education.POST("/curricula/:id/enroll", h.EnrollSelf, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/curricula/:id/progress", h.GetCurriculumProgress, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	education.GET("/me/assignments", h.GetMyAssignments, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/me/assignments/:id", h.GetMyAssignmentByID, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.PUT("/me/assignments/:id/lessons/:lessonId", h.MarkLessonComplete, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.DELETE("/me/assignments/:id/lessons/:lessonId", h.MarkLessonIncomplete, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	education.POST("/assignments", h.CreateAssignments, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.DELETE("/assignments/:id", h.DeleteAssignment, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
}
