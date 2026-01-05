package models

import "time"

type Module struct {
	Key         string     `json:"key"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IsInstalled bool       `json:"is_installed"`
	InstalledAt *time.Time `json:"installed_at"`
}

type SetupRequest struct {
	AdminUser       User     `json:"admin_user"`
	SelectedModules []string `json:"selected_modules"` // List of module keys to install
}

type SetupStatusResponse struct {
	IsInitialized bool     `json:"is_initialized"`
	HasAdmin      bool     `json:"has_admin"`      // Indicates if any admin user exists
	Modules       []Module `json:"modules"`
}
