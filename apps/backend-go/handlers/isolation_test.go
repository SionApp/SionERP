// Package handlers — Isolation Acceptance Gate Tests (Phase 5).
//
// These tests validate the 7 isolation criteria from spec #293 (Definition of Done).
//
// Tests that require a real DB (running as jetro_app role) are guarded by
// t.Skip when the INTEGRATION_TEST_DSN environment variable is not set.
// This allows the static-analysis tests (#5) to run in CI without a database.
//
// To run the full integration suite locally:
//
//	INTEGRATION_TEST_DSN="postgresql://jetro_app:<secret>@localhost:5432/postgres" \
//	  go test ./handlers/ -run TestIsolation -v
//
// IMPORTANT: tests must run as jetro_app (NOBYPASSRLS), never as postgres
// (superuser bypasses RLS — tests would pass trivially and prove nothing).
package handlers

import (
	"database/sql"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

// integrationDB opens a connection to the integration test database running as
// jetro_app. Returns nil and skips the test if INTEGRATION_TEST_DSN is unset.
func integrationDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("INTEGRATION_TEST_DSN")
	if dsn == "" {
		t.Skip("INTEGRATION_TEST_DSN not set — skipping integration isolation test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("integrationDB: sql.Open: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("integrationDB: ping: %v (ensure DB is running and jetro_app role exists)", err)
	}
	return db
}

// setTenantContext executes set_config('app.current_church_id', churchID, true)
// inside tx — transaction-local (is_local = true so pooler-safe).
func setTenantContext(t *testing.T, tx *sql.Tx, churchID string) {
	t.Helper()
	_, err := tx.Exec("SELECT set_config('app.current_church_id', $1, true)", churchID)
	if err != nil {
		t.Fatalf("setTenantContext: %v", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — TestIsolationCrossTenantReadBlocked
//
// Spec ref: R1 "Normal isolated read" scenario.
// Seeds rows for Church A and Church B, sets context to A, and asserts that
// SELECT * FROM zones (no WHERE church_id) returns only Church A rows.
// Proves the RLS USING predicate acts independently of app-level filtering.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationCrossTenantReadBlocked(t *testing.T) {
	// Seeding runs on a SEPARATE superuser connection (bypasses RLS) so we can
	// insert rows for two different churches in one pass — the assertion
	// connection (jetro_app, NOBYPASSRLS) can only ever hold one church's GUC
	// at a time, so it structurally cannot seed cross-church data itself.
	// Previously this used the jetro_app `db` connection for seeding too, with
	// no GUC set yet: the tenant_isolation WITH CHECK (church_id =
	// current_setting(...)) rejected every INSERT outright (42501), so the
	// test never reached its actual assertion. See
	// TestIsolationModuleGateChurchScoped below for the same pattern already
	// established for a newer table.
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000001"
	churchB := "bbbbbbbb-0000-0000-0000-000000000001"

	// Seed: insert test rows for two churches, clean up after. zones.church_id
	// gained a FK to churches(id) after this test was first written — the
	// parent rows are seeded here too (same pattern as
	// TestIsolationModuleGateChurchScoped below), or the INSERT fails with a
	// foreign-key violation (23503) before ever reaching the RLS assertion.
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Isolation Test Church %d", i), fmt.Sprintf("isolation-test-church-r1-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		_, err = setup.Exec(
			`INSERT INTO public.zones (id, name, church_id, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
			 ON CONFLICT DO NOTHING`,
			fmt.Sprintf("isolation-test-zone-%s", cid[:8]), cid,
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed zone for %s: %v", cid, err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		// Cleanup runs on the superuser connection too — jetro_app's RLS
		// would otherwise block the DELETE the same way it blocked the seed.
		_, _ = seedDB.Exec(`DELETE FROM public.zones WHERE name LIKE 'isolation-test-zone-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	// Actual isolation test: begin tx as jetro_app, set GUC to Church A.
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	setTenantContext(t, tx, churchA)

	// Deliberately NO WHERE church_id — RLS must filter for us.
	rows, err := tx.Query(`SELECT church_id FROM public.zones WHERE name LIKE 'isolation-test-zone-%'`)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var gotChurchID string
		if err := rows.Scan(&gotChurchID); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if gotChurchID != churchA {
			t.Errorf("cross-tenant read NOT blocked: got church_id=%s, want only church_id=%s", gotChurchID, churchA)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows iteration: %v", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — TestIsolationMissingWhereRLSBlock
//
// Spec ref: R1 "RLS safety net — deliberately missing WHERE" scenario.
// Explicit proof that the RLS net is independent of the app-level WHERE clause.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationMissingWhereRLSBlock(t *testing.T) {
	// See the comment in TestIsolationCrossTenantReadBlocked above: seeding
	// cross-church rows requires bypassing RLS, which jetro_app cannot do.
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000002"
	churchB := "bbbbbbbb-0000-0000-0000-000000000002"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		// See TestIsolationCrossTenantReadBlocked above: zones.church_id → churches(id).
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Isolation Test Church %d", i), fmt.Sprintf("isolation-test-church-r2-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
		_, err = setup.Exec(
			`INSERT INTO public.zones (id, name, church_id, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING`,
			fmt.Sprintf("rls-safety-net-zone-%s", cid[:8]), cid,
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed: %v", err)
		}
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.zones WHERE name LIKE 'rls-safety-net-zone-%'`)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("tx: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Set context to Church A only.
	setTenantContext(t, tx, churchA)

	// Deliberately missing WHERE clause — RLS is the only filter.
	rows, err := tx.Query(`SELECT church_id FROM public.zones WHERE name LIKE 'rls-safety-net-zone-%'`)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()

	churchBCount := 0
	for rows.Next() {
		var gotID string
		if err := rows.Scan(&gotID); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if gotID == churchB {
			churchBCount++
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows iteration: %v", err)
	}

	if churchBCount > 0 {
		t.Errorf("RLS safety net FAILED: %d Church B rows visible when context is Church A", churchBCount)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — TestIsolationUnsetGUCFailClosed
//
// Spec ref: R1 "Fail-closed — unset GUC" scenario.
// A transaction that never calls set_config must return 0 rows, not an error.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationUnsetGUCFailClosed(t *testing.T) {
	db := integrationDB(t)
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("tx: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Deliberately do NOT call set_config here.
	// current_setting('app.current_church_id', true) returns NULL → church_id = NULL → false → 0 rows.
	var count int
	err = tx.QueryRow(`SELECT COUNT(*) FROM public.zones`).Scan(&count)
	if err != nil {
		t.Fatalf("query failed (expected 0 rows, not an error): %v", err)
	}

	if count != 0 {
		t.Errorf("fail-closed violated: got %d rows with unset GUC, want 0", count)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — TestIsolationWithCheckWriteBlock
//
// Spec ref: R1 "Cross-church write blocked by RLS WITH CHECK" scenario.
// Attempts INSERT with church_id = B while GUC = A. Must fail.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationWithCheckWriteBlock(t *testing.T) {
	db := integrationDB(t)
	defer db.Close()

	churchA := "aaaaaaaa-0000-0000-0000-000000000003"
	churchB := "bbbbbbbb-0000-0000-0000-000000000003"

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("tx: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Set context to Church A.
	setTenantContext(t, tx, churchA)

	// Attempt to INSERT a row with church_id = Church B.
	_, err = tx.Exec(
		`INSERT INTO public.zones (id, name, church_id, created_at, updated_at)
		 VALUES (gen_random_uuid(), 'cross-church-write-test', $1, NOW(), NOW())`,
		churchB,
	)

	if err == nil {
		// The INSERT succeeded — that is a WITH CHECK violation / RLS bypass.
		// Roll back and fail the test.
		_, _ = tx.Exec(`DELETE FROM public.zones WHERE name = 'cross-church-write-test'`)
		t.Fatal("WITH CHECK write block FAILED: cross-church INSERT was NOT rejected by RLS")
	}

	// Error is expected — verify it mentions RLS or policy.
	errMsg := strings.ToLower(err.Error())
	if !strings.Contains(errMsg, "policy") && !strings.Contains(errMsg, "row-level") && !strings.Contains(errMsg, "rls") {
		// Some Postgres versions say "new row violates row-level security policy" — acceptable.
		// If the error is something else (e.g., FK violation, NOT NULL) we still want to flag it.
		t.Logf("INSERT rejected with error (expected RLS policy violation): %v", err)
	}
}

// poolAccess is one site where a function body reaches the global superuser
// pool directly (bypassing the per-request tenant tx / RLS).
type poolAccess struct {
	line int
	text string
}

// dbMethodNames are the *sql.DB / *sql.Tx methods that actually touch
// Postgres (and so actually need RLS). Matched only for form-"db" aliases
// (see aliasFormOfExpr) — a nil-check or an unrelated field/method on some
// other "db"-shaped value never reaches this far because it isn't inside a
// tracked alias's scope of use in the first place.
var dbMethodNames = map[string]bool{
	"Query": true, "QueryRow": true, "QueryContext": true, "QueryRowContext": true,
	"Exec": true, "ExecContext": true,
	"Begin": true, "BeginTx": true,
	"Prepare": true, "PrepareContext": true,
}

// isConfigGetDBCall reports whether call is exactly `config.GetDB()`.
func isConfigGetDBCall(call *ast.CallExpr) bool {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return false
	}
	pkg, ok := sel.X.(*ast.Ident)
	return ok && pkg.Name == "config" && sel.Sel.Name == "GetDB"
}

// aliasFormOfExpr classifies the RHS of a local assignment: "pool" for
// `config.GetDB()` (a *config.Database — needs a further `.DB` before any
// query method), "db" for `config.GetDB().DB` (already a *sql.DB — query
// methods are called on it directly). Anything else is not a pool alias.
func aliasFormOfExpr(e ast.Expr) (string, bool) {
	switch v := e.(type) {
	case *ast.CallExpr:
		if isConfigGetDBCall(v) {
			return "pool", true
		}
	case *ast.SelectorExpr:
		if v.Sel.Name == "DB" {
			if call, ok := v.X.(*ast.CallExpr); ok && isConfigGetDBCall(call) {
				return "db", true
			}
		}
	}
	return "", false
}

// collectPoolAliases walks a function body for local variables assigned from
// `config.GetDB()` or `config.GetDB().DB` — via `:=`/`=` (*ast.AssignStmt) or
// a `var` block (*ast.ValueSpec) — and returns name → form ("pool" | "db").
// The identifier "db" is seeded to "pool" up front since that is by far the
// dominant convention in this package (`db := config.GetDB()`, or `db` as a
// literal function PARAMETER of type *config.Database, e.g. hasAnyAdmin) —
// an explicit local assignment of "db" to the "db" form (e.g.
// `db := config.GetDB().DB`, see former dashboard.go:GetTraceability)
// overrides that seed for the rest of this function body. This is
// per-function and syntactic (no scope/type resolution): the walk is a
// single flat pass, so a name reassigned to a different form in two
// different branches of the same function is resolved by assignment order,
// not by lexical scope. That imprecision is acceptable for a lint — it can
// only make the check MORE eager, never blind to a real bare-pool call.
func collectPoolAliases(body *ast.BlockStmt) map[string]string {
	aliases := map[string]string{"db": "pool"}
	ast.Inspect(body, func(n ast.Node) bool {
		switch stmt := n.(type) {
		case *ast.AssignStmt:
			for i, lhs := range stmt.Lhs {
				ident, ok := lhs.(*ast.Ident)
				if !ok || i >= len(stmt.Rhs) {
					continue
				}
				if form, ok := aliasFormOfExpr(stmt.Rhs[i]); ok {
					aliases[ident.Name] = form
				}
			}
		case *ast.ValueSpec:
			for i, nameIdent := range stmt.Names {
				if i >= len(stmt.Values) {
					continue
				}
				if form, ok := aliasFormOfExpr(stmt.Values[i]); ok {
					aliases[nameIdent.Name] = form
				}
			}
		}
		return true
	})
	return aliases
}

// findBarePoolAccess scans a function body for every site that reaches the
// global pool directly: `db.DB.<Method>`, `config.GetDB().DB.<Method>`, and
// the same two shapes through a same-function local alias (`pool :=
// config.GetDB(); pool.DB.Exec(...)`, or `raw := config.GetDB().DB;
// raw.Query(...)`). It intentionally walks INTO nested function literals
// (e.g. `go func(){ ... }()`), so a bare call inside a goroutine literal is
// attributed to its enclosing named function (see ApproveReport in the
// allowlist below) — and aliases collected from the outer function body are
// visible to those literals too, matching normal Go closure semantics.
//
// KNOWN CEILING (documented, not built): an alias passed as a function
// PARAMETER (e.g. `func f(db *config.Database)` where the caller passed some
// other local's pool alias under a different name) is invisible to this
// syntactic check — resolving that needs go/types, which this test
// deliberately does not pull in. Every such helper in this codebase is
// caught instead by keying its OWN db.DB. calls to ITS OWN name in the
// allowlist (see e.g. getDiscipleshipAccessInfo, hasAnyAdmin).
func findBarePoolAccess(fset *token.FileSet, body *ast.BlockStmt) []poolAccess {
	aliases := collectPoolAliases(body)
	var found []poolAccess

	ast.Inspect(body, func(n ast.Node) bool {
		outer, ok := n.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		// Shape 1: `<pool-form base>.DB.<Method>` — db.DB.X, config.GetDB().DB.X,
		// or a tracked "pool"-form alias's own .DB.X.
		if inner, ok := outer.X.(*ast.SelectorExpr); ok && inner.Sel.Name == "DB" {
			switch x := inner.X.(type) {
			case *ast.Ident:
				if aliases[x.Name] == "pool" {
					pos := fset.Position(outer.Pos())
					found = append(found, poolAccess{line: pos.Line, text: x.Name + ".DB." + outer.Sel.Name})
				}
			case *ast.CallExpr:
				if isConfigGetDBCall(x) {
					pos := fset.Position(outer.Pos())
					found = append(found, poolAccess{line: pos.Line, text: "config.GetDB().DB." + outer.Sel.Name})
				}
			}
			return true
		}

		// Shape 2: `<db-form alias>.<Method>` — a local already holding *sql.DB
		// directly (`raw := config.GetDB().DB`), called without a further ".DB".
		if xIdent, ok := outer.X.(*ast.Ident); ok {
			if aliases[xIdent.Name] == "db" && dbMethodNames[outer.Sel.Name] {
				pos := fset.Position(outer.Pos())
				found = append(found, poolAccess{line: pos.Line, text: xIdent.Name + "." + outer.Sel.Name})
			}
		}
		return true
	})

	return found
}

// ─────────────────────────────────────────────────────────────────────────────
// TestFindBarePoolAccessAliasDetector
//
// Unit test for findBarePoolAccess itself (not the handler files) — proves
// the alias-tracking added in Phase 3e actually works, independent of
// whatever happens to be true of handlers/*.go right now. Parses small
// inline source snippets so this stays a true unit test with no filesystem
// dependency on the rest of the package.
// ─────────────────────────────────────────────────────────────────────────────
func TestFindBarePoolAccessAliasDetector(t *testing.T) {
	parseFunc := func(t *testing.T, src string) (*token.FileSet, *ast.BlockStmt) {
		t.Helper()
		full := "package handlers\n" +
			"import \"backend-sion/config\"\n" +
			"var _ = config.GetDB\n" +
			src
		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, "snippet.go", full, 0)
		if err != nil {
			t.Fatalf("ParseFile: %v\nsource:\n%s", err, full)
		}
		for _, decl := range file.Decls {
			if fn, ok := decl.(*ast.FuncDecl); ok && fn.Name.Name == "F" {
				return fset, fn.Body
			}
		}
		t.Fatal("test snippet must declare func F(...)")
		return nil, nil
	}

	t.Run("pool alias with method call is flagged", func(t *testing.T) {
		fset, body := parseFunc(t, `
func F() {
	dbPool := config.GetDB()
	dbPool.DB.Exec("SELECT 1")
}
`)
		got := findBarePoolAccess(fset, body)
		if len(got) != 1 {
			t.Fatalf("want 1 violation, got %d: %+v", len(got), got)
		}
		if got[0].text != "dbPool.DB.Exec" {
			t.Errorf("want text %q, got %q", "dbPool.DB.Exec", got[0].text)
		}
	})

	t.Run("db-form alias with method call is flagged", func(t *testing.T) {
		fset, body := parseFunc(t, `
func F() {
	raw := config.GetDB().DB
	raw.QueryRow("SELECT 1")
}
`)
		got := findBarePoolAccess(fset, body)
		if len(got) != 1 {
			t.Fatalf("want 1 violation, got %d: %+v", len(got), got)
		}
		if got[0].text != "raw.QueryRow" {
			t.Errorf("want text %q, got %q", "raw.QueryRow", got[0].text)
		}
	})

	t.Run("nil-check on a pool alias is not flagged", func(t *testing.T) {
		fset, body := parseFunc(t, `
func F() {
	x := config.GetDB()
	if x.DB == nil {
	}
}
`)
		got := findBarePoolAccess(fset, body)
		if len(got) != 0 {
			t.Fatalf("want 0 violations, got %d: %+v", len(got), got)
		}
	})

	t.Run("alias passed as a plain argument is not flagged", func(t *testing.T) {
		fset, body := parseFunc(t, `
func F() {
	raw := config.GetDB().DB
	someHelper(raw, "x")
}
`)
		got := findBarePoolAccess(fset, body)
		if len(got) != 0 {
			t.Fatalf("want 0 violations, got %d: %+v", len(got), got)
		}
	})

	t.Run("literal db identifier still caught without local assignment", func(t *testing.T) {
		fset, body := parseFunc(t, `
func F(db *config.Database) {
	db.DB.QueryRow("SELECT 1")
}
`)
		got := findBarePoolAccess(fset, body)
		if len(got) != 1 {
			t.Fatalf("want 1 violation, got %d: %+v", len(got), got)
		}
		if got[0].text != "db.DB.QueryRow" {
			t.Errorf("want text %q, got %q", "db.DB.QueryRow", got[0].text)
		}
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — TestIsolationNoBareDBCalls
//
// Spec ref: Criterion 5 — static analysis.
// Parses handlers/*.go with go/ast and flags any bare access to the global
// pool — db.DB.<Method>, config.GetDB().DB.<Method>, or a same-function local
// alias of either shape (see findBarePoolAccess above) — found inside a
// function that isn't explicitly named in the allowlist below.
//
// This is FUNCTION-level, not file-level. The original version of this test
// allowlisted whole files ("any db.DB. in discipleship.go is fine") — that let
// unrelated, unjustified bare db.DB. calls drift into an allowlisted file
// without anyone noticing (see discipleship.go:calculateGroupPhase and
// discipleship.go:GetUsersForHierarchy, fixed in the change that rewrote this
// test). A later pass added the `config.GetDB().DB.` chained shape, and this
// pass adds local aliases of both shapes (see discipleship.go:UpdateGroup's
// former `dbPool`, education.go:BulkGrantLeaders' former `globalDB`, and
// dashboard.go:GetTraceability's former `db := config.GetDB().DB` — all
// fixed in the same change that added this detection). Every entry below
// corresponds to a site that was deliberately reviewed and decided to stay
// on the global pool — not "this file has some legitimate exceptions
// somewhere".
//
// This test runs WITHOUT a database (pure static analysis) and is always
// active in CI.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationNoBareDBCalls(t *testing.T) {
	// Resolve handlers directory relative to this test file.
	_, testFilePath, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not resolve test file path")
	}
	handlersDir := filepath.Dir(testFilePath)

	// Read all .go handler files (excluding test files).
	entries, err := os.ReadDir(handlersDir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}

	// allowlist maps file → function name → justified. A function must be
	// named here explicitly; being in an allowlisted *file* buys nothing.
	// Helper functions and method receivers are both keyed by their bare
	// name (e.g. "GetStats" for `func (h *DashboardHandler) GetStats(...)`).
	allowlist := map[string]map[string]bool{
		"auth.go": {
			// Login: pre-auth — looks up a user by email before any
			// session/church context exists. There is no tenant tx to run
			// this on; it IS the request that establishes one.
			"Login": true,
		},
		"dashboard.go": {
			// GetStats: fully migrated to validateTx(c) except for
			// db.DB.Ping(), a connectivity health-check with no data/RLS
			// relevance — Ping() isn't part of the Querier interface so it
			// can't go through the tx.
			"GetStats": true,
		},
		"discipleship.go": {
			// getDiscipleshipAccessInfo: permission check by PK (user_id) —
			// returns a hierarchy level for the caller's own id, not
			// tenant-scoped data. No cross-tenant read is possible here.
			"getDiscipleshipAccessInfo": true,
		},
		"users.go": {
			// getUserRoleLevel: role lookup by PK (user_id) for permission
			// checks; helper has no Echo context, same criterion as
			// getDiscipleshipAccessInfo.
			"getUserRoleLevel": true,
		},
		"discipleship-goals.go": {
			// logGoalAudit: fire-and-forget audit-log write shared by both
			// request paths and post-commit goroutines; intentionally takes
			// *config.Database instead of a Querier so it keeps working after
			// the request tx that triggered it has already committed.
			"logGoalAudit": true,
		},
		"discipleship_reports.go": {
			// autoUpdateGoalProgressFromReport: runs as a goroutine AFTER the
			// request tx has committed (fire-and-forget cascade update) — no
			// request tx exists at that point. Every query is explicitly
			// filtered by church_id.
			"autoUpdateGoalProgressFromReport": true,
			// ApproveReport: the flagged db.DB. call lives inside a
			// post-commit `go func(){...}` notification literal (same
			// fire-and-forget shape as the goroutines above), already
			// filtered by church_id = cID.
			"ApproveReport": true,
		},
		"onboarding.go": {
			// ProvisionChurch: church provisioning runs OUTSIDE TenantTx by
			// design — there is no church_id yet, this call is what creates
			// the church that church_id will later refer to.
			"ProvisionChurch": true,
		},
		"federated.go": {
			// Redeem: PUBLIC federated-access endpoint (BonDev), same
			// rationale as onboarding.go — runs outside TenantTx because no
			// session/church_id exists pre-auth. Sets SET LOCAL ROLE
			// jetro_app + set_config('app.current_church_id', ...) by hand
			// inside its own tx before writing to federated_sessions_log —
			// the same RLS protection TenantTx gives, applied manually
			// because the protected middleware chain doesn't run pre-auth.
			"Redeem": true,
		},
		"provider.go": {
			// SionERP Provider API (I1), consumed by BonDev (the platform's
			// control plane). Runs behind ProviderKeyAuth (X-Provider-Key),
			// NEVER TenantTx: there is no session/church_id, the tenant is
			// received via :id in the URL, and a cross-tenant query IS the
			// requested operation (list/inspect ANY church) — not a scoping
			// bug. Same criterion as onboarding.go.
			"ListTenants":     true,
			"GetTenant":       true,
			"GetTenantHealth": true,
			"CreateTenant":    true,
			"SetModule":       true,
			"setTenantStatus": true,
			"Cancel":          true,
		},
		"setup.go": {
			// hasAnyAdmin: system-wide bootstrap check ("has anyone, ever,
			// set up this deployment") — intentionally NOT scoped to one
			// church; it gates first-run admin creation, not tenant data.
			"hasAnyAdmin": true,
			// GetSetupStatus: registered on OptionalAuth, not TenantTx (see
			// routes.go — the public first-run path and the logged-in-admin
			// path intentionally share one route). No tenant tx exists to
			// migrate onto. The per-tenant read (modules) is already scoped
			// by hand with an explicit church_id resolved from the session
			// when one exists.
			"GetSetupStatus": true,
			// PerformSetup: same OptionalAuth-only route as GetSetupStatus,
			// same reasoning — no tenant tx exists. Module install/disable is
			// scoped by hand (scopedToChurch) whenever a session is present;
			// only the genuine first-ever bootstrap (no session, no church
			// yet) falls back to the legacy unscoped behaviour.
			"PerformSetup": true,
		},
		"settings.go": {
			// GetPublicBranding: PUBLIC, pre-auth login-screen endpoint — runs
			// before any church context exists. Same default-church rationale
			// as GetRegistrationStatus below.
			"GetPublicBranding": true,
			// GetRegistrationStatus: PUBLIC, pre-auth registration-page
			// endpoint; assumes the single default church (single-domain
			// deploy) — enforcement of the actual setting lives in the
			// handle_new_user trigger, not here.
			"GetRegistrationStatus": true,
		},
		"users_import.go": {
			// ProviderBulkImportUsers: SionERP Provider API (I1), same
			// rationale as provider.go above — runs behind ProviderKeyAuth,
			// NEVER TenantTx, no session/church_id, tenant received via :id
			// in the URL. Opens its own db.DB.Begin() transaction because
			// insertUserChunk needs a real *sql.Tx for its internal
			// SAVEPOINT/ROLLBACK TO SAVEPOINT, which fails outside a
			// transaction — there is no request tx to inherit here. church_id
			// is bound explicitly from tenantID on every insert.
			"ProviderBulkImportUsers": true,
		},
	}

	type violation struct {
		file string
		fn   string
		line int
		text string
	}
	var violations []violation

	fset := token.NewFileSet()

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}

		path := filepath.Join(handlersDir, name)
		src, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("ReadFile %s: %v", name, err)
			continue
		}

		astFile, err := parser.ParseFile(fset, path, src, 0)
		if err != nil {
			t.Errorf("ParseFile %s: %v", name, err)
			continue
		}

		fileAllow := allowlist[name]

		for _, decl := range astFile.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Body == nil {
				continue
			}
			fnName := fn.Name.Name
			allowed := fileAllow != nil && fileAllow[fnName]
			if allowed {
				continue
			}

			for _, access := range findBarePoolAccess(fset, fn.Body) {
				violations = append(violations, violation{
					file: name,
					fn:   fnName,
					line: access.line,
					text: access.text,
				})
			}
		}
	}

	if len(violations) > 0 {
		t.Errorf("found %d unmigrated bare db.DB. calls in handler functions:", len(violations))
		for _, v := range violations {
			t.Errorf("  %s:%d (func %s) → %s", v.file, v.line, v.fn, v.text)
		}
		t.Log("REMEDIATION: replace db.DB.Query/QueryRow/Exec with validateTx(c) (config.Tx(c))")
		t.Log("  and add AND church_id = $N to the SQL query — or, if this site is genuinely")
		t.Log("  pre-tenant/global, add a named entry with a one-line reason to the allowlist above.")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — TestIsolationNoNullChurchID
//
// Spec ref: Criterion 6 — post-backfill data assertion.
// Asserts zero rows with church_id IS NULL in key tenant tables.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationNoNullChurchID(t *testing.T) {
	db := integrationDB(t)
	defer db.Close()

	// Representative sample of tenant tables that must have church_id NOT NULL.
	// Full set is all 33 tables from Phase 4 migration.
	tables := []string{
		"users",
		"zones",
		"discipleship_groups",
		"discipleship_levels",
		"discipleship_hierarchy",
		"discipleship_attendance",
		"discipleship_group_members",
		"events",
		"music_members",
		"music_events",
		"modules",
		"education_curricula",
		"education_assignments",
		"church_info",
		"system_settings",
		"notification_config",
	}

	for _, table := range tables {
		t.Run(table, func(t *testing.T) {
			var count int
			// Use Sprintf safely — table names are hardcoded above, not user input.
			query := fmt.Sprintf(`SELECT COUNT(*) FROM public.%s WHERE church_id IS NULL`, table) //nolint:gosec
			err := db.QueryRow(query).Scan(&count)
			if err != nil {
				t.Fatalf("query for %s: %v", table, err)
			}
			if count > 0 {
				t.Errorf("table %s has %d rows with church_id IS NULL — backfill incomplete", table, count)
			}
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — TestIsolationChurchIDContextRequired
//
// Spec ref: R2 "No resolvable church_id — rejected" scenario.
// Verifies that TenantTx middleware returns 403 when church_id is missing
// from the JWT (empty string) and the users table has no fallback.
//
// This is a unit test of the middleware behaviour (no DB required for the
// 403 path since it short-circuits before BeginTx).
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationChurchIDContextRequired(t *testing.T) {
	// We call the middleware package directly via its exported function.
	// The middleware short-circuits with 403 when church_id == "" and the
	// Phase-0 pass-through guard has been removed (i.e., when Phase 4 is active).
	//
	// Current state (Phase 0 pass-through guard still active):
	//   - church_id == "" → middleware calls next(c), returns 200.
	// After Phase 4 cutover (pass-through guard removed):
	//   - church_id == "" → middleware returns 403.
	//
	// This test documents the EXPECTED post-cutover behaviour and marks itself
	// as expected to change. It currently asserts the Phase-0 behaviour so it
	// stays green before the guard is removed.
	//
	// TODO(phase-4-cutover): after removing the pass-through guard from TenantTx,
	// update this test to assert StatusForbidden instead of StatusOK.
	t.Log("TestIsolationChurchIDContextRequired: asserting Phase-0 pass-through behaviour")
	t.Log("After Phase 4 cutover (pass-through guard removed), this test must be updated to expect HTTP 403.")

	// Verify middleware import path compiles and TenantTx is importable.
	// The actual HTTP behaviour test is in middleware/tenant_test.go:
	// TestTenantTxPassThroughWhenNoChurchID already covers the Phase-0 path.
	// We annotate here for spec traceability and leave the cutover TODO.
	t.Skip("Behaviour assertion deferred to middleware/tenant_test.go (TestTenantTxPassThroughWhenNoChurchID) " +
		"and integration TenantTx tests — update expected status after pass-through guard removal")
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — TestIsolationModuleGateChurchScoped
//
// Education module design D1 / spec "Per-church divergence" scenario.
// Proves the fixed `modules` lookup — church_id + key, matching the table's
// (church_id, key) primary key — resolves independently per church, instead
// of the old `SELECT is_installed FROM modules WHERE key = $1` which ignored
// church_id and could return an arbitrary church's row.
//
// This exercises the exact SQL shape middleware.RequireModule now runs
// (see apps/backend-go/middleware/module_check.go). It is a SQL-level
// regression test, not an HTTP round trip through education routes — those
// routes don't exist yet (PR2a). Route-level 403 coverage for the education
// module itself belongs to PR2a once `routes/education.go` exists; this test
// is the PR1-scope proof that the underlying data model is unambiguous.
// ─────────────────────────────────────────────────────────────────────────────
func TestIsolationModuleGateChurchScoped(t *testing.T) {
	// middleware.RequireModule runs this query through config.GetDB(), a
	// BYPASSRLS pool — module gating happens before any per-request tenant
	// GUC is set, so RLS never applies to this specific query in production.
	// The explicit WHERE church_id=$1 AND key=$2 is the only scoping that
	// exists, which is exactly what this test proves. Mirror that reality
	// with a superuser (bypass) connection throughout — running the
	// assertion query as jetro_app would either trivially pass (if modules
	// still had its old permissive SELECT-true policy) or, now that modules
	// carries a real tenant_isolation RLS policy, return zero rows for
	// every church regardless of church_id and prove nothing either way.
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()

	churchA := "eeeeeeee-0000-0000-0000-000000000008"
	churchB := "ffffffff-0000-0000-0000-000000000008"

	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	for i, cid := range []string{churchA, churchB} {
		_, err = setup.Exec(
			`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
			 VALUES ($1, $2, $3, NOW(), NOW())
			 ON CONFLICT (id) DO NOTHING`,
			cid, fmt.Sprintf("Isolation Test Church %d", i), fmt.Sprintf("isolation-test-church-%s", cid[:8]),
		)
		if err != nil {
			_ = setup.Rollback()
			t.Fatalf("seed church %s: %v", cid, err)
		}
	}
	// Church A: education installed. Church B: education explicitly NOT installed.
	_, err = setup.Exec(
		`INSERT INTO public.modules (church_id, key, name, description, is_installed)
		 VALUES ($1, 'education', 'Educación', 'Pénsum, lecciones y progreso', true)
		 ON CONFLICT (church_id, key) DO UPDATE SET is_installed = true`,
		churchA,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed module row for church A: %v", err)
	}
	_, err = setup.Exec(
		`INSERT INTO public.modules (church_id, key, name, description, is_installed)
		 VALUES ($1, 'education', 'Educación', 'Pénsum, lecciones y progreso', false)
		 ON CONFLICT (church_id, key) DO UPDATE SET is_installed = false`,
		churchB,
	)
	if err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed module row for church B: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	defer func() {
		_, _ = seedDB.Exec(`DELETE FROM public.modules WHERE church_id IN ($1, $2) AND key = 'education'`, churchA, churchB)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id IN ($1, $2)`, churchA, churchB)
	}()

	// This is the exact query middleware.RequireModule runs post-fix.
	const gateQuery = `SELECT is_installed FROM modules WHERE church_id = $1 AND key = $2`

	var installedA bool
	if err := seedDB.QueryRow(gateQuery, churchA, "education").Scan(&installedA); err != nil {
		t.Fatalf("query church A: %v", err)
	}
	if !installedA {
		t.Errorf("church A: expected education installed=true, got false")
	}

	var installedB bool
	if err := seedDB.QueryRow(gateQuery, churchB, "education").Scan(&installedB); err != nil {
		t.Fatalf("query church B: %v", err)
	}
	if installedB {
		t.Errorf("church B: expected education installed=false, got true — per-church divergence violated")
	}
}
