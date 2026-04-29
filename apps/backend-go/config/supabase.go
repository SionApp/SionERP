package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type SupabaseClient struct {
	ProjectURL string
	ServiceKey string
	Client     *http.Client
}

func NewSupabaseClient() *SupabaseClient {
	return &SupabaseClient{
		ProjectURL: os.Getenv("SUPABASE_URL"),
		ServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		Client:     &http.Client{},
	}
}

type GenerateMagicLinkRequest struct {
	Type       string                 `json:"type"`
	Email      string                 `json:"email"`
	Data       map[string]interface{} `json:"data,omitempty"`
	RedirectTo string                 `json:"redirect_to,omitempty"`
}

type GenerateMagicLinkResponse struct {
	ActionLink       string `json:"action_link"`
	EmailOTP         string `json:"email_otp"`
	HashedToken      string `json:"hashed_token"`
	RedirectTo       string `json:"redirect_to"`
	VerificationType string `json:"verification_type"`
}

func (s *SupabaseClient) GenerateMagicLink(email string, redirectTo string, data map[string]interface{}) (*GenerateMagicLinkResponse, error) {
	url := fmt.Sprintf("%s/auth/v1/admin/generate_link", s.ProjectURL)

	// Validar que tengamos las credenciales necesarias
	if s.ProjectURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is not configured")
	}
	if s.ServiceKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is not configured")
	}

	requestBody := GenerateMagicLinkRequest{
		Type:       "magiclink",
		Email:      email,
		Data:       data,
		RedirectTo: redirectTo,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.ServiceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.ServiceKey))

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read the response body once
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Decode error response from the body bytes
		var errorResponse map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &errorResponse); err == nil {
			return nil, fmt.Errorf("unexpected status code: %d, error: %v", resp.StatusCode, errorResponse)
		}
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	// Decode success response from the body bytes
	var result GenerateMagicLinkResponse
	err = json.Unmarshal(bodyBytes, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil

}

// CreateUserWithEmailPassword creates a user directly with email and password using the Supabase Admin API
type CreateUserRequest struct {
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	UserMeta map[string]interface{} `json:"user_metadata,omitempty"`
}

type CreateUserResponse struct {
	ID    string                 `json:"id"`
	Email string                 `json:"email"`
	Meta  map[string]interface{} `json:"user_metadata"`
}

func (s *SupabaseClient) CreateUserWithEmailPassword(email, password string, userMeta map[string]interface{}) (*CreateUserResponse, error) {
	url := fmt.Sprintf("%s/auth/v1/admin/users", s.ProjectURL)

	if s.ProjectURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is not configured")
	}
	if s.ServiceKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is not configured")
	}

	requestBody := CreateUserRequest{
		Email:    email,
		Password: password,
		UserMeta: userMeta,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.ServiceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.ServiceKey))

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errorResponse map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &errorResponse); err == nil {
			return nil, fmt.Errorf("unexpected status code: %d, error: %v", resp.StatusCode, errorResponse)
		}
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var result CreateUserResponse
	err = json.Unmarshal(bodyBytes, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}
