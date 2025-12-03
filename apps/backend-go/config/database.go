package config

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type Database struct {
	DB *sql.DB
}

var (
	dbInstance *Database
	once       sync.Once
)

func NewDatabase() (*Database, error) {
	// Cargar variables de entorno desde el archivo .env
	if err := godotenv.Load(); err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

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
