package database

import (
	"strings"
	"testing"
)

func TestBuildUpdateQueryFromMap_ValidColumns(t *testing.T) {
	query, args, err := BuildUpdateQueryFromMap(
		map[string]interface{}{"theme": "dark", "language": "en"},
		"user_preferences", "user_id", "u1",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(query, "UPDATE user_preferences SET ") {
		t.Errorf("unexpected query: %s", query)
	}
	if !strings.Contains(query, "updated_at = NOW()") {
		t.Errorf("missing updated_at: %s", query)
	}
	// 2 values + idValue
	if len(args) != 3 {
		t.Errorf("expected 3 args, got %d", len(args))
	}
}

func TestBuildUpdateQueryFromMap_RejectsInjectionKeys(t *testing.T) {
	malicious := []string{
		"theme = (SELECT email FROM users LIMIT 1), language",
		"theme; DROP TABLE users; --",
		"theme\"",
		"Theme",       // mayúscula — no es snake_case
		"1theme",      // no empieza con letra
		"theme space", // espacio
	}
	for _, key := range malicious {
		_, _, err := BuildUpdateQueryFromMap(
			map[string]interface{}{key: "x"},
			"user_preferences", "user_id", "u1",
		)
		if err == nil {
			t.Errorf("key %q should have been rejected", key)
		}
	}
}

func TestBuildUpdateQueryFromMap_SkipsNilByDefault(t *testing.T) {
	// nil-skip: solo el campo con valor real entra; el null se ignora.
	query, args, err := BuildUpdateQueryFromMap(
		map[string]interface{}{"logo_url": nil, "name": "Sion"},
		"church_info", "id", "c1",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(query, "logo_url") {
		t.Errorf("nil logo_url should be skipped: %s", query)
	}
	if len(args) != 2 { // name + idValue
		t.Errorf("expected 2 args, got %d", len(args))
	}
}

func TestBuildUpdateQueryFromMapWithNulls_ClearsField(t *testing.T) {
	// WithNulls: un null explícito se traduce a SET NULL (borrar logo).
	query, args, err := BuildUpdateQueryFromMapWithNulls(
		map[string]interface{}{"logo_url": nil},
		"church_info", "id", "c1",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(query, "logo_url = $1") {
		t.Errorf("expected 'logo_url = $1', got: %s", query)
	}
	if args[0] != nil {
		t.Errorf("expected nil arg for cleared field, got %v", args[0])
	}
	// Aun con WithNulls, las columnas protegidas nunca se tocan.
	if _, _, err := BuildUpdateQueryFromMapWithNulls(
		map[string]interface{}{"church_id": nil}, "church_info", "id", "c1",
	); err == nil || !strings.Contains(err.Error(), "no fields to update") {
		t.Errorf("protected column must be skipped even with nulls; got %v", err)
	}
}

func TestBuildUpdateQueryFromMap_SkipsProtectedColumns(t *testing.T) {
	// church_id/user_id/id/timestamps se ignoran silenciosamente;
	// si solo vienen protegidas, no hay nada que actualizar.
	_, _, err := BuildUpdateQueryFromMap(
		map[string]interface{}{"church_id": "otra-iglesia", "id": "x", "user_id": "y"},
		"user_preferences", "user_id", "u1",
	)
	if err == nil || !strings.Contains(err.Error(), "no fields to update") {
		t.Errorf("expected 'no fields to update', got %v", err)
	}

	// Mezcladas con una válida: la protegida no aparece en el SET.
	query, args, err := BuildUpdateQueryFromMap(
		map[string]interface{}{"church_id": "otra-iglesia", "theme": "dark"},
		"user_preferences", "user_id", "u1",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Contains(query, "church_id") {
		t.Errorf("church_id must never be updatable via payload: %s", query)
	}
	if len(args) != 2 { // theme + idValue
		t.Errorf("expected 2 args, got %d", len(args))
	}
}
