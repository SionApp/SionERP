package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
)

type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// SupabaseAuth middleware para validar tokens JWT de Supabase
func SupabaseAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authorization header required",
				})
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Bearer token required",
				})
			}

			// Aquí validarías el token JWT con Supabase
			// Por ahora, simulamos la validación
			claims, err := validateSupabaseToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Invalid token",
				})
			}

			// Agregar claims al contexto
			c.Set("user", claims)
			return next(c)
		}
	}
}

func validateSupabaseToken(token string) (*Claims, error) {
	// TODO: Implementar validación real del JWT de Supabase
	// usando la clave pública de Supabase
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not configured")
	}

	// Por ahora retornamos claims dummy para desarrollo
	return &Claims{
		Sub:   "dummy-user-id",
		Email: "user@example.com",
		Role:  "authenticated",
	}, nil
}