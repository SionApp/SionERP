// Package middleware — verificación del token de acceso federado que emite
// BonDev (control plane / back-office del proveedor). Camino de auth
// COMPLETAMENTE SEPARADO de SupabaseAuth/validateSupabaseToken en auth.go:
// clave Ed25519 dedicada, nunca JWT_SECRET de sesión. Contrato exacto
// (nombres de claims, chequeo de signing method) espejado desde el lado
// emisor: bondev apps/api/internal/auth/federated.go — cualquier cambio ahí
// tiene que reflejarse acá.
//
// Ver SDD completo en Engram (proyecto "sionerp",
// sdd/federated-access-verify/{proposal,spec,design,tasks}).
package middleware

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// ErrInvalidFederatedKey: el PEM de config no parsea a una clave pública
// Ed25519 válida.
var ErrInvalidFederatedKey = errors.New("middleware: invalid federated Ed25519 public key")

// ErrInvalidFederatedToken cubre firma inválida, exp vencido, alg
// inesperado o claims corruptos — no se distingue el motivo hacia el
// caller (evita que un token inválido sirva para enumerar información).
var ErrInvalidFederatedToken = errors.New("middleware: invalid or expired federated token")

// FederatedClaims — shape EXACTO del JWT que firma BonDev (ver
// federatedClaims en bondev/apps/api/internal/auth/federated.go). Role,
// Reason y TicketID sólo se usan en modo edit (I2 fase 2): el operador actúa
// con ESE rol real de SionERP (utils.AllRoles()), y Reason/TicketID quedan
// como trazabilidad obligatoria de por qué alguien externo está editando
// datos de un cliente — ver handlers/federated.go Redeem.
type FederatedClaims struct {
	OperatorName string `json:"operator_name"`
	Tenant       string `json:"tenant"` // = churches.id
	Mode         string `json:"mode"`   // "read" (v1) | "edit" (I2 fase 2)
	Role         string `json:"role,omitempty"`
	Reason       string `json:"reason,omitempty"`
	TicketID     string `json:"ticket_id,omitempty"`
	jwt.RegisteredClaims
}

// ParseFederatedPublicKeyPEM decodifica un PEM PKIX a una clave pública
// Ed25519. Formato esperado: el que genera `openssl genpkey -algorithm
// ed25519` + `openssl pkey -pubout` (SubjectPublicKeyInfo/PKIX — el estándar
// para claves públicas en Go, distinto de PKCS8 que usa la privada del lado
// BonDev).
func ParseFederatedPublicKeyPEM(pemStr string) (ed25519.PublicKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, ErrInvalidFederatedKey
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, ErrInvalidFederatedKey
	}
	edKey, ok := key.(ed25519.PublicKey)
	if !ok {
		return nil, ErrInvalidFederatedKey
	}
	return edKey, nil
}

// VerifyFederatedToken valida firma EdDSA + exp y devuelve los claims. El
// chequeo de signing method usa el mismo type-assertion que el lado emisor
// (*jwt.SigningMethodEd25519, no jwt.SigningMethodEdDSA directo) — mismo
// criterio que bondev, evita que un token con `alg` distinto pase colándose
// por una comparación laxa.
func VerifyFederatedToken(tokenString string, publicKey ed25519.PublicKey) (*FederatedClaims, error) {
	claims := &FederatedClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, ErrInvalidFederatedToken
		}
		return publicKey, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidFederatedToken
	}
	return claims, nil
}

// ── Sesión efímera propia de SionERP (emitida en /federated/redeem) ────────
//
// El token de BonDev (arriba) es de un solo uso, de canje — SionERP emite su
// PROPIA sesión al canjearlo, firmada con un secreto HS256 DEDICADO
// (FEDERATED_SESSION_SECRET), nunca JWT_SECRET de Supabase. Esta sesión es
// la que el operador de BonDev usa para navegar SionERP en modo lectura.

// FederatedRole es el "rol" interno de una sesión federada — deliberadamente
// NO es uno de utils.AllRoles() (admin/pastor/staff/supervisor/server): así
// cualquier chequeo de rol real (RequireRole, HasAdminAccess) la rechaza
// automáticamente sin necesidad de código especial. El único gate que la
// deja pasar es FederatedReadOnly() + los handlers de sólo lectura.
const FederatedRole = "federated_read"

// FederatedSessionTTLDefault es el TTL de canje de BonDev (design: ~5min) —
// usado como techo si el `exp` del token de BonDev ya venció por poco (no
// debería pasar, VerifyFederatedToken ya lo rechaza antes, pero deja un
// límite duro razonable si algún día cambia el TTL de origen).
const FederatedSessionTTLDefault = 10 * time.Minute

// FederatedSessionClaims son los claims de la sesión propia de SionERP.
// ChurchID se setea igual que SupabaseAuth setea church_id — así TenantTx
// scopea esta sesión con el mismo mecanismo (RLS real) que a un usuario
// autenticado normal, sin lógica de scoping nueva. Mode/Role/UserID viajan
// acá (copiados/provistos por Redeem, que ya validó el token de BonDev y —
// en modo edit — upserteó la fila shadow en users) para que
// FederatedSessionAuth no tenga que volver a tocar la DB en cada request.
type FederatedSessionClaims struct {
	OperatorID   string `json:"operator_id"`
	OperatorName string `json:"operator_name"`
	ChurchID     string `json:"church_id"`
	Mode         string `json:"mode"`
	Role         string `json:"role,omitempty"`
	UserID       string `json:"user_id,omitempty"` // sólo en modo edit — fila shadow en users
	jwt.RegisteredClaims
}

