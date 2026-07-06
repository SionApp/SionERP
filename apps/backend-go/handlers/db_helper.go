package handlers

import (
	"backend-sion/config"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

// getDBOrError obtiene la conexión DB y retorna error si no está disponible
func getDBOrError(c echo.Context) (*config.Database, error) {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return nil, fmt.Errorf("database connection not available")
	}
	return db, nil
}

// validateDB es un helper que valida la conexión DB y retorna error JSON si falla.
// Kept for Phase 3b/3c handlers that have not yet been migrated to validateTx.
func validateDB(c echo.Context) (*config.Database, error) {
	db, err := getDBOrError(c)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": err.Error(),
		})
		return nil, err
	}
	return db, nil
}

// validateTx returns the request-scoped Querier for the current tenant context.
//
// Phase 3+: config.Tx(c) returns the *sql.Tx stashed by TenantTx middleware
// (which already executed set_config('app.current_church_id', …, true) inside
// the transaction).  Falls back to the global pool when no transaction is
// present (unauthenticated paths or Phase 0 pass-through).
//
// Handlers migrated to validateTx must also add AND church_id = $N to every
// query that touches a tenant-scoped table.  The Querier interface is satisfied
// by both *sql.DB and *sql.Tx so call sites are identical.
func validateTx(c echo.Context) (config.Querier, error) {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		err := fmt.Errorf("database connection not available")
		c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": err.Error(),
		})
		return nil, err
	}
	return config.Tx(c), nil
}

