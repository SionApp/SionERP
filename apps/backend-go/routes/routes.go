package routes

import (
	"backend-sion/handlers"
	"backend-sion/middleware"
	"backend-sion/utils"
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

	// User routes — grouped by permission level
	// Staff+ (level 300): Admin CRUD operations
	usersAdmin := protected.Group("/users")
	usersAdmin.Use(middleware.RequireRole(utils.LevelStaff)) // staff, pastor, admin
	{
		usersAdmin.GET("", userHandler.GetUsers)          // GET /api/v1/users
		usersAdmin.POST("", userHandler.CreateUser)       // POST /api/v1/users
		usersAdmin.GET("/:id", userHandler.GetUser)       // GET /api/v1/users/:id
		usersAdmin.PUT("/:id", userHandler.UpdateUser)    // PUT /api/v1/users/:id
		usersAdmin.DELETE("/:id", userHandler.DeleteUser) // DELETE /api/v1/users/:id
		usersAdmin.POST("/direct", userHandler.CreateUserDirect) // POST /api/v1/users/direct
	}

	// Member+ (level 0): Profile access (any authenticated user)
	usersSelf := protected.Group("/users")
	{
		usersSelf.GET("/me", userHandler.GetCurrentUser)               // GET /api/v1/users/me
		usersSelf.PUT("/me", userHandler.UpdateCurrentUser)            // PUT /api/v1/users/me
		usersSelf.PUT("/me/onboarding", userHandler.CompleteOnboarding) // PUT /api/v1/users/me/onboarding
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

	// Module management routes (admin only)
	// Requires admin access: pastor/staff (via has_admin_access bypass) or super_admin
	modules := protected.Group("/modules")
	modules.Use(middleware.RequireRole(utils.LevelAdmin))
	{
		modules.PUT("/:key", setupHandler.UpdateModuleStatus)
	}

	// Invitation routes (staff+ level 300)
	invitations := protected.Group("/invitations")
	invitations.Use(middleware.RequireRole(utils.LevelStaff))
	{
		invitations.GET("", handlers.NewInviteHandler().GetInvitations)
		invitations.POST("", handlers.NewInviteHandler().InviteUser)
		invitations.POST("/:id/resend", handlers.NewInviteHandler().ResendInvitation)
		invitations.POST("/:id/accept", handlers.NewInviteHandler().AcceptInvitation)
	}

	// Settings routes (admin only)
	// Requires admin access: pastor/staff (via has_admin_access bypass) or super_admin
	settings := protected.Group("/settings")
	settings.Use(middleware.RequireRole(utils.LevelAdmin))
	{
		settings.GET("/system", handlers.NewSettingsHandler().GetSystemSettings)
		settings.PUT("/system", handlers.NewSettingsHandler().UpdateSystemSettings)
		settings.GET("/church", handlers.NewSettingsHandler().GetChurchInfo)
		settings.PUT("/church", handlers.NewSettingsHandler().UpdateChurchInfo)
		settings.GET("/notifications", handlers.NewSettingsHandler().GetNotificationConfig)
		settings.PUT("/notifications", handlers.NewSettingsHandler().UpdateNotificationConfig)
	}

	preferencesHandler := handlers.NewPreferencesHandler()
	preferences := protected.Group("/preferences")
	{
		preferences.GET("", preferencesHandler.GetUserPreferences)    // GET /api/v1/preferences - Get user preferences
		preferences.PUT("", preferencesHandler.UpdateUserPreferences) // PUT /api/v1/preferences - Update user preferences
	}

	// Permissions routes
	permissionsHandler := handlers.NewPermissionsHandler()
	protected.GET("/permissions/me", permissionsHandler.GetMyPermissions) // GET /api/v1/permissions/me

	discipleshipHandler := handlers.NewDiscipleshipHandler()
	reportsHandler := handlers.NewDiscipleshipReportsHandler()
	alertsHandler := handlers.NewDiscipleshipAlertsHandler()
	discipleship := protected.Group("/discipleship")
	discipleship.Use(middleware.RequireModule(utils.ModuleDiscipleship)) // Enforce Discipleship Module
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

		// Niveles de Discipulado
		discipleship.GET("/levels", discipleshipHandler.GetDiscipleshipLevels)
		discipleship.GET("/levels/:id", discipleshipHandler.GetDiscipleshipLevel)
		discipleship.POST("/levels", discipleshipHandler.CreateDiscipleshipLevel)
		discipleship.PUT("/levels/:id", discipleshipHandler.UpdateDiscipleshipLevel)
		discipleship.DELETE("/levels/:id", discipleshipHandler.DeleteDiscipleshipLevel)

		// Miembros de Grupo - rutas específicas primero para evitar conflicto con :id
		discipleship.GET("/groups/:id/members", discipleshipHandler.GetGroupMembers)
		discipleship.POST("/groups/:id/members", discipleshipHandler.AddGroupMember)
		discipleship.PUT("/members/:memberId", discipleshipHandler.UpdateGroupMember)
		discipleship.DELETE("/members/:memberId", discipleshipHandler.RemoveGroupMember)

		// Asistencia - rutas específicas primero
		discipleship.GET("/groups/:id/attendance", discipleshipHandler.GetGroupAttendance)
		discipleship.POST("/groups/:id/attendance", discipleshipHandler.RecordAttendance)
		discipleship.POST("/groups/:id/attendance/bulk", discipleshipHandler.BulkRecordAttendance)
		discipleship.GET("/attendance/stats/:userId", discipleshipHandler.GetMemberAttendanceStats)

		// Analytics
		discipleship.GET("/analytics", discipleshipHandler.GetAnalytics)
		// Las siguientes rutas se integraron en /analytics
		// discipleship.GET("/analytics/zones", discipleshipHandler.GetZoneStats)
		// discipleship.GET("/analytics/performance", discipleshipHandler.GetGroupPerformance)

		// Reportes
		discipleship.GET("/reports", reportsHandler.GetReports)
		discipleship.POST("/reports", reportsHandler.CreateReport)
		discipleship.PUT("/reports/:id/approve", reportsHandler.ApproveReport)
		discipleship.PUT("/reports/:id/reject", reportsHandler.RejectReport)

 	// Objetivos Estratégicos (Goals)
	goalsHandler := handlers.NewDiscipleshipGoalsHandler()
	discipleship.GET("/goals", goalsHandler.GetGoals)
	discipleship.POST("/goals", goalsHandler.CreateGoal)
	discipleship.PUT("/goals/:id", goalsHandler.UpdateGoal)
	discipleship.DELETE("/goals/:id", goalsHandler.DeleteGoal)
	discipleship.POST("/goals/:id/extend", goalsHandler.ExtendDeadline)
	discipleship.POST("/goals/:id/close-incomplete", goalsHandler.CloseIncomplete)
	discipleship.POST("/goals/:id/auto-update", goalsHandler.AutoUpdateProgress)

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
	zones.Use(middleware.RequireModule(utils.ModuleZones)) // Enforce Zones Module
	{
		zones.GET("", zonesHandler.GetZones)
		zones.GET("/map", zonesHandler.GetMapData)
		// Rutas específicas primero para evitar conflicto con :id
		zones.GET("/:id/stats", zonesHandler.GetZoneStats)
		zones.GET("/:id/groups", zonesHandler.GetZoneGroups)
		zones.PUT("/:id/groups/:groupId", zonesHandler.AssignGroupToZone)
		zones.PUT("/:id/users/:userId", zonesHandler.AssignUserToZone)
		// Ruta genérica al final
		zones.GET("/:id", zonesHandler.GetZone)
		zones.POST("", zonesHandler.CreateZone)
		zones.PUT("/:id", zonesHandler.UpdateZone)
		zones.DELETE("/:id", zonesHandler.DeleteZone)
	}
}
