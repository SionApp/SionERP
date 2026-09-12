// discipleship_journey_conversion_test.go — write-path integration coverage
// for PR-2: ensurePathAssignment (design G2), ConvertVisitor (G4 identity
// matching), the manual door CreateJourneyEntry (G3), and UpdateVisitor's
// 409 guard on status='converted'.
//
// Same superuserSeedDB (fixture setup, bypasses RLS) / integrationDB
// (assertions, jetro_app / RLS-enforced) / setTenantContext / churchIDForTag
// pattern as discipleship_journey_isolation_test.go (PR-1) — see that file's
// header. Handler-level, not raw SQL: every scenario builds a real jetro_app
// tx stashed under config.TxKey(), exactly like TenantTx middleware does in
// production, and calls the production handler function directly — the
// same test-harness deviation documented in education_quiz_leak_test.go's
// header (this codebase never spins up a full Echo router in tests).
// ensureGlobalDBPool is reused from that file (same package).
package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	"backend-sion/config"
)

// conversionFixture bundles a church, two published curricula (A is set as
// the conversion-path pointer), a supervisor actor, and one
// discipleship_visitors row ready to convert.
type conversionFixture struct {
	church      string
	curriculumA string
	curriculumB string
	actorID     string
	visitorID   string
}

func seedConversionFixture(t *testing.T, seedDB *sql.DB, tag string) (conversionFixture, func()) {
	t.Helper()
	f := conversionFixture{church: churchIDForTag(tag)}

	tx, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("seed tx begin: %v", err)
	}
	_, err = tx.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		f.church, "Journey Conversion Church "+tag, "journey-conversion-church-"+tag,
	)
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, $2, 'published') RETURNING id`,
		f.church, "journey-conversion-curriculum-a-"+tag,
	).Scan(&f.curriculumA); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed curriculum A: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.education_curricula (church_id, name, status)
		 VALUES ($1, $2, 'published') RETURNING id`,
		f.church, "journey-conversion-curriculum-b-"+tag,
	).Scan(&f.curriculumB); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed curriculum B: %v", err)
	}
	if _, err = tx.Exec(
		`INSERT INTO public.discipleship_settings (church_id, conversion_path_curriculum_id) VALUES ($1, $2)`,
		f.church, f.curriculumA,
	); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed settings: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ($1, 'Journey', 'ConversionActor', '000', 'n/a', $2, 'supervisor', $3)
		 RETURNING id`,
		"journey-conversion-actor-"+tag, "journey-conversion-actor-"+tag+"@example.test", f.church,
	).Scan(&f.actorID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed actor: %v", err)
	}
	if err = tx.QueryRow(
		`INSERT INTO public.discipleship_visitors (church_id, first_name, last_name, phone, status)
		 VALUES ($1, 'Vera', 'Visitante', '555-0100', 'following_up')
		 RETURNING id`,
		f.church,
	).Scan(&f.visitorID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed visitor: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}

	cleanup := func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_assignments WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_journey WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_visitors WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_settings WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, f.church)
	}
	return f, cleanup
}

// seedActiveMember seeds one extra, already-existing active member (not
// linked to any visitor) — used by scenarios that exercise the "link
// existing member" branch (G4) or the ADOPT branch (G3).
func seedActiveMember(t *testing.T, seedDB *sql.DB, church, tag string) string {
	t.Helper()
	var id string
	if err := seedDB.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id, is_active)
		 VALUES ($1, 'Miguel', 'Miembro', '555-0200', 'n/a', $2, 'member', $3, true)
		 RETURNING id`,
		"journey-conversion-member-"+tag, "journey-conversion-member-"+tag+"@example.test", church,
	).Scan(&id); err != nil {
		t.Fatalf("seed active member: %v", err)
	}
	return id
}

// newConversionTestContext builds an echo.Context with a real jetro_app tx
// stashed under config.TxKey() (same GUC-scoping as TenantTx middleware),
// plus user_id/church_id set exactly as SupabaseAuth would.
func newConversionTestContext(method, path, churchID, actorID string, tx *sql.Tx, body []byte) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	e := echo.New()
	c := e.NewContext(req, rec)
	c.Set(config.TxKey(), tx)
	c.Set("user_id", actorID)
	c.Set("church_id", churchID)
	return c, rec
}

