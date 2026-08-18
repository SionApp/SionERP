package config

import (
	"strings"
	"testing"

	"github.com/lib/pq"
)

// applyStatementTimeout must produce a DSN that lib/pq can actually parse — a
// malformed connection string would panic the backend on startup (GetDB).
func TestApplyStatementTimeout(t *testing.T) {
	base := "postgres://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"

	got := applyStatementTimeout(base, 5000)

	// The critical guarantee: lib/pq accepts the result (uses the same ParseURL
	// path as sql.Open under the hood).
	dsn, err := pq.ParseURL(got)
	if err != nil {
		t.Fatalf("pq.ParseURL rejected the DSN %q: %v", got, err)
	}
	if !strings.Contains(dsn, "statement_timeout=5000") {
		t.Fatalf("parsed DSN missing statement_timeout: %s", dsn)
	}

	// Idempotent: don't double-append if one is already present.
	if again := applyStatementTimeout(got, 5000); again != got {
		t.Fatalf("not idempotent:\n first: %s\nsecond: %s", got, again)
	}

	// Uses & when the URL already has a query string, ? otherwise.
	noQuery := applyStatementTimeout("postgres://h/db", 3000)
	if !strings.Contains(noQuery, "?options=") {
		t.Fatalf("expected ?options= on a URL without query: %s", noQuery)
	}

	// ms<=0 disables (STATEMENT_TIMEOUT_MS=0).
	if off := applyStatementTimeout(base, 0); off != base {
		t.Fatalf("ms=0 should be a no-op, got: %s", off)
	}
}
