package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"

	"backend-sion/config"
	"backend-sion/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// ── JWKS cache ──────────────────────────────────────────────────────────────

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

var (
	jwksCache   *jwksResponse
	jwksCacheMu sync.RWMutex
)

// fetchJWKS obtiene (y cachea) las claves públicas de Supabase.
func fetchJWKS() (*jwksResponse, error) {
	jwksCacheMu.RLock()
	if jwksCache != nil {
		defer jwksCacheMu.RUnlock()
		return jwksCache, nil
	}
	jwksCacheMu.RUnlock()

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not configured")
	}

	resp, err := http.Get(supabaseURL + "/auth/v1/.well-known/jwks.json")
	if err != nil {
		return nil, fmt.Errorf("error fetching JWKS: %w", err)
	}
	defer resp.Body.Close()

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("error decoding JWKS: %w", err)
	}

	jwksCacheMu.Lock()
	jwksCache = &jwks
	jwksCacheMu.Unlock()

	fmt.Printf("🔐 JWKS loaded: %d key(s) from %s\n", len(jwks.Keys), supabaseURL)
	return &jwks, nil
}

// ecPublicKeyFromJWK convierte un JWK EC a *ecdsa.PublicKey.
func ecPublicKeyFromJWK(key jwkKey) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(key.X)
	if err != nil {
		return nil, fmt.Errorf("error decoding JWK X: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(key.Y)
	if err != nil {
		return nil, fmt.Errorf("error decoding JWK Y: %w", err)
	}

	// Supabase Cloud usa P-256 (ES256)
	pubKey := &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}
	return pubKey, nil
}

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

		// Get the database connection safely
		var dbRole string
		var isSuperAdmin bool
		var actualUserID string // Este será el business UUID (id)
		db := config.GetDB()
		if db != nil && db.DB != nil {
			// Buscar por id (que ahora es el MISMO que el JWT sub/Auth ID)
			err := db.DB.QueryRow("SELECT id, role, COALESCE(is_super_admin, false) FROM users WHERE id = $1", claims.Sub).Scan(&actualUserID, &dbRole, &isSuperAdmin)
			if err != nil {
				fmt.Printf("⚠️  User not found with id = %s (JWT sub). Error: %v\n", claims.Sub, err)
				dbRole = utils.RoleGuest
				actualUserID = claims.Sub
			}
		} else {
			fmt.Printf("⚠️  Database connection not available, using default role\n")
			dbRole = utils.RoleGuest
			actualUserID = claims.Sub
		}

			fmt.Printf("✅ Token valid - User: %s, Email: %s, Role: %s\n", actualUserID, claims.Email, dbRole)

			// Agregar claims al contexto - USAR SIEMPRE EL BUSINESS UUID (id)
			c.Set("user", claims)
			c.Set("user_id", actualUserID) // ← ¡ESTE ES EL BUSINESS UUID!
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("db_role", dbRole)
			// Set admin_access flag for roles with admin privileges
			c.Set("has_admin_access", HasAdminAccess(dbRole, isSuperAdmin))
			return next(c)
		}
	}
}

func validateSupabaseToken(tokenString string) (*Claims, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}

	// Parsear el token con el secreto de Supabase.
	// • Supabase local  → HS256 (HMAC con secreto compartido)
	// • Supabase Cloud  → ES256 (ECDSA; la clave pública viene del endpoint JWKS)
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		switch token.Method.(type) {

		case *jwt.SigningMethodHMAC:
			// Supabase local: usar JWT_SECRET directamente como bytes
			return []byte(jwtSecret), nil

		case *jwt.SigningMethodECDSA:
			// Supabase Cloud: obtener la clave pública desde el endpoint JWKS
			jwks, err := fetchJWKS()
			if err != nil {
				return nil, fmt.Errorf("error fetching JWKS: %w", err)
			}
			if len(jwks.Keys) == 0 {
				return nil, fmt.Errorf("JWKS returned no keys")
			}
			// Usar la primera clave EC disponible (kid matching opcional)
			for _, k := range jwks.Keys {
				if k.Kty == "EC" {
					return ecPublicKeyFromJWK(k)
				}
			}
			return nil, fmt.Errorf("no EC key found in JWKS")

		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
	})

	if err != nil {
		return nil, fmt.Errorf("error parsing token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// HasAdminAccess checks if a user has admin access
// Uses utils.IsAdminRole (pastor or staff) — super admins always have access
// HasAdminAccess checks if a user has admin-level access (pastor, staff, or super admin).
func HasAdminAccess(dbRole string, isSuperAdmin bool) bool {
	if isSuperAdmin {
		return true
	}
	return utils.IsAdminRole(dbRole)
}

// OptionalAuth middleware attempts to validate Supabase JWT token if present.
// If the token is missing or invalid, proceeds as guest (no error returned).
func OptionalAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return next(c)
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				return next(c)
			}

			claims, err := validateSupabaseToken(token)
			if err != nil {
				return next(c)
			}

			var dbRole string
			var isSuperAdmin bool
			var actualUserID string
			db := config.GetDB()
			if db != nil && db.DB != nil {
				err := db.DB.QueryRow(
					"SELECT id, role, COALESCE(is_super_admin, false) FROM users WHERE id = $1",
					claims.Sub,
				).Scan(&actualUserID, &dbRole, &isSuperAdmin)
				if err != nil {
					dbRole = utils.RoleGuest
					actualUserID = claims.Sub
				}
			} else {
				dbRole = utils.RoleGuest
				actualUserID = claims.Sub
			}

			c.Set("user", claims)
			c.Set("user_id", actualUserID)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("db_role", dbRole)
			c.Set("has_admin_access", HasAdminAccess(dbRole, isSuperAdmin))

			return next(c)
		}
	}
}
