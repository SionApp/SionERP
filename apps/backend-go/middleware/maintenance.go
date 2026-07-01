package middleware

import (
	"net/http"
	"sync"
	"time"

	"backend-sion/config"
	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

// maintenanceEntry cachea el flag por iglesia con TTL corto para no golpear
// la DB en cada request. Apagar/prender tarda hasta 60s en propagar salvo
// que el handler de settings invalide explícitamente (lo hace).
type maintenanceEntry struct {
	on      bool
	expires time.Time
}

var (
	maintenanceMu    sync.Mutex
	maintenanceState = map[string]maintenanceEntry{}
)

// InvalidateMaintenanceCache fuerza la relectura del flag para una iglesia.
// Lo llama UpdateSystemSettings para que el cambio aplique al instante.
func InvalidateMaintenanceCache(churchID string) {
	maintenanceMu.Lock()
	delete(maintenanceState, churchID)
	maintenanceMu.Unlock()
}

// MaintenanceGate devuelve 503 a los usuarios no-staff cuando
// system_settings.maintenance_mode está activo para su iglesia.
// Staff+ (nivel 300) siguen entrando para poder desactivarlo.
func MaintenanceGate() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			dbRole, _ := c.Get("db_role").(string)
			if utils.GetRoleLevel(dbRole) >= utils.LevelStaff {
				return next(c)
			}
			churchID, _ := c.Get("church_id").(string)
			if churchID == "" {
				return next(c)
			}
			if maintenanceOn(churchID) {
				return c.JSON(http.StatusServiceUnavailable, map[string]string{
					"error":   "maintenance_mode",
					"message": "El sistema está en mantenimiento. Intentá de nuevo más tarde.",
				})
			}
			return next(c)
		}
	}
}

func maintenanceOn(churchID string) bool {
	maintenanceMu.Lock()
	e, ok := maintenanceState[churchID]
	maintenanceMu.Unlock()
	if ok && time.Now().Before(e.expires) {
		return e.on
	}

	on := false
	if db := config.GetDB(); db != nil && db.DB != nil {
		_ = db.DB.QueryRow(
			`SELECT maintenance_mode FROM system_settings WHERE church_id = $1 LIMIT 1`,
			churchID,
		).Scan(&on)
	}

	maintenanceMu.Lock()
	maintenanceState[churchID] = maintenanceEntry{on: on, expires: time.Now().Add(60 * time.Second)}
	maintenanceMu.Unlock()
	return on
}
