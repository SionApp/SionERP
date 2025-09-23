package main

import (
	"backend-sion/routes"
	"log"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"message": "Backend Sion API",
			"version": "1.0.0",
			"description": "API Backend para la Iglesia Sion",
		})
	})

	// Setup all routes
	routes.SetupRoutes(e)

	// Start server
	log.Println("Server starting on :8080")
	e.Logger.Fatal(e.Start(":8080"))
}