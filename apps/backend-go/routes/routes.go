package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"
	"backend-sion/config"

	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo, db *config.Database) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler(db)

	// API routes
	api := e.Group("/api/v1")

	// Public routes
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status": "healthy",
		})
	})

	// Protected routes (require authentication)
	protected := api.Group("")
	protected.Use(middleware.SupabaseAuth())

	// User routes
	users := protected.Group("/users")
	{
		// Admin endpoints (require pastor/staff role)
		users.GET("", userHandler.GetUsers)           // GET /api/v1/users - List all users
		users.POST("", userHandler.CreateUser)        // POST /api/v1/users - Create new user
		users.GET("/:id", userHandler.GetUser)        // GET /api/v1/users/:id - Get specific user
		users.PUT("/:id", userHandler.UpdateUser)     // PUT /api/v1/users/:id - Update specific user
		users.DELETE("/:id", userHandler.DeleteUser)  // DELETE /api/v1/users/:id - Delete user
		
		// Profile endpoints (accessible by user themselves)
		users.GET("/me", userHandler.GetCurrentUser)     // GET /api/v1/users/me - Get current user profile
		users.PUT("/me", userHandler.UpdateCurrentUser)  // PUT /api/v1/users/me - Update current user profile
	}
}