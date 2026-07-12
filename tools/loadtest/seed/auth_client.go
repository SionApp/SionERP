package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

const defaultLocalSupabaseURL = "http://127.0.0.1:54321"

// supabaseAuthConfig resolves the Admin API base URL + service key from the
// environment, defaulting the URL to the local Supabase instance.
type supabaseAuthConfig struct {
	baseURL    string
	serviceKey string
}

func loadSupabaseAuthConfig() (supabaseAuthConfig, error) {
	cfg := supabaseAuthConfig{
		baseURL:    os.Getenv("SUPABASE_URL"),
		serviceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
	}
	if cfg.baseURL == "" {
		cfg.baseURL = defaultLocalSupabaseURL
	}
	if err := assertLocalDBURL(cfg.baseURL); err != nil {
		return cfg, err
	}
	if cfg.serviceKey == "" {
		return cfg, fmt.Errorf(
			"SUPABASE_SERVICE_ROLE_KEY is not set — required to create the per-tenant " +
				"session/login user via the Supabase Auth Admin API. Export it from " +
				"apps/backend-go/.env (same value the backend itself uses locally)",
		)
	}
	return cfg, nil
}

type createUserRequest struct {
	Email        string                 `json:"email"`
	Password     string                 `json:"password"`
	UserMeta     map[string]interface{} `json:"user_metadata,omitempty"`
	EmailConfirm bool                   `json:"email_confirm"`
}

type createUserResponse struct {
	ID string `json:"id"`
}

// createAuthSessionUser creates the ONE real Supabase Auth user per tenant
// that the k6 scenario logs in as (see SeedTenants doc comment).
//
// Deliberately does NOT set app_metadata.church_id: middleware.SupabaseAuth
// only reads church_id from app_metadata (not user_metadata) into the JWT
// claim that middleware.TenantTx checks — see apps/backend-go/middleware/auth.go
// AppMetaClaims / tenant.go. Passing church_id via user_metadata instead lets
// the public.handle_new_user trigger populate users.church_id correctly for
// realistic per-tenant data WITHOUT putting church_id in the JWT, so TenantTx
// stays a no-op pass-through — matching today's Phase-0 production reality
// (multi-tenancy enforcement is intentionally not rolled out yet).
func createAuthSessionUser(email, password string, tenantIdx int, churchID string) (string, error) {
	cfg, err := loadSupabaseAuthConfig()
	if err != nil {
		return "", err
	}

	body := createUserRequest{
		Email:    email,
		Password: password,
		UserMeta: map[string]interface{}{
			"first_name": "LoadTest",
			"last_name":  fmt.Sprintf("Pastor%d", tenantIdx),
			"id_number":  UserIDNumber(tenantIdx, 0),
			"phone":      "+00-000-000-0000",
			"address":    "N/A (synthetic load test user)",
			"role":       "pastor",
			"church_id":  churchID,
		},
		EmailConfirm: true,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal create-user request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, cfg.baseURL+"/auth/v1/admin/users", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("build create-user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", cfg.serviceKey)
	req.Header.Set("Authorization", "Bearer "+cfg.serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("call Supabase Auth Admin API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read create-user response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("create-user for %s failed: status=%d body=%s", email, resp.StatusCode, string(respBody))
	}

	var result createUserResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("decode create-user response: %w", err)
	}
	if result.ID == "" {
		return "", fmt.Errorf("create-user for %s returned an empty id (body=%s)", email, string(respBody))
	}
	return result.ID, nil
}

// deleteAuthUser hard-deletes a Supabase Auth user by id — used by cleanup.
func deleteAuthUser(userID string) error {
	cfg, err := loadSupabaseAuthConfig()
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodDelete, cfg.baseURL+"/auth/v1/admin/users/"+userID, nil)
	if err != nil {
		return fmt.Errorf("build delete-user request: %w", err)
	}
	req.Header.Set("apikey", cfg.serviceKey)
	req.Header.Set("Authorization", "Bearer "+cfg.serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("call Supabase Auth Admin API delete: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete-user %s failed: status=%d body=%s", userID, resp.StatusCode, string(respBody))
	}
	return nil
}
