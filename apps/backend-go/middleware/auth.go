package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"backend-sion/config"

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

			fmt.Printf("🔑 Validating token: %s...\n", token[:20])

			// Validar el token JWT con Supabase
			claims, err := validateSupabaseToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Invalid token: " + err.Error(),
				})
			}
			var dbRole string

			// Obtener la conexión a la base de datos de forma segura
			db := config.GetDB()
			if db != nil && db.DB != nil {
				err = db.DB.QueryRow("SELECT role FROM users WHERE id = $1", claims.Sub).Scan(&dbRole)
				if err != nil {
					fmt.Printf("Could not fetch user role for %s: %v\n", claims.Sub, err)
					dbRole = "guest" // valor por defecto si falla
				}
			} else {
				fmt.Printf("⚠️  Database connection not available, using default role\n")
				dbRole = "guest"
			}

			fmt.Printf("✅ Token valid - User: %s, Email: %s, Role: %s\n", claims.Sub, claims.Email, claims.Role)

			// Agregar claims al contexto
			c.Set("user", claims)
			c.Set("user_id", claims.Sub)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("db_role", dbRole)
			return next(c)
		}
	}
}

func validateSupabaseToken(tokenString string) (*Claims, error) {
	// Supabase usa el JWT_SECRET para validar tokens
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}

	// Parsear el token con el secreto de Supabase
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar que el algoritmo sea HS256 (usado por Supabase)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		// Devolver el secreto como bytes
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("error parsing token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}
