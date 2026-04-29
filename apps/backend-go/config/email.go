package config

import (
	"os"
)

// EmailConfig configuración de Resend
type EmailConfig struct {
	APIKey      string
	FromEmail   string
	FrontendURL string
}

func GetEmailConfig() *EmailConfig {
	return &EmailConfig{
		APIKey:      os.Getenv("RESEND_API_KEY"),
		FromEmail:   os.Getenv("EMAIL_FROM"),
		FrontendURL: os.Getenv("FRONTEND_URL"),
	}
}

// IsEmailEnabled verifica si el email está configurado
func (e *EmailConfig) IsEmailEnabled() bool {
	return e.APIKey != "" && e.APIKey != "re_xxxxx_your_api_key_here"
}