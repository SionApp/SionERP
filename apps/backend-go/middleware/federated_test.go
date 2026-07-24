package middleware

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// signTestFederatedToken firma un token EXACTAMENTE como lo hace bondev
// (ver apps/api/internal/auth/federated.go SignFederatedToken) — no
// importamos ese paquete (repo distinto), así que replicamos el contrato
// acá para el test, con los mismos nombres de claim.
func signTestFederatedToken(t *testing.T, priv ed25519.PrivateKey, claims FederatedClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	signed, err := token.SignedString(priv)
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return signed
}

func testKeyPair(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey, string) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate ed25519 keypair: %v", err)
	}
	pkixBytes, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		t.Fatalf("failed to marshal public key: %v", err)
	}
	pubPEM := string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pkixBytes}))
	return pub, priv, pubPEM
}

func TestParseFederatedPublicKeyPEM_ValidPKIX(t *testing.T) {
	pub, _, pubPEM := testKeyPair(t)
	parsed, err := ParseFederatedPublicKeyPEM(pubPEM)
	if err != nil {
		t.Fatalf("ParseFederatedPublicKeyPEM returned error: %v", err)
	}
	if !pub.Equal(parsed) {
		t.Fatal("parsed public key does not match the original")
	}
}

func TestParseFederatedPublicKeyPEM_InvalidPEM(t *testing.T) {
	if _, err := ParseFederatedPublicKeyPEM("not a pem"); err != ErrInvalidFederatedKey {
		t.Fatalf("expected ErrInvalidFederatedKey, got %v", err)
	}
}

func TestVerifyFederatedToken_ValidToken_ReturnsClaims(t *testing.T) {
	pub, priv, _ := testKeyPair(t)
	now := time.Now()
	claims := FederatedClaims{
		OperatorName: "Admin Preview",
		Tenant:       "00000000-0000-0000-0000-00000000515e",
		Mode:         "read",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "bondev",
			Subject:   "operator-123",
			ID:        "jti-abc",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
		},
	}
	signed := signTestFederatedToken(t, priv, claims)

	got, err := VerifyFederatedToken(signed, pub)
	if err != nil {
		t.Fatalf("VerifyFederatedToken returned error: %v", err)
	}
	if got.Issuer != "bondev" || got.Subject != "operator-123" || got.ID != "jti-abc" {
		t.Fatalf("unexpected registered claims: %+v", got)
	}
	if got.OperatorName != "Admin Preview" || got.Tenant != claims.Tenant || got.Mode != "read" {
		t.Fatalf("unexpected federated claims: %+v", got)
	}
}

func TestVerifyFederatedToken_WrongPublicKey_Rejected(t *testing.T) {
	_, priv, _ := testKeyPair(t)
	otherPub, _, _ := testKeyPair(t) // distinta clave — simula un token no firmado por BonDev
	now := time.Now()
	signed := signTestFederatedToken(t, priv, FederatedClaims{
		Mode: "read",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "bondev", ID: "jti-1",
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
		},
	})

	if _, err := VerifyFederatedToken(signed, otherPub); err != ErrInvalidFederatedToken {
		t.Fatalf("expected ErrInvalidFederatedToken for wrong key, got %v", err)
	}
}

func TestVerifyFederatedToken_Expired_Rejected(t *testing.T) {
	pub, priv, _ := testKeyPair(t)
	past := time.Now().Add(-10 * time.Minute)
	signed := signTestFederatedToken(t, priv, FederatedClaims{
		Mode: "read",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "bondev", ID: "jti-2",
			IssuedAt:  jwt.NewNumericDate(past),
			ExpiresAt: jwt.NewNumericDate(past.Add(5 * time.Minute)), // venció hace 5 min
		},
	})

	if _, err := VerifyFederatedToken(signed, pub); err != ErrInvalidFederatedToken {
		t.Fatalf("expected ErrInvalidFederatedToken for expired token, got %v", err)
	}
}

func TestVerifyFederatedToken_WrongSigningMethod_Rejected(t *testing.T) {
	pub, _, _ := testKeyPair(t)
	// Token HS256 (nada que ver con EdDSA) — no debe validar aunque el
	// caller le pase la clave pública Ed25519 de BonDev.
	hmacToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "bondev", "exp": time.Now().Add(5 * time.Minute).Unix(),
	})
	signed, err := hmacToken.SignedString([]byte("some-secret"))
	if err != nil {
		t.Fatalf("failed to sign HS256 test token: %v", err)
	}

	if _, err := VerifyFederatedToken(signed, pub); err != ErrInvalidFederatedToken {
		t.Fatalf("expected ErrInvalidFederatedToken for wrong signing method, got %v", err)
	}
}