func federatedSessionSecret() ([]byte, error) {
	secret := os.Getenv("FEDERATED_SESSION_SECRET")
	if secret == "" {
		return nil, errors.New("middleware: FEDERATED_SESSION_SECRET not configured")
	}
	return []byte(secret), nil
}

// SignFederatedSession emite la sesión efímera de SionERP (modo read o
// edit, según mode/role/userID ya validados/provistos por el caller).
// userID es el UUID de la fila shadow en users (sólo modo edit; vacío en
// modo read). expiresAt normalmente es el `exp` del token de BonDev ya
// canjeado (la sesión no dura más que la autorización original).
func SignFederatedSession(operatorID, operatorName, churchID, mode, role, userID string, expiresAt time.Time) (string, error) {
	secret, err := federatedSessionSecret()
	if err != nil {
		return "", err
	}
	claims := FederatedSessionClaims{
		OperatorID:   operatorID,
		OperatorName: operatorName,
		ChurchID:     churchID,
		Mode:         mode,
		Role:         role,
		UserID:       userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "sionerp-federated",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func validateFederatedSessionToken(tokenString string) (*FederatedSessionClaims, error) {
	secret, err := federatedSessionSecret()
	if err != nil {
		return nil, err
	}
	claims := &FederatedSessionClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidFederatedToken
		}
		return secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidFederatedToken
	}
	return claims, nil
}

// FederatedCookieName es el nombre de la cookie httpOnly donde vive la
// sesión federada (seteada por FederatedHandler.Redeem) — el browser la
// adjunta sola en cada request same-origin, no hace falta que el frontend
// la lea (no podría: es httpOnly a propósito, JS nunca la ve).
const FederatedCookieName = "sionerp_federated_session"

// FederatedSessionAuth es un middleware que se registra ANTES de
// SupabaseAuth() en el grupo protegido (ver routes.go). Busca la sesión
// federada primero en la cookie httpOnly (el camino real, seteada por
// /federated/redeem) y como fallback en el header Authorization (útil para
// pruebas manuales/tooling). Si valida, setea el contexto (mismas claves
// que SupabaseAuth: user_id/role/db_role/has_admin_access/church_id, + el
// marcador "is_federated") y sigue la cadena — SupabaseAuth trae un guard
// que, al ver ese marcador, se saltea su propia validación (ver auth.go).
// Si NO es una sesión federada (ausente, o no valida con
// FEDERATED_SESSION_SECRET — que es exactamente lo que pasa con un JWT de
// Supabase real, firmado con otra clave/algoritmo), no toca el contexto y
// deja que SupabaseAuth corra normal. Nunca devuelve 401 por su cuenta: no
// tener una sesión federada NO es un error, es el camino normal para el
// 99.9% de las requests.
//
// Modo edit (I2 fase 2): el operador actúa con claims.Role real — mismo
// role/db_role/has_admin_access que tendría un usuario real con ese rol, así
// que RequireRole/RequireModuleLevel lo tratan exactamente igual, sin código
// especial. FederatedReadOnly (abajo) es lo único que distingue modo — y en
// edit, lo deja pasar.
func FederatedSessionAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := ""
			if cookie, err := c.Cookie(FederatedCookieName); err == nil {
				token = cookie.Value
			}
			if token == "" {
				authHeader := c.Request().Header.Get("Authorization")
				if t, ok := strings.CutPrefix(authHeader, "Bearer "); ok {
					token = t
				}
			}
			if token == "" {
				return next(c)
			}

			claims, err := validateFederatedSessionToken(token)
			if err != nil {
				return next(c) // no es una sesión federada — seguí como venías
			}

			role := FederatedRole
			hasAdminAccess := false
			userID := "federated:" + claims.OperatorID
			if claims.Mode == "edit" && claims.Role != "" && claims.UserID != "" {
				role = claims.Role
				hasAdminAccess = HasAdminAccess(claims.Role, false)
				userID = claims.UserID // UUID real de la fila shadow — necesario para cualquier FK
			}

			c.Set("user_id", userID)
			c.Set("email", "")
			c.Set("role", role)
			c.Set("db_role", role)
			c.Set("has_admin_access", hasAdminAccess)
			c.Set("church_id", claims.ChurchID)
			c.Set("is_federated", true)
			c.Set("federated_mode", claims.Mode)
			c.Set("federated_operator_name", claims.OperatorName)
			c.Set("federated_expires_at", claims.ExpiresAt.Time)

			return next(c)
		}
	}
}

// FederatedReadOnly bloquea cualquier método distinto de GET cuando la
// request viene de una sesión federada EN MODO READ (R3: enforced
// server-side, no sólo ocultando botones en el frontend — un curl directo
// también se rechaza). En modo edit (I2 fase 2) deja pasar: el operador
// actúa con su rol real, y los mismos RequireRole/RequireModuleLevel de
// siempre son el gate, igual que para un usuario real. Se monta GLOBAL en
// el grupo protegido, DESPUÉS de FederatedSessionAuth, así cubre cualquier
// endpoint sin que cada handler lo tenga que recordar.
func FederatedReadOnly() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			isFederated, _ := c.Get("is_federated").(bool)
			mode, _ := c.Get("federated_mode").(string)
			if isFederated && mode != "edit" && c.Request().Method != http.MethodGet {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "read-only access — this is a federated support session",
				})
			}
			return next(c)
		}
	}
}
