package handlers

import (
	"backend-sion/config"
	"backend-sion/middleware"
	"backend-sion/utils"
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// installedModulesForChurch devuelve las keys de módulos instalados de UNA
// iglesia — compartido entre el camino normal de GetMyPermissions y el
// especial de una sesión federada.
//
// FIX de seguridad (2026-07-24): la versión anterior corría sobre
// config.GetDB().DB (pool global, sin scoping) con un WHERE sin church_id
// — devolvía los módulos instalados de TODAS las iglesias de la base,
// mezclados, a cualquiera que pegara este endpoint. Usa config.Tx(c)
// (hereda el scoping real de TenantTx/RLS, mismo mecanismo que el resto de
// los handlers) + WHERE church_id explícito — doble capa, ninguna
// dependiendo de que la otra esté bien configurada.
//
// Nota aparte (no arreglada acá, encontrada de paso): la tabla `modules`
// tiene una policy RLS "Allow public read access to modules" (USING true)
// que en la práctica anula tenant_isolation para SELECT — cualquier query
// directa a esa tabla, sin este WHERE explícito, sigue leakeando entre
// iglesias sin importar el rol de conexión. Vale la pena revisarla aparte.
func installedModulesForChurch(c echo.Context) ([]string, error) {
	churchID, _ := c.Get("church_id").(string)
	modules := []string{}
	rows, err := config.Tx(c).Query(`
		SELECT key FROM modules WHERE is_installed = true AND church_id = $1 ORDER BY key
	`, churchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err == nil {
			modules = append(modules, key)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("❌ Error iterating modules rows: %v", err)
	}
	return modules, nil
}

// PermissionsHandler handles permission-related endpoints
type PermissionsHandler struct{}

// NewPermissionsHandler creates a new PermissionsHandler
func NewPermissionsHandler() *PermissionsHandler {
	return &PermissionsHandler{}
}

// GetMyPermissions returns the current user's role level and accessible modules
func (h *PermissionsHandler) GetMyPermissions(c echo.Context) error {
	// Acceso federado (BonDev): no hay fila en `users` para una sesión
	// federada — devolvemos permisos sintetizados en vez de fallar el
	// lookup por PK con 404 (ver middleware/federated.go, que setea estos
	// mismos valores en el contexto).
	//
	// Modo read (I2 fase 1): role_level = LevelStaff a propósito —
	// suficiente para navegar la mayoría de las páginas de datos, pero sin
	// has_admin_access (paneles de configuración quedan afuera) — las
	// escrituras están bloqueadas de todas formas server-side
	// (FederatedReadOnly), esto es sólo de qué VE, no de qué puede tocar.
	//
	// Modo edit (I2 fase 2): el rol/has_admin_access YA son los reales
	// (seteados por FederatedSessionAuth con claims.Role) — se devuelven tal
	// cual, el operador actúa como un usuario real de ese rol.
	if isFederated, _ := c.Get("is_federated").(bool); isFederated {
		modules, err := installedModulesForChurch(c)
		if err != nil {
			log.Printf("❌ Error querying modules table: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch installed modules"})
		}
		mode, _ := c.Get("federated_mode").(string)
		role := middleware.FederatedRole
		roleLevel := utils.LevelStaff
		hasAdminAccess := false
		if mode == "edit" {
			if r, ok := c.Get("role").(string); ok {
				role = r
				roleLevel = utils.GetRoleLevel(r)
			}
			hasAdminAccess, _ = c.Get("has_admin_access").(bool)
		}
		expiresAt, _ := c.Get("federated_expires_at").(time.Time)
		operatorName, _ := c.Get("federated_operator_name").(string)
		return c.JSON(http.StatusOK, map[string]interface{}{
			"role":                    role,
			"role_level":              roleLevel,
			"has_admin_access":        hasAdminAccess,
			"installed_modules":       modules,
			"is_federated":            true,
			"federated_mode":          mode,
			"federated_operator_name": operatorName,
			"federated_expires_at":    expiresAt,
		})
	}

	userID, ok := c.Get("user_id").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User ID not found in context",
		})
	}

	// Get user role and super admin status
	var role string
	var isSuperAdmin bool
	err := config.GetDB().DB.QueryRow("SELECT role, COALESCE(is_super_admin, false) FROM users WHERE id = $1", userID).Scan(&role, &isSuperAdmin)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "User not found",
		})
	}

	// Get role level
	roleLevel := utils.GetRoleLevel(role)

	modules, err := installedModulesForChurch(c)
	if err != nil {
		// Log the error and return 500 so the frontend knows something went wrong
		log.Printf("❌ Error querying modules table: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "Failed to fetch installed modules",
			"details": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"role":              role,
		"role_level":        roleLevel,
		"has_admin_access":  middleware.HasAdminAccess(role, isSuperAdmin),
		"installed_modules": modules,
	})
}

// GetModuleRole returns the current user's role level in a specific module.
//
// Query param:
//   - module (required): module key, e.g. "discipleship", "events"
//
// Responses:
//   - 200 {module, role_level, role_name, is_admin}  — role found
//   - 404 {error: "no_module_role", module}           — user has no role in this module
//   - 400 {error}                                     — missing module param
func (h *PermissionsHandler) GetModuleRole(c echo.Context) error {
	moduleKey := c.QueryParam("module")
	if moduleKey == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "'module' query param is required",
		})
	}

	// Bypass EXCLUSIVO para pastor y admin — el staff tiene su propio rol de módulo.
	// has_admin_access incluye staff (acceso ERP), pero para el módulo queremos el nivel real.
	dbRole, _ := c.Get("db_role").(string)
	isSuperAdmin, _ := c.Get("is_super_admin").(bool)
	if isSuperAdmin || dbRole == utils.RolePastor || dbRole == utils.RoleAdmin {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"module":     moduleKey,
			"role_level": 5,
			"role_name":  "Pastoral",
			"is_admin":   true,
		})
	}

	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User ID not found in context",
		})
	}

	db := config.GetDB()
	var roleLevel int
	var roleName sql.NullString
	err := db.DB.QueryRow(
		`SELECT role_level, role_name FROM module_user_roles
		 WHERE user_id = $1 AND module_key = $2
		 LIMIT 1`,
		userID, moduleKey,
	).Scan(&roleLevel, &roleName)

	if err == sql.ErrNoRows {
		// Fallback para discipleship: si el usuario tiene nivel en discipleship_hierarchy,
		// ese nivel es su acceso al módulo (coordinadora nivel 4, supervisor nivel 3, etc.)
		if moduleKey == "discipleship" {
			var hierarchyLevel int
			fallbackErr := db.DB.QueryRow(
				`SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1 LIMIT 1`,
				userID,
			).Scan(&hierarchyLevel)
			if fallbackErr == nil && hierarchyLevel > 0 {
				levelNames := map[int]string{1: "Líder", 2: "Supervisor Auxiliar", 3: "Supervisor General", 4: "Coordinador", 5: "Pastoral"}
				return c.JSON(http.StatusOK, map[string]interface{}{
					"module":     moduleKey,
					"role_level": hierarchyLevel,
					"role_name":  levelNames[hierarchyLevel],
					"is_admin":   false,
				})
			}
		}
		return c.JSON(http.StatusNotFound, map[string]string{
			"error":  "no_module_role",
			"module": moduleKey,
		})
	}
	if err != nil {
		log.Printf("❌ Error querying module_user_roles [module=%s, user=%s]: %v", moduleKey, userID, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al consultar rol de módulo",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"module":     moduleKey,
		"role_level": roleLevel,
		"role_name":  roleName.String,
		"is_admin":   false,
	})
}
