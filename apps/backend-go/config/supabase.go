package config

import (
	"bytes"
	"encoding/json"
	"fmt"
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

	requestBody := GenerateMagicLinkRequest{
		Type:       "magiclink",
		Email:      email,
		Data:       data,
		RedirectTo: redirectTo,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.ServiceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.ServiceKey))

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read the error response body for more details
		var errorResponse map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&errorResponse); err == nil {
			return nil, fmt.Errorf("unexpected status code: %d, error: %v", resp.StatusCode, errorResponse)
		}
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result GenerateMagicLinkResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return nil, err
	}

	return &result, nil

}
