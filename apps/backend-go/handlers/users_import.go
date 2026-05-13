package handlers

import (
	"backend-sion/config"
	"backend-sion/utils"
	"database/sql"
	"net/http"
	"regexp"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
)

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

const importChunkSize = 50

// ─── Request / Response types ──────────────────────────────────────────────

type UserImportRow struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
	IdNumber  string `json:"id_number"`
	Role      string `json:"role"`
	BirthDate string `json:"birth_date"` // ISO yyyy-mm-dd or ""
	WhatsApp  bool   `json:"whatsapp"`
}

type BulkImportRequest struct {
	Users []UserImportRow `json:"users"`
}

type ImportError struct {
	Row    int    `json:"row"`
	Email  string `json:"email,omitempty"`
	Reason string `json:"reason"`
}

type ImportResult struct {
	Imported int           `json:"imported"`
	Skipped  int           `json:"skipped"`
	Errors   []ImportError `json:"errors"`
}

// ─── Handler ───────────────────────────────────────────────────────────────

// BulkImportUsers handles POST /api/v1/users/bulk.
// Accepts a JSON array of user rows, validates and deduplicates them,
// then inserts valid rows in chunks of 50 using independent transactions.
func (h *UserHandler) BulkImportUsers(c echo.Context) error {
	callerRole, _ := c.Get("db_role").(string)
	callerLevel := utils.GetRoleLevel(callerRole)

	var req BulkImportRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Datos inválidos"})
	}
	if len(req.Users) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "No se enviaron usuarios"})
	}
	if len(req.Users) > 1000 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Máximo 1000 filas por solicitud"})
	}

	result := ImportResult{Errors: []ImportError{}}
	seen := make(map[string]bool, len(req.Users))
	valid := make([]UserImportRow, 0, len(req.Users))
	validIdx := make([]int, 0, len(req.Users)) // original 1-based row numbers

	// ── Phase 1: Validation + in-batch dedup ──────────────────────────────
	for i, row := range req.Users {
		rowNum := i + 1

		row.FirstName = strings.TrimSpace(row.FirstName)
		row.LastName = strings.TrimSpace(row.LastName)
		row.Email = strings.ToLower(strings.TrimSpace(row.Email))

		// Required field check
		if row.FirstName == "" || row.LastName == "" || row.Email == "" {
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Email: row.Email, Reason: "missing_required"})
			result.Skipped++
			continue
		}

		// Email format validation
		if !emailRegex.MatchString(row.Email) {
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Email: row.Email, Reason: "invalid_email"})
			result.Skipped++
			continue
		}

		// In-batch dedup (case-insensitive, already lowercased above)
		if seen[row.Email] {
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Email: row.Email, Reason: "duplicate_in_batch"})
			result.Skipped++
			continue
		}

		// Default role
		if row.Role == "" {
			row.Role = utils.RoleServer
		} else {
			row.Role = strings.ToLower(strings.TrimSpace(row.Role))
		}

		// Validate role value
		rowLevel := utils.GetRoleLevel(row.Role)
		if rowLevel == 0 && row.Role != utils.RoleServer {
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Email: row.Email, Reason: "invalid_role"})
			result.Skipped++
			continue
		}

		// Role cap: imported role must not exceed caller's level
		if rowLevel > callerLevel {
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Email: row.Email, Reason: "role_above_caller"})
			result.Skipped++
			continue
		}

		seen[row.Email] = true
		valid = append(valid, row)
		validIdx = append(validIdx, rowNum)
	}

	// ── Phase 2: Chunked DB insert ─────────────────────────────────────────
	db := config.GetDB().DB
	for start := 0; start < len(valid); start += importChunkSize {
		end := start + importChunkSize
		if end > len(valid) {
			end = len(valid)
		}
		chunk := valid[start:end]
		chunkRowNums := validIdx[start:end]

		inserted, errs := insertUserChunk(db, chunk, chunkRowNums)
		result.Imported += inserted
		result.Skipped += len(chunk) - inserted
		result.Errors = append(result.Errors, errs...)
	}

	return c.JSON(http.StatusOK, result)
}

// insertUserChunk pre-checks existing emails for a chunk, then inserts
// non-duplicate rows in a single transaction. Returns count inserted
// and per-row errors for the chunk.
func insertUserChunk(db *sql.DB, rows []UserImportRow, rowNums []int) (int, []ImportError) {
	errors := []ImportError{}
	if len(rows) == 0 {
		return 0, errors
	}

	// Pre-check which emails already exist in the DB
	emails := make([]string, len(rows))
	for i, r := range rows {
		emails[i] = r.Email
	}

	existing := make(map[string]bool)
	qrows, err := db.Query(
		`SELECT LOWER(email) FROM users WHERE LOWER(email) = ANY($1)`,
		pq.Array(emails),
	)
	if err == nil {
		for qrows.Next() {
			var e string
			if scanErr := qrows.Scan(&e); scanErr == nil {
				existing[e] = true
			}
		}
		qrows.Close()
	}

	tx, err := db.Begin()
	if err != nil {
		for i, r := range rows {
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
		}
		return 0, errors
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.Prepare(`
		INSERT INTO users (
			first_name, last_name, id_number, email, phone, address,
			birth_date, role, whatsapp, is_active, is_active_member,
			onboarding_completed, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, $9, true, true, false, NOW(), NOW())
		ON CONFLICT (LOWER(email)) DO NOTHING
		RETURNING id`)
	if err != nil {
		for i, r := range rows {
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
		}
		return 0, errors
	}
	defer stmt.Close()

	inserted := 0
	for i, r := range rows {
		if existing[r.Email] {
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "email_exists"})
			continue
		}

		var id string
		err := stmt.QueryRow(
			r.FirstName, r.LastName, r.IdNumber, r.Email, r.Phone, r.Address,
			r.BirthDate, r.Role, r.WhatsApp,
		).Scan(&id)

		switch err {
		case nil:
			inserted++
		case sql.ErrNoRows:
			// TOCTOU race: another insert won between our SELECT and this INSERT
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "email_exists"})
		default:
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
		}
	}

	if commitErr := tx.Commit(); commitErr != nil {
		// Whole chunk failed — replace per-row errors with a chunk-level error
		return 0, []ImportError{{Row: rowNums[0], Reason: "db_error"}}
	}

	return inserted, errors
}
