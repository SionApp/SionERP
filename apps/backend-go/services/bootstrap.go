package services

import (
	"backend-sion/config"
	"backend-sion/utils"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
)

// BootstrapSuperAdmin creates a super admin user from environment variables
// if one doesn't already exist. This is used for first-time production deploy.
//
// It ensures the Auth user and the public user are perfectly synced with IDs.
func BootstrapSuperAdmin(db *sql.DB) error {
	adminEmail := os.Getenv("SION_ADMIN_EMAIL")
	if adminEmail == "" {
		log.Println("[bootstrap] SION_ADMIN_EMAIL not set, skipping super admin bootstrap")
		return nil
	}

	adminPassword := os.Getenv("SION_ADMIN_PASSWORD")
	if adminPassword == "" {
		return fmt.Errorf("[bootstrap] SION_ADMIN_EMAIL is set but SION_ADMIN_PASSWORD is not")
	}

	adminRole := os.Getenv("SION_ADMIN_ROLE")
	if adminRole == "" {
		adminRole = utils.RoleAdmin
	}

	supabase := config.NewSupabaseClient()

	// 1. Check if Auth user exists
	authUser, err := supabase.GetUserByEmail(adminEmail)
	var authID string

	if err != nil {
		// User not found in Auth -> Create it
		log.Printf("[bootstrap] Auth user not found, creating: %s", adminEmail)
		authUser, err = supabase.CreateUserWithEmailPassword(adminEmail, adminPassword, map[string]interface{}{
			"role": adminRole,
		})

		if err != nil {
			// If it fails because user already exists (race condition or previous partial run), try to fetch
			if strings.Contains(err.Error(), "422") || strings.Contains(err.Error(), "already") {
				log.Printf("[bootstrap] Auth user already exists, fetching details: %s", adminEmail)
				authUser, err = supabase.GetUserByEmail(adminEmail)
				if err != nil {
					return fmt.Errorf("[bootstrap] failed to fetch existing auth user: %w", err)
				}
			} else {
				return fmt.Errorf("[bootstrap] failed to create auth user: %w", err)
			}
		}
		log.Printf("[bootstrap] Created auth user: %s (id: %s)", adminEmail, authUser.ID)
	} else {
		log.Printf("[bootstrap] Auth user already exists: %s (id: %s)", adminEmail, authUser.ID)
	}

	authID = authUser.ID

	// 2. Ensure public.users entry matches the Auth ID.
	// If a user with this email exists but has a different ID (e.g. from seed.sql),
	// we delete it to prevent ID mismatches where JWT sub != user ID.
	_, _ = db.Exec("DELETE FROM public.users WHERE email = $1 AND id != $2", adminEmail, authID)

	return ensurePublicUser(db, authID, adminEmail, adminRole)
}

// ensurePublicUser creates or updates the public.users entry for the super admin
// using the exact Auth ID to ensure consistency.
func ensurePublicUser(db *sql.DB, authID, email, role string) error {
	idNumber := "ADMIN-BOOTSTRAP"

	// Try to update existing record (if it exists with the correct ID)
	result, err := db.Exec(
		`UPDATE public.users SET
			is_super_admin = true,
			role = $1,
			first_name = COALESCE(first_name, 'Admin'),
			last_name = COALESCE(last_name, 'SionERP'),
			phone = COALESCE(phone, '+00-000-000-0000'),
			address = COALESCE(address, 'Platform'),
			is_active = true
		WHERE id = $2`,
		role, authID,
	)
	if err != nil {
		return fmt.Errorf("[bootstrap] failed to update public user: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows > 0 {
		log.Printf("[bootstrap] Updated existing public user as super admin: %s", email)
		return nil
	}

	// No existing record with this ID -> insert new one
	_, err = db.Exec(
		`INSERT INTO public.users (id, id_number, first_name, last_name, phone, address, email, role, is_active, is_super_admin, auth_id)
		VALUES ($1, $2, 'Admin', 'SionERP', '+00-000-000-0000', 'Platform', $3, $4, true, true, $5)
		ON CONFLICT (id) DO UPDATE SET is_super_admin = true, role = $4`,
		authID, idNumber, email, role, authID,
	)
	if err != nil {
		return fmt.Errorf("[bootstrap] failed to insert public user: %w", err)
	}

	log.Printf("[bootstrap] Created new public user as super admin: %s (id: %s)", email, authID)
	return nil
}
