// Package routes defines all the API endpoints for the SionERP backend, organizing them by functionality and applying appropriate middleware for authentication and authorization. It includes routes for user management, dashboard analytics, discipleship management, zones, and system setup, ensuring a clean separation of concerns and secure access control throughout the application.
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
	onboardingHandler := handlers.NewOnboardingHandler()
	federatedHandler := handlers.NewFederatedHandler()
	providerHandler := handlers.NewProviderHandler()

	// API routes
	api := e.Group("/api/v1")

	// Public routes
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status": "healthy",
		})
	})

	// Dev-only: Postman Collection export → GET /api/v1/__postman
	api.GET("/__postman", handlers.NewPostmanHandler().ExportCollection)

	// Auth routes (públicas)
	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/logout", authHandler.Logout)

	// Onboarding (POST /api/v1/onboarding/church) — registrado más abajo,
	// gateado por ProviderKeyAuth (ver sdd/provider-api/design Decisión 5).
	// TenantTx MUST NOT run aquí: no hay church_id de contexto todavía
	// cuando la iglesia se está creando.

	// Acceso federado (BonDev, I2 fase 1 modo read): GET /federated/redeem —
	// PÚBLICA a propósito, montada FUERA de /api/v1 (BonDev arma la URL
	// exacta como https://{tenant}.sionerp.local/federated/redeem?token=...,
	// pensada para abrirse directo en el browser, no como llamada de API).
	// Sin SupabaseAuth/TenantTx: no hay sesión previa que canjear. Ver SDD
	// completo en Engram, proyecto "sionerp", sdd/federated-access-verify/*.
	e.GET("/federated/redeem", federatedHandler.Redeem)

	// SionERP Provider API (I1): consumida por BonDev (control plane del
	// proveedor). PÚBLICA respecto de SupabaseAuth/TenantTx a propósito —
	// auth propia por X-Provider-Key (middleware.ProviderKeyAuth), server-a-
	// server, sin usuario ni church_id de sesión. Cada operación recibe el
	// tenant por :id en la URL. Ver SDD en Engram, proyecto "sionerp",
	// sdd/provider-api/{proposal,spec,design,tasks}.
	provider := e.Group("/provider")
	provider.Use(middleware.ProviderKeyAuth())
	provider.GET("/tenants", providerHandler.ListTenants)
	provider.GET("/tenants/:id", providerHandler.GetTenant)
	provider.GET("/tenants/:id/health", providerHandler.GetTenantHealth)
	provider.POST("/tenants", providerHandler.CreateTenant)
	provider.POST("/tenants/:id/modules", providerHandler.SetModule)
	provider.POST("/tenants/:id/suspend", providerHandler.Suspend)
	provider.POST("/tenants/:id/reactivate", providerHandler.Reactivate)
	provider.POST("/tenants/:id/cancel", providerHandler.Cancel)

	// El mismo secreto de servicio también gatea el onboarding self-service
	// (decisión del usuario, ver sdd/provider-api/design Decisión 5): deja
	// de ser público, sólo un poseedor de PROVIDER_API_KEY puede invocarlo.
	onboardingProvider := api.Group("/onboarding")
	onboardingProvider.Use(middleware.ProviderKeyAuth())
	onboardingProvider.POST("/church", onboardingHandler.ProvisionChurch)

	// Public: la página de registro consulta si el auto-registro está habilitado
	api.GET("/public/registration-status", handlers.NewSettingsHandler().GetRegistrationStatus)
	// Public: nombre + logo de la iglesia para la pantalla de login (pre-auth)
	api.GET("/public/branding", handlers.NewSettingsHandler().GetPublicBranding)

	// Protected routes (require authentication)
	protected := api.Group("")
	// Acceso federado: si hay una sesión federada válida (cookie httpOnly
	// seteada por /federated/redeem), setea el contexto ANTES de
	// SupabaseAuth — que trae su propio guard para saltearse cuando ve que
	// ya está autenticada (ver middleware/auth.go). Si no hay sesión
	// federada, este middleware es un no-op total.
	protected.Use(middleware.FederatedSessionAuth())
	protected.Use(middleware.SupabaseAuth())
	// Bloquea cualquier escritura de una sesión federada ANTES de que la
	// request llegue a abrir transacción — fail-fast, no sólo gating de UI.
	protected.Use(middleware.FederatedReadOnly())
	// Modo mantenimiento: 503 para no-staff cuando está activo (corre antes de abrir tx)
	protected.Use(middleware.MaintenanceGate())
	// ponytail: TenantTx registered here (Phase 0) but is a no-op pass-through when
	// church_id is absent from the context (all current users until Phase 2 JWT backfill).
	// TODO(phase 2): remove the pass-through guard inside TenantTx after JWT backfill.
	// TODO(phase 3): validateDB must be redefined to return config.Tx(c).
	protected.Use(middleware.TenantTx())

	// User routes — grouped by permission level
	// Staff+ (level 300): Admin CRUD operations
	usersAdmin := protected.Group("/users")
	usersAdmin.Use(middleware.RequireRole(utils.LevelStaff)) // staff, pastor, admin
	{
		usersAdmin.GET("", userHandler.GetUsers)                 // GET /api/v1/users
		usersAdmin.POST("", userHandler.CreateUser)              // POST /api/v1/users
		usersAdmin.GET("/:id", userHandler.GetUser)              // GET /api/v1/users/:id
		usersAdmin.PUT("/:id", userHandler.UpdateUser)           // PUT /api/v1/users/:id
		usersAdmin.DELETE("/:id", userHandler.DeleteUser)        // DELETE /api/v1/users/:id
		usersAdmin.POST("/direct", userHandler.CreateUserDirect) // POST /api/v1/users/direct
		usersAdmin.POST("/bulk", userHandler.BulkImportUsers)    // POST /api/v1/users/bulk
	}

	// Member+ (level 0): Profile access (any authenticated user)
	usersSelf := protected.Group("/users")
	{
		usersSelf.GET("/me", userHandler.GetCurrentUser)                // GET /api/v1/users/me
		usersSelf.PUT("/me", userHandler.UpdateCurrentUser)             // PUT /api/v1/users/me
		usersSelf.PUT("/me/onboarding", userHandler.CompleteOnboarding) // PUT /api/v1/users/me/onboarding
	}

	// Dashboard routes
	dashboard := protected.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetStats) // GET /api/v1/dashboard/stats
		dashboard.GET("/traceability", dashboardHandler.GetTraceability, middleware.RequireRole(utils.LevelStaff))
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

	// Module management routes (pastor+ — admin is 500, pastor is 400)
	modules := protected.Group("/modules")
	modules.Use(middleware.RequireRole(utils.LevelPastor))
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

	// Subset seguro de settings para CUALQUIER usuario autenticado (tema/idioma
	// por defecto, animaciones, mantenimiento, timeout) — sin gate de rol.
	protected.GET("/settings/public", handlers.NewSettingsHandler().GetPublicSettings)

	// Settings routes (pastor+ — admin 500 and pastor 400)
	settings := protected.Group("/settings")
	settings.Use(middleware.RequireRole(utils.LevelPastor))
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
	protected.GET("/permissions/me", permissionsHandler.GetMyPermissions)       // GET /api/v1/permissions/me
	protected.GET("/permissions/module-role", permissionsHandler.GetModuleRole) // GET /api/v1/permissions/module-role?module=:key

	discipleshipHandler := handlers.NewDiscipleshipHandler()
	reportsHandler := handlers.NewDiscipleshipReportsHandler()
	alertsHandler := handlers.NewDiscipleshipAlertsHandler()
	schedulerHandler := handlers.NewSchedulerHandler()
	complianceHandler := handlers.NewReportComplianceHandler()
	discipleship := protected.Group("/discipleship")
	discipleship.Use(middleware.RequireModule(utils.ModuleDiscipleship)) // Enforce Discipleship Module
	{
		// Usuarios del módulo de discipulado (nivel Supervisor Auxiliar+ del módulo)
		discipleship.GET("/users", discipleshipHandler.GetUsersForHierarchy, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelAuxiliary))

		// Grupos
		discipleship.GET("/groups", discipleshipHandler.GetGroups)
		discipleship.GET("/groups/:id", discipleshipHandler.GetGroup)
		discipleship.POST("/groups", discipleshipHandler.CreateGroup, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelGeneral))
		discipleship.PUT("/groups/:id", discipleshipHandler.UpdateGroup, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelGeneral))
		discipleship.DELETE("/groups/:id", discipleshipHandler.DeleteGroup, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))

		// Jerarquía
		discipleship.GET("/hierarchy", discipleshipHandler.GetHierarchy)
		discipleship.POST("/hierarchy", discipleshipHandler.AssignHierarchy, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))
		discipleship.DELETE("/hierarchy/:user_id", discipleshipHandler.RemoveHierarchy, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))
		discipleship.GET("/hierarchy/:id/subordinates", discipleshipHandler.GetSubordinates)

		// Niveles de Discipulado
		discipleship.GET("/levels", discipleshipHandler.GetDiscipleshipLevels)
		discipleship.GET("/levels/:id", discipleshipHandler.GetDiscipleshipLevel)
		discipleship.POST("/levels", discipleshipHandler.CreateDiscipleshipLevel, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))
		discipleship.PUT("/levels/:id", discipleshipHandler.UpdateDiscipleshipLevel, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))
		discipleship.DELETE("/levels/:id", discipleshipHandler.DeleteDiscipleshipLevel, middleware.RequireModuleLevel(utils.ModuleDiscipleship, utils.DiscipleshipLevelCoordinator))

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
		discipleship.GET("/analytics/timeline", discipleshipHandler.GetActivityTimeline)
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

		// Cascade assignments (Phase 1)
		discipleship.POST("/goals/:id/assignments", goalsHandler.CreateAssignments)
		discipleship.POST("/goals/:id/assignments/batch-zones", goalsHandler.BatchAssignToZones)
		discipleship.GET("/goals/:id/assignments", goalsHandler.GetAssignmentTree)
		discipleship.GET("/goals/:id/available-assignees", goalsHandler.GetAvailableAssignees)
		discipleship.GET("/goals/:id/activity", goalsHandler.GetGoalActivity)
		discipleship.DELETE("/assignments/:id", goalsHandler.DeleteAssignment)
		discipleship.POST("/assignments/:id/progress", goalsHandler.CreateProgress)

		// Active manual assignments (Phase 2)
		discipleship.GET("/me/active-manual-assignments", goalsHandler.GetActiveManualAssignments)

		// Alertas
		discipleship.GET("/alerts", alertsHandler.GetAlerts)
		discipleship.GET("/multiplications", discipleshipHandler.GetMultiplications)
		discipleship.POST("/alerts", alertsHandler.CreateAlert)
		discipleship.PUT("/alerts/:id/resolve", alertsHandler.ResolveAlert)
		discipleship.DELETE("/alerts/:id", alertsHandler.DeleteAlert)
		discipleship.POST("/alerts/generate", alertsHandler.GenerateAutomaticAlerts)
		discipleship.POST("/alerts/check-missing-reports", schedulerHandler.TriggerMissingReportsCheck)

		// Tendencias y estadísticas
		discipleship.GET("/weekly-trends", discipleshipHandler.GetWeeklyTrends)
		discipleship.GET("/dashboard-stats", discipleshipHandler.GetDashboardStatsByLevel)
		discipleship.GET("/leaders/:id/stats", discipleshipHandler.GetLeaderGroupStats)
		discipleship.GET("/supervisors/:id/subordinates", discipleshipHandler.GetSupervisorSubordinates)

		// Zone rollup (PR1) — pre-fills supervision report modal totals
		discipleship.GET("/zone-rollup", reportsHandler.GetZoneRollup)

		// Compliance (PR1) — per-user per-ISO-week compliance tracking
		discipleship.GET("/compliance/me", complianceHandler.GetMyCompliance)
		discipleship.GET("/compliance/subordinates", complianceHandler.GetSubordinatesCompliance)
	}

	// Notifications routes (any authenticated user)
	notificationsHandler := handlers.NewNotificationsHandler()
	notifications := protected.Group("/notifications")
	notifications.GET("", notificationsHandler.GetNotifications)
	notifications.PUT("/read-all", notificationsHandler.MarkAllAsRead) // MUST be before /:id
	notifications.PUT("/:id/read", notificationsHandler.MarkAsRead)
	notifications.DELETE("/:id", notificationsHandler.DismissNotification)

	// Music routes
	SetupMusicRoutes(protected)

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
		zones.POST("", zonesHandler.CreateZone, middleware.RequireRole(utils.LevelStaff))
		zones.PUT("/:id", zonesHandler.UpdateZone, middleware.RequireRole(utils.LevelStaff))
		zones.DELETE("/:id", zonesHandler.DeleteZone, middleware.RequireRole(utils.LevelPastor))
	}

	// Events routes
	eventsHandler := handlers.NewEventsHandler()
	events := protected.Group("/events")
	events.Use(middleware.RequireModule(utils.ModuleEvents)) // Enforce Events Module
	{
		events.GET("", eventsHandler.GetEvents)
		events.POST("", eventsHandler.CreateEvent, middleware.RequireRole(utils.LevelStaff))
		// Specific routes before the generic :id
		events.GET("/:id/registrations", eventsHandler.GetRegistrations, middleware.RequireRole(utils.LevelStaff))
		events.POST("/:id/register", eventsHandler.Register)
		events.DELETE("/:id/register", eventsHandler.Unregister)
		events.GET("/:id", eventsHandler.GetEventByID)
		events.PUT("/:id", eventsHandler.UpdateEvent, middleware.RequireRole(utils.LevelStaff))
		events.DELETE("/:id", eventsHandler.DeleteEvent, middleware.RequireRole(utils.LevelStaff))
	}

	// Reports module (analytics + traceability) — supervisor+
	reportsAnalytics := handlers.NewReportsAnalyticsHandler()
	reports := protected.Group("/reports")
	reports.Use(middleware.RequireModule(utils.ModuleReports))
	reports.Use(middleware.RequireRole(utils.LevelSupervisor))
	{
		reports.GET("/users", reportsAnalytics.GetUsersReport)
		reports.GET("/growth", reportsAnalytics.GetGrowthReport)
		reports.GET("/demographics", reportsAnalytics.GetDemographicsReport)
		reports.GET("/activities", reportsAnalytics.GetActivitiesReport)
		reports.GET("/generations", reportsAnalytics.GetGenerations)
		reports.POST("/generations", reportsAnalytics.LogGeneration)
	}
}
