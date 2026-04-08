package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"
	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler()
	dashboardHandler := handlers.NewDashboardHandler()
	authHandler := handlers.NewAuthHandler()

	// API routes
	api := e.Group("/api/v1")

	// Public routes
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status": "healthy",
		})
	})

	// Auth routes (públicas)
	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/logout", authHandler.Logout)

	// Protected routes (require authentication)
	protected := api.Group("")
	protected.Use(middleware.SupabaseAuth())

	// User routes
	users := protected.Group("/users")
	{
		// Admin endpoints (require pastor/staff role)
		users.GET("", userHandler.GetUsers)          // GET /api/v1/users - List all users
		users.POST("", userHandler.CreateUser)       // POST /api/v1/users - Create new user
		users.GET("/:id", userHandler.GetUser)       // GET /api/v1/users/:id - Get specific user
		users.PUT("/:id", userHandler.UpdateUser)    // PUT /api/v1/users/:id - Update specific user
		users.DELETE("/:id", userHandler.DeleteUser) // DELETE /api/v1/users/:id - Delete user

		// Profile endpoints (accessible by user themselves)
		users.GET("/me", userHandler.GetCurrentUser)    // GET /api/v1/users/me - Get current user profile
		users.PUT("/me", userHandler.UpdateCurrentUser) // PUT /api/v1/users/me - Update current user profile
	}

	// Dashboard routes
	dashboard := protected.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetStats) // GET /api/v1/dashboard/stats
	}

	// Setup routes (Public or protected check inside handler)
	// Setup routes (Use OptionalAuth to allow both public init and protected admin access)
	setupHandler := handlers.NewSetupHandler()
	setup := api.Group("/setup")
	setup.Use(middleware.OptionalAuth())
	{
		setup.GET("/status", setupHandler.GetSetupStatus)
		setup.POST("", setupHandler.PerformSetup)
	}

	// Module management routes (protected)
	modules := protected.Group("/modules")
	{
		modules.PUT("/:key", setupHandler.UpdateModuleStatus)
	}

	// Invitation routes
	invitations := protected.Group("/invitations")
	{
		invitations.GET("", handlers.NewInviteHandler().GetInvitations)               // GET /api/v1/invitations - List all invitations
		invitations.POST("", handlers.NewInviteHandler().InviteUser)                  // POST /api/v1/invitations - Invite a user
		invitations.POST("/:id/resend", handlers.NewInviteHandler().ResendInvitation) // POST /api/v1/invitations/:id/resend - Resend an invitation
		invitations.POST("/:id/accept", handlers.NewInviteHandler().AcceptInvitation) // POST /api/v1/invitations/:id/accept - Accept an invitation
	}
	// Settings routes
	settings := protected.Group("/settings")
	{
		settings.GET("/system", handlers.NewSettingsHandler().GetSystemSettings)               // GET /api/v1/settings/system - Get system settings
		settings.PUT("/system", handlers.NewSettingsHandler().UpdateSystemSettings)            // PUT /api/v1/settings/system - Update system settings
		settings.GET("/church", handlers.NewSettingsHandler().GetChurchInfo)                   // GET /api/v1/settings/church - Get church info
		settings.PUT("/church", handlers.NewSettingsHandler().UpdateChurchInfo)                // PUT /api/v1/settings/church - Update church info
		settings.GET("/notifications", handlers.NewSettingsHandler().GetNotificationConfig)    // GET /api/v1/settings/notifications - Get notification config
		settings.PUT("/notifications", handlers.NewSettingsHandler().UpdateNotificationConfig) // PUT /api/v1/settings/notifications - Update notification config
	}

	preferencesHandler := handlers.NewPreferencesHandler()
	preferences := protected.Group("/preferences")
	{
		preferences.GET("", preferencesHandler.GetUserPreferences)    // GET /api/v1/preferences - Get user preferences
		preferences.PUT("", preferencesHandler.UpdateUserPreferences) // PUT /api/v1/preferences - Update user preferences
	}

	discipleshipHandler := handlers.NewDiscipleshipHandler()
	reportsHandler := handlers.NewDiscipleshipReportsHandler()
	alertsHandler := handlers.NewDiscipleshipAlertsHandler()
	discipleship := protected.Group("/discipleship")
	discipleship.Use(middleware.RequireModule("discipleship")) // Enforce Discipleship Module
	{
		// Grupos
		discipleship.GET("/groups", discipleshipHandler.GetGroups)
		discipleship.GET("/groups/:id", discipleshipHandler.GetGroup)
		discipleship.POST("/groups", discipleshipHandler.CreateGroup)
		discipleship.PUT("/groups/:id", discipleshipHandler.UpdateGroup)
		discipleship.DELETE("/groups/:id", discipleshipHandler.DeleteGroup)

		// Jerarquía
		discipleship.GET("/hierarchy", discipleshipHandler.GetHierarchy)
		discipleship.POST("/hierarchy", discipleshipHandler.AssignHierarchy)
		discipleship.GET("/hierarchy/:id/subordinates", discipleshipHandler.GetSubordinates)

		// Analytics
		discipleship.GET("/analytics", discipleshipHandler.GetAnalytics)
		discipleship.GET("/analytics/zones", discipleshipHandler.GetZoneStats)
		discipleship.GET("/analytics/performance", discipleshipHandler.GetGroupPerformance)

		// Métricas
		discipleship.GET("/metrics", reportsHandler.GetMetrics)
		discipleship.POST("/metrics", reportsHandler.CreateMetrics)

		// Reportes
		discipleship.GET("/reports", reportsHandler.GetReports)
		discipleship.POST("/reports", reportsHandler.CreateReport)
		discipleship.PUT("/reports/:id/approve", reportsHandler.ApproveReport)
		discipleship.PUT("/reports/:id/reject", reportsHandler.RejectReport)

		// Alertas
		discipleship.GET("/alerts", alertsHandler.GetAlerts)
		discipleship.GET("/multiplications", discipleshipHandler.GetMultiplications)
		discipleship.POST("/alerts", alertsHandler.CreateAlert)
		discipleship.PUT("/alerts/:id/resolve", alertsHandler.ResolveAlert)
		discipleship.DELETE("/alerts/:id", alertsHandler.DeleteAlert)
		discipleship.POST("/alerts/generate", alertsHandler.GenerateAutomaticAlerts)

		// Objetivos
		discipleship.GET("/weekly-trends", discipleshipHandler.GetWeeklyTrends)
		discipleship.GET("/dashboard-stats", discipleshipHandler.GetDashboardStatsByLevel)
		discipleship.GET("/leaders/:id/stats", discipleshipHandler.GetLeaderGroupStats)
		discipleship.GET("/supervisors/:id/subordinates", discipleshipHandler.GetSupervisorSubordinates)
		discipleship.GET("/goals", discipleshipHandler.GetGoals)
	}

	// Zones routes
	zonesHandler := handlers.NewZonesHandler()
	zones := protected.Group("/zones")
	zones.Use(middleware.RequireModule("zones")) // Enforce Zones Module
	{
		zones.GET("", zonesHandler.GetZones)
		zones.GET("/map", zonesHandler.GetMapData)
		zones.GET("/:id", zonesHandler.GetZone)
		zones.POST("", zonesHandler.CreateZone)
		zones.PUT("/:id", zonesHandler.UpdateZone)
		zones.DELETE("/:id", zonesHandler.DeleteZone)
		zones.GET("/:id/stats", zonesHandler.GetZoneStats)
		zones.GET("/:id/groups", zonesHandler.GetZoneGroups)
		zones.PUT("/:id/groups/:groupId", zonesHandler.AssignGroupToZone)
		zones.PUT("/:id/users/:userId", zonesHandler.AssignUserToZone)
	}
}
