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

// validateDB es un helper que valida la conexión DB y retorna error JSON si falla
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

