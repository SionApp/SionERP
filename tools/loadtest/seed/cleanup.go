package main

import (
	"database/sql"
	"fmt"
	"log"
)

// CleanupLoadtestData deletes every row this tool created, identified by the
// "LOADTEST-" church name prefix (see loadtestPrefix in generate.go). It
// never touches any church that doesn't match that prefix.
//
// Deletion order is discovered dynamically (see deleteAllChurchScopedTables)
// rather than hardcoded, because several tables reference church_id without
// ON DELETE CASCADE and some triggers (e.g. audit logging) re-populate rows
// as a side effect of deleting from OTHER tables. A fixed list drifts stale
// every time a migration adds a new tenant-scoped table; multi-pass retry
// doesn't.
func CleanupLoadtestData(db *sql.DB) error {
	churchIDs, err := findLoadtestChurchIDs(db)
	if err != nil {
		return fmt.Errorf("find LOADTEST churches: %w", err)
	}
	log.Printf("cleanup: found %d LOADTEST tenant(s)", len(churchIDs))

	tables, err := churchScopedTables(db)
	if err != nil {
		return fmt.Errorf("discover church-scoped tables: %w", err)
	}

	var errCount int
	for _, churchID := range churchIDs {
		if err := cleanupOneChurch(db, churchID, tables); err != nil {
			log.Printf("cleanup: tenant %s: %v", churchID, err)
			errCount++
		}
	}

	if errCount > 0 {
		return fmt.Errorf("cleanup finished with %d tenant(s) failing — see log above", errCount)
	}
	return nil
}

func findLoadtestChurchIDs(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`SELECT id FROM public.churches WHERE name LIKE $1`, loadtestPrefix+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// churchScopedTables returns every public.* table (other than "churches"
// itself) that has a church_id column, in an arbitrary order — dependency
// order is resolved at delete time by cleanupOneChurch's multi-pass retry.
func churchScopedTables(db *sql.DB) ([]string, error) {
	rows, err := db.Query(`
		SELECT table_name FROM information_schema.columns
		WHERE table_schema = 'public' AND column_name = 'church_id' AND table_name != 'churches'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	return tables, rows.Err()
}

// cleanupOneChurch deletes one tenant's rows from every church-scoped table,
// then the church row itself. It retries in multiple passes: some deletes
// fail on the first pass because a dependent row still exists in a table
// that hasn't been cleared yet (or was just re-populated by an audit
// trigger); as long as at least one delete succeeds per pass, we try again.
func cleanupOneChurch(db *sql.DB, churchID string, tables []string) error {
	// Auth users first (external system — not part of the SQL work below).
	authRows, err := db.Query(`SELECT id FROM public.users WHERE church_id = $1`, churchID)
	if err != nil {
		return fmt.Errorf("find users: %w", err)
	}
	var userIDs []string
	for authRows.Next() {
		var id string
		if err := authRows.Scan(&id); err != nil {
			authRows.Close()
			return fmt.Errorf("scan user id: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	authRows.Close()

	for _, userID := range userIDs {
		// Best-effort: most seeded users were never created in Supabase Auth
		// (only the session user was — see seed.go SeedTenants). A 404 here
		// is expected and already tolerated by deleteAuthUser.
		if err := deleteAuthUser(userID); err != nil {
			log.Printf("cleanup: warning: delete auth user %s: %v", userID, err)
		}
	}

	// audit_logs is handled separately, AFTER every other table: audit
	// triggers on other tables can re-insert audit_logs rows as a side
	// effect of deleting from them, so clearing it mid-pass doesn't stick.
	var toDelete []string
	for _, t := range tables {
		if t != "audit_logs" {
			toDelete = append(toDelete, t)
		}
	}

	maxPasses := len(toDelete) + 3 // generous — worst case is a fully linear dependency chain
	remaining := append([]string(nil), toDelete...)
	var lastErrs map[string]error

	for pass := 0; pass < maxPasses && len(remaining) > 0; pass++ {
		lastErrs = map[string]error{}
		var stillRemaining []string
		progressed := false

		for _, table := range remaining {
			_, err := db.Exec(fmt.Sprintf(`DELETE FROM public.%q WHERE church_id = $1`, table), churchID)
			if err != nil {
				lastErrs[table] = err
				stillRemaining = append(stillRemaining, table)
				continue
			}
			progressed = true
		}

		remaining = stillRemaining
		if !progressed {
			break // no table could be cleared this pass — stop retrying, report below
		}
	}

	if len(remaining) > 0 {
		return fmt.Errorf("could not clear %d table(s) after retrying, first error: %v", len(remaining), firstErr(lastErrs))
	}

	// Mop up any audit_logs rows re-inserted as a side effect of the deletes above.
	if _, err := db.Exec(`DELETE FROM public.audit_logs WHERE church_id = $1`, churchID); err != nil {
		return fmt.Errorf("delete audit_logs: %w", err)
	}

	if _, err := db.Exec(`DELETE FROM public.churches WHERE id = $1`, churchID); err != nil {
		return fmt.Errorf("delete churches: %w", err)
	}
	return nil
}

func firstErr(errs map[string]error) error {
	for _, err := range errs {
		return err
	}
	return nil
}
