// discipleship_mentorships_test.go — write-door coverage for Slice 2
// (disciple-maker): discipleship_mentorships create/end and the
// disciple_maker stage-derivation wiring added to journeyStageSQL.
// Cross-church isolation + list/count correctness live in
// discipleship_mentorships_isolation_test.go (same package, shared fixture).
//
// Same superuserSeedDB (fixture setup, bypasses RLS) / integrationDB
// (assertions, jetro_app / RLS-enforced) / setTenantContext / churchIDForTag
// / newConversionTestContext pattern as discipleship_journey_conversion_test.go
// (PR-2) — see that file's header. Handler-level: builds a real jetro_app tx
// stashed under config.TxKey() and calls the production handler function
// directly (this codebase never spins up a full Echo router in tests).
package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/lib/pq"
)

// mentorshipFixture bundles a church, one group (+ a second "other" group),
// and several active group members usable as mentor/mentee across scenarios.
type mentorshipFixture struct {
	church    string
	groupID   string
	actorID   string // supervisor-level actor, passes RequireModuleLevel via db_role fallback in tests calling the handler directly
	memberA   string
	memberB   string
	memberC   string // active member of groupID — a third mentee for multi-pair scenarios
	outsideID string // active member of a DIFFERENT group — NOT groupID; used for the cross-group rejection scenario
}

