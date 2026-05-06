package services

import (
	"backend-sion/config"
	"backend-sion/utils"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
)

// BootstrapSuperAdmin creates a super admin user from environment variables
// if one doesn't already exist. Uses a single UUID for both Auth and public.users.
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

	// 1. Check if Auth user already exists
	authUser, err := supabase.GetUserByEmail(adminEmail)
	var userID string

	if err != nil {
		// Not found in Auth — generate one UUID for both Auth and public.users
		userID = uuid.New().String()
		log.Printf("[bootstrap] Auth user not found, creating: %s", adminEmail)

		authUser, err = supabase.CreateUserWithEmailPassword(adminEmail, adminPassword, map[string]interface{}{
			"role": adminRole,
		}, userID)

		if err != nil {
			// Race condition or previous partial run — try fetching again
			if strings.Contains(err.Error(), "422") || strings.Contains(err.Error(), "already") {
				log.Printf("[bootstrap] Auth user already exists, fetching: %s", adminEmail)
				authUser, err = supabase.GetUserByEmail(adminEmail)
				if err != nil {
					return fmt.Errorf("[bootstrap] failed to fetch existing auth user: %w", err)
				}
				userID = authUser.ID
			} else {
				return fmt.Errorf("[bootstrap] failed to create auth user: %w", err)
			}
		} else {
			userID = authUser.ID
			log.Printf("[bootstrap] Created auth user: %s (id: %s)", adminEmail, userID)
		}
	} else {
		userID = authUser.ID
		log.Printf("[bootstrap] Auth user already exists: %s (id: %s)", adminEmail, userID)
	}

	// 2. If there's a stale public.users row with a different id for this email, remove it
	db.Exec("DELETE FROM public.users WHERE email = $1 AND id::text != $2", adminEmail, userID)

	// 3. Ensure public.users has a row with id = userID (same as auth UUID)
	return ensurePublicUser(db, userID, adminEmail, adminRole)
}

// ensurePublicUser creates or updates the public.users row for the super admin.
// id must equal the Supabase Auth UUID — single source of truth.
func ensurePublicUser(db *sql.DB, userID, email, role string) error {
	const idNumber = "ADMIN-BOOTSTRAP"

	// Try updating if the row already exists with this id
	result, err := db.Exec(
		`UPDATE public.users SET
			is_super_admin = true,
			role            = $1,
			first_name      = COALESCE(NULLIF(first_name, ''), 'Admin'),
			last_name       = COALESCE(NULLIF(last_name, ''), 'SionERP'),
			phone           = COALESCE(NULLIF(phone, ''), '+00-000-000-0000'),
			address         = COALESCE(NULLIF(address, ''), 'Platform'),
			is_active       = true,
			updated_at      = NOW()
		WHERE id::text = $2`,
		role, userID,
	)
	if err != nil {
		return fmt.Errorf("[bootstrap] failed to update public user: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows > 0 {
		log.Printf("[bootstrap] Updated existing public user as super admin: %s", email)
		return nil
	}

	// Row doesn't exist yet — insert it
	_, err = db.Exec(
		`INSERT INTO public.users
			(id, id_number, first_name, last_name, phone, address, email, role, is_active, is_super_admin)
		VALUES ($1, $2, 'Admin', 'SionERP', '+00-000-000-0000', 'Platform', $3, $4, true, true)
		ON CONFLICT (id) DO UPDATE SET
			is_super_admin = true,
			role           = $4,
			updated_at     = NOW()`,
		userID, idNumber, email, role,
	)
	if err != nil {
		return fmt.Errorf("[bootstrap] failed to insert public user: %w", err)
	}

	log.Printf("[bootstrap] Created public super admin: %s (id: %s)", email, userID)
	return nil
}
