package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"

	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler()

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
	users.GET("", userHandler.GetUsers)
	users.GET("/:id", userHandler.GetUser)
	users.POST("", userHandler.CreateUser)
	users.PUT("/:id", userHandler.UpdateUser)
	users.DELETE("/:id", userHandler.DeleteUser)
}