func seedMentorshipFixture(t *testing.T, seedDB *sql.DB, tag string) (mentorshipFixture, func()) {
	t.Helper()
	f := mentorshipFixture{church: churchIDForTag(tag)}

	tx, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("seed tx begin: %v", err)
	}
	_, err = tx.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		f.church, "Mentorship Church "+tag, "mentorship-church-"+tag,
	)
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed church: %v", err)
	}

	seedUser := func(name string) string {
		var id string
		if err := tx.QueryRow(
			`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id, is_active)
			 VALUES ($1, $2, 'Mentorship', '000', 'n/a', $3, 'member', $4, true)
			 RETURNING id`,
			"mentorship-"+name+"-"+tag, name, "mentorship-"+name+"-"+tag+"@example.test", f.church,
		).Scan(&id); err != nil {
			_ = tx.Rollback()
			t.Fatalf("seed user %s: %v", name, err)
		}
		return id
	}
	f.actorID = seedUser("actor")
	f.memberA = seedUser("membera")
	f.memberB = seedUser("memberb")
	f.memberC = seedUser("memberc")
	f.outsideID = seedUser("outside")

	if err := tx.QueryRow(
		`INSERT INTO public.discipleship_groups (group_name, leader_id, church_id, status)
		 VALUES ($1, $2, $3, 'active') RETURNING id`,
		"Mentorship Group "+tag, f.actorID, f.church,
	).Scan(&f.groupID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed group: %v", err)
	}

	var otherGroupID string
	if err := tx.QueryRow(
		`INSERT INTO public.discipleship_groups (group_name, leader_id, church_id, status)
		 VALUES ($1, $2, $3, 'active') RETURNING id`,
		"Other Group "+tag, f.actorID, f.church,
	).Scan(&otherGroupID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed other group: %v", err)
	}

	for _, uid := range []string{f.actorID, f.memberA, f.memberB, f.memberC} {
		if _, err := tx.Exec(
			`INSERT INTO public.discipleship_group_members (church_id, group_id, user_id, is_active)
			 VALUES ($1, $2, $3, true)`,
			f.church, f.groupID, uid,
		); err != nil {
			_ = tx.Rollback()
			t.Fatalf("seed group member %s: %v", uid, err)
		}
	}
	// outsideID belongs to the OTHER group only — never groupID.
	if _, err := tx.Exec(
		`INSERT INTO public.discipleship_group_members (church_id, group_id, user_id, is_active)
		 VALUES ($1, $2, $3, true)`,
		f.church, otherGroupID, f.outsideID,
	); err != nil {
		_ = tx.Rollback()
		t.Fatalf("seed outside member: %v", err)
	}

	if err := tx.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}

	cleanup := func() {
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_mentorships WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_group_members WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_groups WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.discipleship_journey WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE church_id = $1`, f.church)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, f.church)
	}
	return f, cleanup
}

// mentorshipCreateResponse decodes CreateMentorship's success body.
type mentorshipCreateResponse struct {
	ID string `json:"id"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — creating a mentorship lights up disciple_maker for the mentor.
// Spec ref: R1 (mentorship record), R5 (stage precedence).
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipCreateLightsUpDiscipleMaker(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedMentorshipFixture(t, seedDB, "lightup")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	// mentorA anchors into the journey (manual door) so we can observe its stage.
	var journeyID string
	if err := tx.QueryRow(
		`INSERT INTO public.discipleship_journey (church_id, user_id, origin) VALUES ($1, $2, 'manual') RETURNING id`,
		f.church, f.memberA,
	).Scan(&journeyID); err != nil {
		t.Fatalf("seed journey anchor: %v", err)
	}

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.memberA, MenteeUserID: f.memberB})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c); err != nil {
		t.Fatalf("CreateMentorship: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("CreateMentorship status = %d, want 201, body=%s", rec.Code, rec.Body.String())
	}

	entry := queryJourneyStageByUser(t, tx, f.church, f.memberA)
	if entry.Stage != "disciple_maker" {
		t.Errorf("stage after mentorship creation = %q, want \"disciple_maker\"", entry.Stage)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — ending a mentorship reverts the mentor's stage.
// Spec ref: R4.
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipEndRevertsStage(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedMentorshipFixture(t, seedDB, "revert")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	if _, err := tx.Exec(
		`INSERT INTO public.discipleship_journey (church_id, user_id, origin) VALUES ($1, $2, 'manual')`,
		f.church, f.memberA,
	); err != nil {
		t.Fatalf("seed journey anchor: %v", err)
	}

	h := NewDiscipleshipHandler()
	body, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.memberA, MenteeUserID: f.memberB})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c); err != nil {
		t.Fatalf("CreateMentorship: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("CreateMentorship status = %d, want 201, body=%s", rec.Code, rec.Body.String())
	}
	var created mentorshipCreateResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	if entry := queryJourneyStageByUser(t, tx, f.church, f.memberA); entry.Stage != "disciple_maker" {
		t.Fatalf("precondition failed: stage = %q, want \"disciple_maker\"", entry.Stage)
	}

	c2, rec2 := newConversionTestContext(http.MethodDelete, "/discipleship/mentorships/"+created.ID, f.church, f.actorID, tx, nil)
	c2.SetParamNames("id")
	c2.SetParamValues(created.ID)
	if err := h.EndMentorship(c2); err != nil {
		t.Fatalf("EndMentorship: %v", err)
	}
	if rec2.Code != http.StatusOK {
		t.Fatalf("EndMentorship status = %d, want 200, body=%s", rec2.Code, rec2.Body.String())
	}

	entry := queryJourneyStageByUser(t, tx, f.church, f.memberA)
	if entry.Stage != "new_convert" {
		t.Errorf("stage after ending mentorship = %q, want \"new_convert\" (reverted)", entry.Stage)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — one active mentor per mentee: a second mentor for an already-
// mentored mentee is rejected 409. Spec ref: R2.
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipOneActiveMentorPerMentee(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedMentorshipFixture(t, seedDB, "onemento")
	defer cleanup()

	h := NewDiscipleshipHandler()

	// Request 1: memberA mentors memberB — its own tx, committed, exactly like
	// one TenantTx-scoped HTTP request in production.
	tx1, err := db.Begin()
	if err != nil {
		t.Fatalf("tx1 begin: %v", err)
	}
	setTenantContext(t, tx1, f.church)
	body1, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.memberA, MenteeUserID: f.memberB})
	c1, rec1 := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx1, body1)
	c1.SetParamNames("id")
	c1.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c1); err != nil {
		t.Fatalf("CreateMentorship (first): %v", err)
	}
	if rec1.Code != http.StatusCreated {
		t.Fatalf("first CreateMentorship status = %d, want 201, body=%s", rec1.Code, rec1.Body.String())
	}
	if err := tx1.Commit(); err != nil {
		t.Fatalf("tx1 commit: %v", err)
	}

	// Request 2: actorID tries to ALSO mentor memberB — must 409. The unique
	// violation is a real Postgres-level error, which aborts THIS tx (matches
	// production: TenantTx rolls back the whole request tx on any non-2xx).
	tx2, err := db.Begin()
	if err != nil {
		t.Fatalf("tx2 begin: %v", err)
	}
	setTenantContext(t, tx2, f.church)
	body2, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.actorID, MenteeUserID: f.memberB})
	c2, rec2 := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx2, body2)
	c2.SetParamNames("id")
	c2.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c2); err != nil {
		t.Fatalf("CreateMentorship (second): %v", err)
	}
	if rec2.Code != http.StatusConflict {
		t.Fatalf("second CreateMentorship status = %d, want 409, body=%s", rec2.Code, rec2.Body.String())
	}
	if err := tx2.Rollback(); err != nil {
		t.Fatalf("tx2 rollback: %v", err)
	}

	// Request 3 (read-only): confirm the rejected insert never landed.
	tx3, err := db.Begin()
	if err != nil {
		t.Fatalf("tx3 begin: %v", err)
	}
	defer tx3.Rollback() //nolint:errcheck
	setTenantContext(t, tx3, f.church)
	var count int
	if err := tx3.QueryRow(
		`SELECT COUNT(*) FROM discipleship_mentorships WHERE church_id = $1 AND status = 'active'`,
		f.church,
	).Scan(&count); err != nil {
		t.Fatalf("count active mentorships: %v", err)
	}
	if count != 1 {
		t.Errorf("active mentorship count = %d, want 1 (rejected insert must not have landed)", count)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — same-group enforcement: mentor/mentee not both active members of
// the target group is rejected. Spec ref: R3.
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipSameGroupEnforcement(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedMentorshipFixture(t, seedDB, "samegroup")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()

	// outsideID is NOT a member of f.groupID (it's a member of the other seeded group).
	body, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.memberA, MenteeUserID: f.outsideID})
	c, rec := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, body)
	c.SetParamNames("id")
	c.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c); err != nil {
		t.Fatalf("CreateMentorship: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("CreateMentorship status = %d, want 400 (cross-group), body=%s", rec.Code, rec.Body.String())
	}

	var count int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM discipleship_mentorships WHERE church_id = $1`, f.church).Scan(&count); err != nil {
		t.Fatalf("count mentorships: %v", err)
	}
	if count != 0 {
		t.Errorf("cross-group mentorship was NOT rejected at the DB level: count = %d, want 0", count)
	}
}

// queryJourneyStageByUser runs the production journeyStageSQL constant scoped
// to one user and scans it with the production scanJourneyEntry helper.
func queryJourneyStageByUser(t *testing.T, tx *sql.Tx, church, userID string) JourneyEntry {
	t.Helper()
	row := tx.QueryRow(journeyStageSQL, church, pq.Array([]string{userID}))
	entry, err := scanJourneyEntry(row)
	if err != nil {
		t.Fatalf("journeyStageSQL: %v", err)
	}
	return entry
}
