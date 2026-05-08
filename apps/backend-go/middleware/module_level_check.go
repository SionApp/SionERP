package middleware

import (
	"backend-sion/config"
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireModuleLevel verifica el nivel del usuario en module_user_roles para
// el módulo indicado. Es INDEPENDIENTE del rol de sistema ERP.
//
// Jerarquía de verificación:
//  1. has_admin_access (pastor/admin) → bypass siempre, nivel 5 en contexto.
//  2. module_user_roles.role_level >= minLevel → acceso concedido.
//  3. Sin entrada en module_user_roles → acceso denegado.
//
// El nivel resuelto queda en el contexto como "module_role_level" para que
// los handlers lo usen sin una query extra.
//
// Uso en rutas:
//
//	discipleship.POST("/groups", handler, middleware.RequireModuleLevel("discipleship", 3))
//	events.POST("/events",       handler, middleware.RequireModuleLevel("events", 2))
func RequireModuleLevel(moduleKey string, minLevel int) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Paso 1: bypass EXCLUSIVO para pastor/admin — staff tiene su propio rol de módulo.
			// has_admin_access incluye staff (acceso ERP base), pero en módulos queremos el nivel real.
			dbRole, _ := c.Get("db_role").(string)
			isSuperAdmin, _ := c.Get("is_super_admin").(bool)
			if isSuperAdmin || dbRole == "pastor" || dbRole == "admin" {
				c.Set("module_role_level", 5)
				return next(c)
			}

			// Paso 2: requiere usuario autenticado
			userIDVal := c.Get("user_id")
			if userIDVal == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error":   "Authentication required",
					"message": "Debes estar autenticado para acceder a este recurso",
				})
			}
			userID, ok := userIDVal.(string)
			if !ok || userID == "" {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error":   "Access denied",
					"message": "No se pudo determinar tu identidad",
				})
			}

			// Paso 3: consultar nivel en module_user_roles
			db := config.GetDB()
			var roleLevel int
			err := db.DB.QueryRow(
				`SELECT role_level FROM module_user_roles
				 WHERE user_id = $1 AND module_key = $2
				 LIMIT 1`,
				userID, moduleKey,
			).Scan(&roleLevel)

			if err == sql.ErrNoRows {
				email := c.Get("email")
				log.Printf("🚫 MODULE ROLE DENIED [%s]: user=%s email=%v — sin rol asignado (requiere nivel %d)",
					moduleKey, userID, email, minLevel)
				return c.JSON(http.StatusForbidden, map[string]string{
					"error":   "Sin rol en el módulo",
					"message": fmt.Sprintf("No tenés un rol asignado en el módulo '%s'. Contactá a tu pastor o administrador.", moduleKey),
					"module":  moduleKey,
				})
			}
			if err != nil {
				log.Printf("❌ Error consultando module_user_roles [module=%s, user=%s]: %v", moduleKey, userID, err)
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Error al verificar acceso al módulo",
				})
			}

			// Paso 4: verificar nivel mínimo
			if roleLevel < minLevel {
				email := c.Get("email")
				role := c.Get("db_role")
				log.Printf("🚫 MODULE ROLE DENIED [%s]: user=%s email=%v erp_role=%v module_level=%d (requiere %d) — %s %s",
					moduleKey, userID, email, role, roleLevel, minLevel,
					c.Request().Method, c.Request().URL.Path)

				return c.JSON(http.StatusForbidden, map[string]string{
					"error":        "Nivel insuficiente en el módulo",
					"message":      fmt.Sprintf("Esta acción requiere nivel %d o superior en el módulo '%s'. Tu nivel actual es %d.", minLevel, moduleKey, roleLevel),
					"module":       moduleKey,
					"module_level": fmt.Sprintf("%d", roleLevel),
					"min_level":    fmt.Sprintf("%d", minLevel),
				})
			}

			// Guardar nivel resuelto en contexto para que los handlers lo usen
			c.Set("module_role_level", roleLevel)
			return next(c)
		}
	}
}
