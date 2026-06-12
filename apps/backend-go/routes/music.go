package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"
	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// SetupMusicRoutes registers all /api/v1/music endpoints.
// The entire group is gated by RequireModule(ModuleMusic).
// Write operations additionally require RequireModuleLevel(ModuleMusic, 5).
func SetupMusicRoutes(protected *echo.Group) {
	h := handlers.NewMusicHandler()
	music := protected.Group("/music")
	music.Use(middleware.RequireModule(utils.ModuleMusic))

	// Members
	music.GET("/members", h.GetMembers)
	music.POST("/members", h.CreateMember, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.PUT("/members/:id", h.UpdateMember, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.DELETE("/members/:id", h.DeleteMember, middleware.RequireModuleLevel(utils.ModuleMusic, 5))

	// Events
	music.GET("/events", h.GetEvents)
	music.GET("/events/:id", h.GetEventByID)
	music.POST("/events", h.CreateEvent, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.PUT("/events/:id", h.UpdateEvent, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.DELETE("/events/:id", h.DeleteEvent, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	// batch-quarter must come before /:id to avoid route conflicts
	music.POST("/events/batch-quarter", h.BatchCreateQuarterEvents, middleware.RequireModuleLevel(utils.ModuleMusic, 5))

	// Assignments
	music.GET("/events/:id/assignments", h.GetAssignments)
	music.POST("/events/:id/assignments", h.CreateAssignment, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.PUT("/assignments/:id", h.UpdateAssignment, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.DELETE("/assignments/:id", h.DeleteAssignment, middleware.RequireModuleLevel(utils.ModuleMusic, 5))

	// Songs — /songs/stats must come before /songs to avoid conflict
	music.GET("/songs/stats", h.GetSongStats)
	music.GET("/songs", h.GetSongs)
	music.POST("/events/:id/songs", h.AddSongToEvent, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
	music.DELETE("/events/:eventId/songs/:songId", h.RemoveEventSong, middleware.RequireModuleLevel(utils.ModuleMusic, 5))
}
