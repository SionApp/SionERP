// Command seed-at-scale generates (or removes) synthetic multi-tenant load-test
// data for SionERP: K churches ("tenants") with realistic row counts across
// users, discipleship groups/members, zones, and the music module.
//
// LOCAL-ONLY: this tool refuses to run against any DB URL containing
// "supabase.co" or "onrender.com" (see assertLocalDBURL). It defaults to the
// local Supabase Postgres instance and never touches the real church's data —
// every row it creates is namespaced with the "LOADTEST-" prefix (see
// generate.go) so it can be identified and removed with -cleanup.
//
// Usage:
//
//	go run . -tenants 20 -users-per-tenant 50
//	go run . -cleanup
//
// See tools/loadtest/README.md for the full walkthrough (seed → smoke → baseline).
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

const defaultLocalDBURL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"

func main() {
	tenants := flag.Int("tenants", 20, "number of synthetic tenants (churches) to create")
	usersPerTenant := flag.Int("users-per-tenant", 50, "number of synthetic users per tenant")
	dbURL := flag.String("db-url", "", "Postgres connection URL (defaults to SUPABASE_DB_URL env, then local Supabase)")
	cleanup := flag.Bool("cleanup", false, "delete all LOADTEST- synthetic data instead of creating it")
	flag.Parse()

	resolvedURL := resolveDBURL(*dbURL)
	if err := assertLocalDBURL(resolvedURL); err != nil {
		log.Fatalf("SAFETY GATE: %v", err)
	}

	password := os.Getenv("LOADTEST_PASSWORD")
	if password == "" {
		password = "LoadTest123!" // local-only default; never used against a real deploy
	}

	db, err := sql.Open("postgres", resolvedURL)
	if err != nil {
		log.Fatalf("failed to open DB connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB at %s: %v", redactDBURL(resolvedURL), err)
	}

	if *cleanup {
		log.Printf("cleanup: deleting all LOADTEST- synthetic data from %s", redactDBURL(resolvedURL))
		if err := CleanupLoadtestData(db); err != nil {
			log.Fatalf("cleanup failed: %v", err)
		}
		log.Println("cleanup: done")
		return
	}

	if *tenants <= 0 || *usersPerTenant <= 0 {
		log.Fatalf("-tenants and -users-per-tenant must both be > 0 (got %d, %d)", *tenants, *usersPerTenant)
	}

	log.Printf("seeding %d tenant(s) x %d user(s) against %s", *tenants, *usersPerTenant, redactDBURL(resolvedURL))
	summary, err := SeedTenants(db, *tenants, *usersPerTenant, password)
	if err != nil {
		log.Fatalf("seed failed: %v", err)
	}

	fmt.Println()
	fmt.Println("=== seed-at-scale summary ===")
	fmt.Printf("Tenants:            %d\n", summary.Tenants)
	fmt.Printf("Users:              %d\n", summary.Users)
	fmt.Printf("Zones:              %d\n", summary.Zones)
	fmt.Printf("Discipleship groups: %d\n", summary.Groups)
	fmt.Printf("Group members:      %d\n", summary.GroupMembers)
	fmt.Printf("Music members:      %d\n", summary.MusicMembers)
	fmt.Printf("Music events:       %d\n", summary.MusicEvents)
	fmt.Printf("Music songs:        %d\n", summary.MusicSongs)
	fmt.Printf("Music assignments:  %d\n", summary.MusicAssignments)
	fmt.Println()
	fmt.Println("Session/login users (role=pastor, index 0 per tenant):")
	for i, cred := range summary.SessionCredentials {
		fmt.Printf("  [%d] email=%s password=$LOADTEST_PASSWORD church_id=%s\n", i, cred.Email, cred.ChurchID)
	}
	fmt.Println()
	fmt.Println("Feed the credentials above (or re-derive with the same tenant count) into")
	fmt.Println("tools/loadtest/scenario.js — see tools/loadtest/README.md.")
}

// resolveDBURL applies the precedence: -db-url flag > SUPABASE_DB_URL env > local default.
// Mirrors config/database.go's local-SSL handling so this tool behaves the
// same way against the local Supabase Postgres instance as the backend does.
func resolveDBURL(flagValue string) string {
	url := flagValue
	if url == "" {
		url = os.Getenv("SUPABASE_DB_URL")
	}
	if url == "" {
		url = defaultLocalDBURL
	}

	if !strings.Contains(url, "sslmode") &&
		(strings.Contains(url, "127.0.0.1") || strings.Contains(url, "localhost")) {
		if strings.Contains(url, "?") {
			url += "&sslmode=disable"
		} else {
			url += "?sslmode=disable"
		}
	}
	return url
}
