package handlers

import (
	"backend-sion/config"
	"backend-sion/middleware"
	"backend-sion/utils"
	"database/sql"
	"encoding/csv"
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
// Accepts a JSON array of user rows, validates and deduplicates them, then
// inserts valid rows in chunks of 50. Each chunk uses a SAVEPOINT on the
// shared request transaction (see insertUserChunk) for per-chunk fault
// isolation, but the whole import only commits atomically with the rest of
// the request via TenantTx's single final commit — it no longer uses
// independent per-chunk transactions, so a later failure can roll back
// earlier successful chunks too.
func (h *UserHandler) BulkImportUsers(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

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
	// Uses the tenant tx (q) instead of the global pool — RLS enforced, and
	// church_id is bound explicitly below (see insertUserChunk).
	for start := 0; start < len(valid); start += importChunkSize {
		end := start + importChunkSize
		if end > len(valid) {
			end = len(valid)
		}
		chunk := valid[start:end]
		chunkRowNums := validIdx[start:end]

		inserted, errs := insertUserChunk(q, chunk, chunkRowNums, churchID)
		result.Imported += inserted
		result.Skipped += len(chunk) - inserted
		result.Errors = append(result.Errors, errs...)
	}

	return c.JSON(http.StatusOK, result)
}

// ExportUsers handles GET /api/v1/users/export. Devuelve un CSV con las
// mismas columnas en español que acepta ImportUsersModal, para poder
// editar y re-importar el archivo (round-trip). Staff no ve admins,
// igual que en GetUsers.
func (h *UserHandler) ExportUsers(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	requestingUserID, _ := c.Get("user_id").(string)

	var requestingRole string
	_ = q.QueryRow("SELECT role FROM users WHERE id = $1", requestingUserID).Scan(&requestingRole)
	requestingRoleLevel := utils.GetRoleLevel(requestingRole)

	query := `
		SELECT first_name, last_name, email, COALESCE(phone, ''), COALESCE(address, ''),
			COALESCE(id_number, ''), role, COALESCE(birth_date::text, ''), whatsapp
		FROM users
		WHERE is_active = true AND church_id = $1
	`
	args := []interface{}{churchID}
	if requestingRoleLevel < utils.LevelPastor {
		query += " AND role != $2"
		args = append(args, utils.RoleAdmin)
	}
	query += " ORDER BY first_name, last_name"

	rows, err := q.Query(query, args...)
	if err != nil {
		c.Logger().Error("Error exporting users:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo exportar usuarios"})
	}
	defer rows.Close()

	middleware.LogSecurityEvent(c, "user_data_exported", "", requestingUserID, nil)

	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set("Content-Disposition", `attachment; filename="usuarios.csv"`)
	c.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(c.Response())
	_ = w.Write([]string{"Nombres", "Apellidos", "Correo Electronico", "Celular", "Direccion", "Cedula", "Rol", "F. Nac.", "WhatsApp"})

	for rows.Next() {
		var firstName, lastName, email, phone, address, idNumber, role, birthDate string
		var whatsapp bool
		if err := rows.Scan(&firstName, &lastName, &email, &phone, &address, &idNumber, &role, &birthDate, &whatsapp); err != nil {
			continue
		}
		wsp := "No"
		if whatsapp {
			wsp = "Si"
		}
		_ = w.Write([]string{firstName, lastName, email, phone, address, idNumber, role, birthDate, wsp})
	}
	if err := rows.Err(); err != nil {
		c.Logger().Error("Error iterating exported users:", err)
	}
	w.Flush()
	return nil
}

// insertUserChunk pre-checks existing emails for a chunk, then inserts
// non-duplicate rows through the tenant-scoped querier (q) — the request's
// own TenantTx, RLS enforced (Phase 3f: previously ran on the global pool via
// a *sql.DB parameter, a bare-pool-as-argument gap the static isolation check
// can't see — see isolation_test.go findBarePoolAccess doc comment).
//
// config.Querier only exposes Query/QueryRow/Exec (no Begin/Prepare — those
// belong to *sql.DB/*sql.Tx, and widening the interface would mean touching
// config/database.go, out of scope here), so this can no longer open its own
// nested db.Begin() transaction or tx.Prepare() a statement the way the
// previous version did. A SQL SAVEPOINT on the shared request tx reproduces
// the same per-chunk fault isolation the old per-chunk Begin/Commit/Rollback
// gave: a failure partway through this chunk is rolled back to the savepoint
// without aborting the chunks already processed earlier in this request.
// That isolation only covers a bad row within a single chunk, though —
// unlike the old independent-transaction model, none of it is durable until
// the request tx itself commits once, at the end, via TenantTx, so a later
// chunk's failure (or a failed final commit) still rolls back every earlier
// chunk too. The prepared statement is replaced with a plain parameterized
// query per row — chunk size is capped at 50, so the loss of statement reuse
// is immaterial.
//
// Returns count inserted and per-row errors for the chunk.
func insertUserChunk(q config.Querier, rows []UserImportRow, rowNums []int, churchID string) (int, []ImportError) {
	errors := []ImportError{}
	if len(rows) == 0 {
		return 0, errors
	}

	const savepoint = "bulk_import_chunk"
	if _, err := q.Exec("SAVEPOINT " + savepoint); err != nil {
		for i, r := range rows {
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
		}
		return 0, errors
	}

	// Pre-check which emails already exist in the DB
	emails := make([]string, len(rows))
	for i, r := range rows {
		emails[i] = r.Email
	}

	existing := make(map[string]bool)
	qrows, err := q.Query(
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

	inserted := 0
	chunkFailed := false
	for i, r := range rows {
		if existing[r.Email] {
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "email_exists"})
			continue
		}

		var id string
		insertErr := q.QueryRow(`
			INSERT INTO users (
				first_name, last_name, id_number, email, phone, address,
				birth_date, role, whatsapp, is_active, is_active_member,
				onboarding_completed, church_id, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, $9, true, true, false, $10, NOW(), NOW())
			ON CONFLICT (LOWER(email)) DO NOTHING
			RETURNING id`,
			r.FirstName, r.LastName, r.IdNumber, r.Email, r.Phone, r.Address,
			r.BirthDate, r.Role, r.WhatsApp, churchID,
		).Scan(&id)

		switch insertErr {
		case nil:
			inserted++
		case sql.ErrNoRows:
			// TOCTOU race: another insert won between our SELECT and this INSERT
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "email_exists"})
		default:
			// A real DB error leaves the transaction aborted server-side until
			// the ROLLBACK TO SAVEPOINT below — stop issuing statements now.
			errors = append(errors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
			chunkFailed = true
		}
		if chunkFailed {
			break
		}
	}

	if chunkFailed {
		if _, rbErr := q.Exec("ROLLBACK TO SAVEPOINT " + savepoint); rbErr != nil {
			// Savepoint rollback itself failed — treat as a whole-chunk failure,
			// same fallback the old tx.Commit()-failure path used.
			return 0, []ImportError{{Row: rowNums[0], Reason: "db_error"}}
		}
		// Every row in this chunk (including any inserted before the failure)
		// was rolled back — report the whole chunk as failed.
		chunkErrors := make([]ImportError, 0, len(rows))
		for i, r := range rows {
			chunkErrors = append(chunkErrors, ImportError{Row: rowNums[i], Email: r.Email, Reason: "db_error"})
		}
		return 0, chunkErrors
	}

	if _, err := q.Exec("RELEASE SAVEPOINT " + savepoint); err != nil {
		return 0, []ImportError{{Row: rowNums[0], Reason: "db_error"}}
	}

	return inserted, errors
}
