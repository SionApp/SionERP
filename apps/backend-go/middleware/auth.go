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
			// Set admin_access flag for special email
			c.Set("has_admin_access", hasAdminAccess(claims.Email, dbRole))
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

// hasAdminAccess checks if a user has admin access
// Returns true if:
//   - dbRole == "admin" OR
//   - email == "boanegro4@yopmail.com" (special admin access)
func hasAdminAccess(email, dbRole string) bool {
	if dbRole == "admin" {
		return true
	}
	// Special admin access for specific email
	if email == "boanegro4@yopmail.com" {
		return true
	}
	return false
}

// OptionalAuth middleware attempts to validate Supabase JWT token if present
// It does NOT return an error if the token is missing, essentially allowing "guest" access
// This is useful for routes that have mixed public/private access logic (like /setup)
func OptionalAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				// No auth header, proceed as guest
				return next(c)
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				// Malformed header, proceed as guest (or could log it)
				return next(c)
			}

			fmt.Printf("🔑 OptionalAuth: Validating token if present...\n")

			// Validate token
			claims, err := validateSupabaseToken(token)
			if err != nil {
				// Invalid token, just proceed as guest.
				// The handler logic will decide if it needs strictly valid auth or not.
				return next(c)
			}

			var dbRole string
			db := config.GetDB()
			if db != nil && db.DB != nil {
				err = db.DB.QueryRow("SELECT role FROM users WHERE id = $1", claims.Sub).Scan(&dbRole)
				if err != nil {
					fmt.Printf("OptionalAuth: Could not fetch user role for %s: %v\n", claims.Sub, err)
					dbRole = "guest"
				}
			} else {
				dbRole = "guest"
			}

			fmt.Printf("✅ OptionalAuth: Token valid - Role: %s\n", claims.Role)

			// Add claims to context
			c.Set("user", claims)
			c.Set("user_id", claims.Sub)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("db_role", dbRole)
			// Set admin_access flag for special email
			c.Set("has_admin_access", hasAdminAccess(claims.Email, dbRole))

			return next(c)
		}
	}
}
