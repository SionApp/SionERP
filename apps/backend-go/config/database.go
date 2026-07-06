package config

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	_ "github.com/lib/pq"
)

// Querier is the minimal interface satisfied by both *sql.DB and *sql.Tx.
// Handlers use this so they work with either the global pool (current, Phase 0)
// or the per-request tenant transaction (Phase 3, when TenantTx is enforced).
//
// TODO(phase 3): once validateDB returns Querier, all handler call sites change from
// db.DB.Query/QueryRow/Exec to db.Query/QueryRow/Exec automatically.
type Querier interface {
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
	Exec(query string, args ...any) (sql.Result, error)
}

// txKey is the Echo context key under which TenantTx stores the *sql.Tx.
// Unexported constant; use TxKey() for cross-package access.
const txKey = "tenant_tx"

// TxKey returns the Echo context key used to store the per-request *sql.Tx.
// Middleware and handler packages reference this instead of a hard-coded string.
func TxKey() string { return txKey }

// Tx returns the per-request *sql.Tx stashed by TenantTx middleware, or falls
// back to the global pool when no transaction is present (unauthenticated routes,
// Phase 0 where TenantTx is wired but not yet enforcing).
//
// TODO(phase 3): once all handlers migrate to config.Tx(c), remove the fallback
// and require a transaction on every protected route.
func Tx(c echo.Context) Querier {
	if tx, ok := c.Get(txKey).(*sql.Tx); ok {
		return tx
	}
	return GetDB().DB
}

type Database struct {
	DB *sql.DB
}

var (
	dbInstance *Database
	once       sync.Once
)

func NewDatabase() (*Database, error) {
	dbURL := os.Getenv("SUPABASE_DB_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("SUPABASE_DB_URL environment variable is required")
	}

	// Para Supabase local, deshabilitar SSL
	// Si es una URL local y no tiene sslmode configurado, agregar sslmode=disable
	if !strings.Contains(dbURL, "sslmode") {
		if strings.Contains(dbURL, "127.0.0.1") || strings.Contains(dbURL, "localhost") {
			if strings.Contains(dbURL, "?") {
				dbURL += "&sslmode=disable"
			} else {
				dbURL += "?sslmode=disable"
			}
		}
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Cap the pool below Supabase's pgbouncer transaction-pooler limit (port 6543).
	// TenantTx holds a real BeginTx() open for the whole request, so an unbounded
	// Go pool tries to open more physical connections than the pooler allows under
	// concurrent load — pgbouncer rejects the excess, BeginTx fails, and handlers
	// return 500. Capping here makes Go queue the excess instead, which the pooler
	// tolerates. Override via DB_MAX_OPEN_CONNS if the project's pooler size differs.
	maxOpenConns := 15
	if v := os.Getenv("DB_MAX_OPEN_CONNS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxOpenConns = n
		}
	}
	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxOpenConns)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{DB: db}, nil
}

func GetDB() *Database {
	once.Do(func() {
		var err error
		dbInstance, err = NewDatabase()
		if err != nil {
			panic("Failed to connect to database: " + err.Error())
		}
	})
	return dbInstance
}

func (d *Database) Close() error {
	return d.DB.Close()
}
