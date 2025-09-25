package middleware

import (
	"crypto/rsa"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
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

			// Validar el token JWT con Supabase
			claims, err := validateSupabaseToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Invalid token: " + err.Error(),
				})
			}

			// Agregar claims al contexto
			c.Set("user", claims)
			return next(c)
		}
	}
}

func validateSupabaseToken(tokenString string) (*Claims, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not configured")
	}

	// En desarrollo, usar validación simple
	if os.Getenv("GO_ENV") == "development" {
		return &Claims{
			Sub:   "dummy-user-id",
			Email: "user@example.com",
			Role:  "authenticated",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}, nil
	}

	// Parsear el token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar que el algoritmo sea el esperado
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Obtener la clave pública de Supabase
		publicKey, err := getSupabasePublicKey()
		if err != nil {
			return nil, err
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func getSupabasePublicKey() (*rsa.PublicKey, error) {
	// En producción, esto debería obtener la clave pública de Supabase
	// desde el endpoint /.well-known/jwks.json
	// Por ahora, devolvemos un error para forzar el uso del modo desarrollo
	return nil, fmt.Errorf("production JWT validation not implemented yet")
}