// conversionResponse decodes the JSON body a successful ConvertVisitor /
// CreateJourneyEntry response carries.
type conversionResponse struct {
	UserID         string  `json:"user_id"`
	JourneyID      string  `json:"journey_id"`
	AssignmentID   *string `json:"assignment_id"`
	PathConfigured bool    `json:"path_configured"`
}

func countRows(t *testing.T, tx *sql.Tx, query string, args ...interface{}) int {
	t.Helper()
	var n int
	if err := tx.QueryRow(query, args...).Scan(&n); err != nil {
		t.Fatalf("countRows(%q): %v", query, err)
	}
	return n
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — idempotent double conversion (create-new branch).
// Spec ref: discipleship-visitors "Double conversion is idempotent". Also
// covers G2 (every 2xx carries a non-empty assignment_id when path_configured).
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionIdempotentDoubleConversion(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "idempot")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()

	call := func() conversionResponse {
		c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, []byte("{}"))
		c.SetParamNames("id")
		c.SetParamValues(f.visitorID)
		if err := h.ConvertVisitor(c); err != nil {
			t.Fatalf("ConvertVisitor: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("ConvertVisitor status = %d, want 200, body=%s", rec.Code, rec.Body.String())
		}
		var resp conversionResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		return resp
	}

	first := call()
	if first.UserID == "" || first.JourneyID == "" {
		t.Fatalf("first conversion missing ids: %+v", first)
	}
	if !first.PathConfigured || first.AssignmentID == nil || *first.AssignmentID == "" {
		t.Fatalf("G2: pointer configured but assignment_id empty: %+v", first)
	}

	second := call()
	if second.UserID != first.UserID {
		t.Errorf("second conversion created a different user: %s vs %s — not idempotent", second.UserID, first.UserID)
	}
	if second.JourneyID != first.JourneyID {
		t.Errorf("second conversion created a different anchor: %s vs %s", second.JourneyID, first.JourneyID)
	}
	if second.AssignmentID == nil || first.AssignmentID == nil || *second.AssignmentID != *first.AssignmentID {
		t.Errorf("second conversion created a different assignment: %v vs %v", second.AssignmentID, first.AssignmentID)
	}

	userCount := countRows(t, tx, `SELECT COUNT(*) FROM users WHERE church_id = $1 AND id = $2`, f.church, first.UserID)
	if userCount != 1 {
		t.Errorf("expected exactly 1 user row, got %d", userCount)
	}
	anchorCount := countRows(t, tx, `SELECT COUNT(*) FROM discipleship_journey WHERE church_id = $1 AND user_id = $2`, f.church, first.UserID)
	if anchorCount != 1 {
		t.Errorf("expected exactly 1 journey anchor, got %d", anchorCount)
	}
	taggedCount := countRows(t, tx, `SELECT COUNT(*) FROM education_assignments WHERE church_id = $1 AND source_module = 'discipleship' AND source_ref_id = $2`, f.church, first.JourneyID)
	if taggedCount != 1 {
		t.Errorf("G1: expected exactly 1 tagged assignment, got %d", taggedCount)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — ADOPT of an untagged self-enrollment (link-existing branch).
// Design ref: G3 — ensurePathAssignment step 4 tags a pre-existing untagged
// assignment on the same curriculum instead of creating a second row.
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionAdoptsUntaggedSelfEnrollment(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "adopt")
	defer cleanup()
	memberID := seedActiveMember(t, seedDB, f.church, "adopt")

	var preAssignmentID string
	if err := seedDB.QueryRow(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to)
		 VALUES ($1, $2, $3) RETURNING id`,
		f.church, f.curriculumA, memberID,
	).Scan(&preAssignmentID); err != nil {
		t.Fatalf("seed untagged self-enrollment: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"user_id": memberID})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.visitorID)
	if err := h.ConvertVisitor(c); err != nil {
		t.Fatalf("ConvertVisitor: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("ConvertVisitor status = %d, want 200, body=%s", rec.Code, rec.Body.String())
	}
	var resp conversionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.AssignmentID == nil || *resp.AssignmentID != preAssignmentID {
		t.Errorf("ADOPT did not tag the pre-existing assignment: got %v, want %s", resp.AssignmentID, preAssignmentID)
	}

	rowCount := countRows(t, tx, `SELECT COUNT(*) FROM education_assignments WHERE church_id = $1 AND assigned_to = $2`, f.church, memberID)
	if rowCount != 1 {
		t.Errorf("ADOPT created a second row instead of tagging the existing one: count = %d", rowCount)
	}
	var sourceModule sql.NullString
	if err := tx.QueryRow(`SELECT source_module FROM education_assignments WHERE id = $1`, preAssignmentID).Scan(&sourceModule); err != nil {
		t.Fatalf("read adopted row: %v", err)
	}
	if !sourceModule.Valid || sourceModule.String != "discipleship" {
		t.Errorf("adopted row was not tagged: source_module = %v", sourceModule)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — G1: a second conversion attempt after a pointer swap does not
// create a second tagged assignment row, and the convert's own assignment
// keeps reporting the ORIGINAL curriculum (spec: "Pointer swap does not
// retroact").
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionG1NoDuplicateTaggedRowAfterPointerSwap(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "g1swap")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	convert := func() conversionResponse {
		c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, []byte("{}"))
		c.SetParamNames("id")
		c.SetParamValues(f.visitorID)
		if err := h.ConvertVisitor(c); err != nil {
			t.Fatalf("ConvertVisitor: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("ConvertVisitor status = %d, want 200, body=%s", rec.Code, rec.Body.String())
		}
		var resp conversionResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		return resp
	}

	first := convert()

	// Pastor swaps the pointer to curriculum B AFTER the first conversion.
	if _, err := tx.Exec(`UPDATE discipleship_settings SET conversion_path_curriculum_id = $2 WHERE church_id = $1`, f.church, f.curriculumB); err != nil {
		t.Fatalf("swap pointer: %v", err)
	}

	second := convert()
	if second.JourneyID != first.JourneyID || second.AssignmentID == nil || first.AssignmentID == nil || *second.AssignmentID != *first.AssignmentID {
		t.Fatalf("second conversion after pointer swap did not reuse the original anchor/assignment: first=%+v second=%+v", first, second)
	}

	taggedCount := countRows(t, tx, `SELECT COUNT(*) FROM education_assignments WHERE church_id = $1 AND source_module = 'discipleship' AND source_ref_id = $2`, f.church, first.JourneyID)
	if taggedCount != 1 {
		t.Errorf("G1: pointer swap + re-conversion created %d tagged rows, want 1", taggedCount)
	}
	var curriculumID string
	if err := tx.QueryRow(`SELECT curriculum_id FROM education_assignments WHERE id = $1`, *first.AssignmentID).Scan(&curriculumID); err != nil {
		t.Fatalf("read assignment curriculum: %v", err)
	}
	if curriculumID != f.curriculumA {
		t.Errorf("pointer swap retroactively changed the convert's own assignment: got curriculum %s, want original %s", curriculumID, f.curriculumA)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — pointer unset degrades gracefully: the anchor is still created,
// no assignment is created, and no error is raised.
// Spec ref: "Conversion Auto-Enrollment" / "Pointer unset or curriculum
// deleted".
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionNoPathConfiguredDegradesGracefully(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "nopath")
	defer cleanup()

	if _, err := seedDB.Exec(`UPDATE discipleship_settings SET conversion_path_curriculum_id = NULL WHERE church_id = $1`, f.church); err != nil {
		t.Fatalf("clear pointer: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, []byte("{}"))
	c.SetParamNames("id")
	c.SetParamValues(f.visitorID)
	if err := h.ConvertVisitor(c); err != nil {
		t.Fatalf("ConvertVisitor: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("ConvertVisitor status = %d, want 200 (no error on unset pointer), body=%s", rec.Code, rec.Body.String())
	}
	var resp conversionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.PathConfigured {
		t.Errorf("path_configured = true with no pointer set")
	}
	if resp.AssignmentID != nil {
		t.Errorf("assignment_id = %v, want nil with no pointer configured", *resp.AssignmentID)
	}
	if resp.JourneyID == "" {
		t.Errorf("anchor was not created despite unset pointer")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — an integrity anomaly (an assignment tagged to a DIFFERENT
// journey than the one being processed) returns 409 and leaves the visitor
// row untouched — the finalization step must never run when
// ensurePathAssignment fails. Design ref: G2 step 5 / G4.
//
// This anomaly is unreachable through normal application flow
// (uq_discipleship_journey_user guarantees one journey per user), so it is
// seeded directly — exactly the "hard stop, not a silent pass" case the
// design calls out.
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionAnomalyBlocksVisitorLink(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "anomaly")
	defer cleanup()
	memberID := seedActiveMember(t, seedDB, f.church, "anomaly")

	// memberID already has its OWN journey anchor (ownJourneyID) — required by
	// uq_discipleship_journey_user before we can manufacture the anomaly.
	var ownJourneyID string
	if err := seedDB.QueryRow(
		`INSERT INTO public.discipleship_journey (church_id, user_id, origin) VALUES ($1, $2, 'manual') RETURNING id`,
		f.church, memberID,
	).Scan(&ownJourneyID); err != nil {
		t.Fatalf("seed member's own anchor: %v", err)
	}
	// A DIFFERENT (bogus) journey id owns the member's only assignment row on
	// curriculum A — a corrupted state that cannot arise via the app itself.
	var bogusJourneyID string
	if err := seedDB.QueryRow(`SELECT gen_random_uuid()`).Scan(&bogusJourneyID); err != nil {
		t.Fatalf("generate bogus journey id: %v", err)
	}
	if _, err := seedDB.Exec(
		`INSERT INTO public.education_assignments (church_id, curriculum_id, assigned_to, source_module, source_ref_id)
		 VALUES ($1, $2, $3, 'discipleship', $4)`,
		f.church, f.curriculumA, memberID, bogusJourneyID,
	); err != nil {
		t.Fatalf("seed anomalous tagged assignment: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"user_id": memberID})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.visitorID)
	if err := h.ConvertVisitor(c); err != nil {
		t.Fatalf("ConvertVisitor: %v", err)
	}
	if rec.Code != http.StatusConflict {
		t.Fatalf("ConvertVisitor status = %d, want 409, body=%s", rec.Code, rec.Body.String())
	}

	// The finalization step (marking the visitor converted) must never have
	// run — the visitor row stays exactly as seeded.
	var status string
	var convertedUserID sql.NullString
	if err := tx.QueryRow(`SELECT status, converted_user_id FROM discipleship_visitors WHERE id = $1`, f.visitorID).Scan(&status, &convertedUserID); err != nil {
		t.Fatalf("read visitor: %v", err)
	}
	if status != "following_up" {
		t.Errorf("visitor status = %q, want unchanged \"following_up\" after a failed conversion", status)
	}
	if convertedUserID.Valid {
		t.Errorf("visitor converted_user_id = %q, want NULL after a failed conversion", convertedUserID.String)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — G4: linking an existing member never overwrites their identity
// fields (name/phone) with the visitor card's.
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyConversionLinkExistingDoesNotOverwriteIdentity(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "noverwrite")
	defer cleanup()
	memberID := seedActiveMember(t, seedDB, f.church, "noverwrite")

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"user_id": memberID})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/visitors/"+f.visitorID+"/convert", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.visitorID)
	if err := h.ConvertVisitor(c); err != nil {
		t.Fatalf("ConvertVisitor: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("ConvertVisitor status = %d, want 200, body=%s", rec.Code, rec.Body.String())
	}

	// The fixture already seeds a second user (the supervisor actor), so the
	// meaningful assertion is scoped to the member's own email, not the
	// church's total user count.
	userCount := countRows(t, tx, `SELECT COUNT(*) FROM users WHERE church_id = $1 AND email = $2`, f.church, "journey-conversion-member-noverwrite@example.test")
	if userCount != 1 {
		t.Errorf("linking an existing member created a duplicate user row: count = %d", userCount)
	}
	var firstName, lastName, phone string
	if err := tx.QueryRow(`SELECT first_name, last_name, phone FROM users WHERE id = $1`, memberID).Scan(&firstName, &lastName, &phone); err != nil {
		t.Fatalf("read linked member: %v", err)
	}
	if firstName != "Miguel" || lastName != "Miembro" || phone != "555-0200" {
		t.Errorf("linking overwrote identity fields: got (%s %s, %s), want (Miguel Miembro, 555-0200) — visitor card must never overwrite an existing member", firstName, lastName, phone)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — the manual door reaches "disciple": enrolls via
// ensurePathAssignment exactly like a convert, and once the assignment's
// completed_at is set, journeyStageSQL resolves "disciple".
// Spec ref: Manual Anchor Entry; design G3.
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyManualDoorReachesDisciple(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "manualok")
	defer cleanup()
	memberID := seedActiveMember(t, seedDB, f.church, "manualok")

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"user_id": memberID})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/journey", f.church, f.actorID, tx, body)
	if err := h.CreateJourneyEntry(c); err != nil {
		t.Fatalf("CreateJourneyEntry: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("CreateJourneyEntry status = %d, want 201, body=%s", rec.Code, rec.Body.String())
	}
	var resp conversionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.PathConfigured || resp.AssignmentID == nil {
		t.Fatalf("manual door did not enroll: %+v", resp)
	}

	entry := queryJourneyStage(t, tx, journeyFixture{church: f.church, userID: memberID, journeyID: resp.JourneyID})
	if entry.Stage != "new_convert" {
		t.Errorf("stage before completion = %q, want \"new_convert\"", entry.Stage)
	}

	if _, err := tx.Exec(`UPDATE education_assignments SET completed_at = now() WHERE id = $1`, *resp.AssignmentID); err != nil {
		t.Fatalf("mark completed: %v", err)
	}
	entry = queryJourneyStage(t, tx, journeyFixture{church: f.church, userID: memberID, journeyID: resp.JourneyID})
	if entry.Stage != "disciple" {
		t.Errorf("stage after completion = %q, want \"disciple\" — manual door never reached disciple", entry.Stage)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — the manual door is idempotent: re-entry on an already-anchored
// user reuses the anchor, no duplicate is created.
// Spec ref: Manual Anchor Entry "Manual entry is idempotent".
// ─────────────────────────────────────────────────────────────────────────────
func TestDiscipleshipJourneyManualDoorIsIdempotent(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "manualidem")
	defer cleanup()
	memberID := seedActiveMember(t, seedDB, f.church, "manualidem")

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"user_id": memberID})

	enter := func() conversionResponse {
		c, rec := newConversionTestContext(http.MethodPost, "/discipleship/journey", f.church, f.actorID, tx, body)
		if err := h.CreateJourneyEntry(c); err != nil {
			t.Fatalf("CreateJourneyEntry: %v", err)
		}
		if rec.Code != http.StatusCreated {
			t.Fatalf("CreateJourneyEntry status = %d, want 201, body=%s", rec.Code, rec.Body.String())
		}
		var resp conversionResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		return resp
	}

	first := enter()
	second := enter()
	if second.JourneyID != first.JourneyID {
		t.Errorf("manual re-entry created a second anchor: %s vs %s", second.JourneyID, first.JourneyID)
	}
	anchorCount := countRows(t, tx, `SELECT COUNT(*) FROM discipleship_journey WHERE church_id = $1 AND user_id = $2`, f.church, memberID)
	if anchorCount != 1 {
		t.Errorf("expected exactly 1 anchor after re-entry, got %d", anchorCount)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 9 — UpdateVisitor rejects a direct status='converted' PATCH with 409,
// pointing the caller at the dedicated conversion door.
// Design ref: "Bug found while closing G4" — the dropdown bypass this guard
// closes.
// ─────────────────────────────────────────────────────────────────────────────
func TestUpdateVisitorRejectsDirectConversionStatus(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedConversionFixture(t, seedDB, "guard409")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(map[string]string{"status": "converted"})
	c, rec := newConversionTestContext(http.MethodPut, "/discipleship/visitors/"+f.visitorID, f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.visitorID)
	if err := h.UpdateVisitor(c); err != nil {
		t.Fatalf("UpdateVisitor: %v", err)
	}
	if rec.Code != http.StatusConflict {
		t.Fatalf("UpdateVisitor status = %d, want 409 for a direct status='converted' PATCH, body=%s", rec.Code, rec.Body.String())
	}

	var status string
	if err := tx.QueryRow(`SELECT status FROM discipleship_visitors WHERE id = $1`, f.visitorID).Scan(&status); err != nil {
		t.Fatalf("read visitor: %v", err)
	}
	if status != "following_up" {
		t.Errorf("visitor status changed to %q despite the 409 guard", status)
	}
}
