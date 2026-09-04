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

	// Lesson content — steps + blocks (PR-B, education-content-model). GET
	// routes are gated at module level only (level < 3 additionally needs an
	// assignment on the lesson's curriculum — enforced inside the handler,
	// see lessonReadAccess in education_steps.go); writes require level 3.
	education.GET("/lessons/:id", h.GetLessonDetail, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/lessons/:lessonId/steps", h.GetLessonSteps, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/lessons/:lessonId/steps/:stepId", h.GetStepByID, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.POST("/lessons/:lessonId/steps", h.CreateStep, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/lessons/:lessonId/steps/reorder", h.ReorderSteps, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/lessons/:lessonId/steps/:stepId", h.UpdateStep, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.DELETE("/lessons/:lessonId/steps/:stepId", h.DeleteStep, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	// Step-pointer persistence (design A2/A3) — self-only, level 1, same
	// route family as MarkLessonComplete/MarkLessonIncomplete.
	education.PUT("/me/assignments/:id/lessons/:lessonId/position", h.UpdateLessonPosition, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	// Course modules (PR-B, education-catalog) — same GET/write split as
	// lessons/curricula.
	education.GET("/curricula/:id/modules", h.GetCourseModules, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.POST("/curricula/:id/modules", h.CreateCourseModule, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/curricula/:id/modules/reorder", h.ReorderCourseModules, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/modules/:id", h.UpdateCourseModule, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.DELETE("/modules/:id", h.DeleteCourseModule, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	// Catalog + syllabus + home aggregate (PR-B, education-catalog /
	// education-lesson-consumption) — level 1, backend for PR-D's student
	// read path.
	education.GET("/catalog", h.GetCatalog, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/curricula/:id/syllabus", h.GetSyllabus, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/me/home", h.GetHome, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.PUT("/curricula/:id/lesson-order", h.SetLessonOrder, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	// Reflections (PR-B, education-content-model) — self-only write,
	// owner-or-author (level >= 3) read (gate enforced inside the handler).
	education.PUT("/lessons/:id/reflections/:blockId", h.UpsertReflection, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/lessons/:id/reflections/:blockId", h.GetReflection, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	// Lesson bookmarks — small follow-up closing the design-handoff's
	// undefined "Guardar" pill (README.md line 247). Self-only, level 1, same
	// route family as the other "/me/..." self-service endpoints above. Both
	// writes are idempotent (create/remove twice both succeed cleanly).
	education.PUT("/me/lessons/:id/bookmark", h.BookmarkLesson, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.DELETE("/me/lessons/:id/bookmark", h.UnbookmarkLesson, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/me/bookmarks", h.GetMyBookmarks, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	// Quiz (PR-F, education-quiz-authoring / education-quiz-runtime /
	// education-manual-review) — the answer-leak boundary. Author routes
	// (level >= 3) are gated at BOTH the route level here AND again inside
	// the handler (see education_quiz_admin.go's file header for why).
	// Runner routes (level >= 1) are self-only by construction inside each
	// handler. 9 routes total, matching design's exact route budget.
	education.GET("/lessons/:id/quiz", h.GetQuizAuthor, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/lessons/:id/quiz", h.UpsertQuiz, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	education.GET("/me/lessons/:id/quiz", h.GetQuizRunner, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.POST("/me/lessons/:id/quiz/attempts", h.StartAttempt, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.PUT("/me/lessons/:id/quiz/attempts/:attemptId/answers", h.SaveAnswer, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.POST("/me/lessons/:id/quiz/attempts/:attemptId/submit", h.SubmitAttempt, middleware.RequireModuleLevel(utils.ModuleEducation, 1))
	education.GET("/me/quiz-attempts/:attemptId", h.GetAttemptResult, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	// PR-G addition (education_quiz_runner.go's own header comment explains
	// why this one small backend route is the deliberate exception to
	// PR-G's "frontend-only" framing — G.4's own task text anticipates it).
	// Registered as a literal static segment ("pending-review"), which
	// Echo's router matches before the sibling ":attemptId" param route
	// regardless of registration order — verified via GetHome/GetMyAssignments-
	// style self-only query, no new table, no migration.
	education.GET("/me/quiz-attempts/pending-review", h.GetMyPendingReviews, middleware.RequireModuleLevel(utils.ModuleEducation, 1))

	education.GET("/reviews", h.GetReviewQueue, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.PUT("/reviews/answers/:answerId", h.ReviewAnswer, middleware.RequireModuleLevel(utils.ModuleEducation, 3))

	// Analytics — student roster + per-lesson funnel + CSV export (PR-K,
	// education-manual-review / education-assignments DELTA). Level >= 3,
	// same sibling shape as the existing /curricula/:id/progress endpoint
	// (PR3a) — NOT under an "admin/" path prefix, matching this route
	// group's established convention (gate is RequireModuleLevel, not the
	// URL). The review queue/grading routes above (PR-F) are reused
	// as-is by K.4's frontend — no new review-specific route here.
	education.GET("/curricula/:id/roster", h.GetStudentRoster, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.GET("/curricula/:id/funnel", h.GetLessonFunnel, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
	education.GET("/curricula/:id/roster.csv", h.ExportRosterCSV, middleware.RequireModuleLevel(utils.ModuleEducation, 3))
}
