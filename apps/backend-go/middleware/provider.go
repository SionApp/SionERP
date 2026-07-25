// Package middleware — auth de servicio para los endpoints /provider/*
// (SionERP Provider API, consumidos por BonDev). Ver SDD en Engram,
// proyecto "sionerp", topic sdd/provider-api/{proposal,spec,design,tasks}.
//
// No es un JWT de usuario ni una sesión: es servidor-a-servidor, de larga
// duración, sin usuario humano detrás — un secreto compartido comparado en
// tiempo constante es la herramienta correcta (ver design, Decisión 1).
package middleware

import (
	"crypto/subtle"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
)

// ProviderKeyAuth valida el header X-Provider-Key contra PROVIDER_API_KEY.
// v1: un solo proveedor (BonDev), un solo secreto estático — sin tabla de
// keys ni rotación hasta que haga falta un segundo proveedor.
func ProviderKeyAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			expected := os.Getenv("PROVIDER_API_KEY")
			got := c.Request().Header.Get("X-Provider-Key")

			if expected == "" || got == "" ||
				subtle.ConstantTimeCompare([]byte(expected), []byte(got)) != 1 {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "invalid provider key",
				})
			}

			return next(c)
		}
	}
}
