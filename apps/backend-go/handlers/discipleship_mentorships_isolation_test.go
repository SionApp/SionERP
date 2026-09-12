// discipleship_mentorships_isolation_test.go — cross-tenant isolation +
// group-scoped list/count correctness for Slice 2 (disciple-maker). Split out
// of discipleship_mentorships_test.go (same package, shares seedMentorshipFixture
// / mentorshipCreateResponse / newConversionTestContext) purely to keep each
// test file within a reviewable size — see that file's header for the shared
// harness conventions.
package handlers

import (
	"encoding/json"
	"net/http"
	"testing"
)

// mentorshipListResponse decodes ListGroupMentorships' success body.
type mentorshipListResponse struct {
	Mentorships []Mentorship `json:"mentorships"`
	Count       int          `json:"count"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — cross-church isolation: church B's active mentorships never leak
// into church A's read (list) or its stage derivation. Spec ref: R8.
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipCrossChurchIsolation(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()

	fA, cleanupA := seedMentorshipFixture(t, seedDB, "isoa")
	defer cleanupA()
	fB, cleanupB := seedMentorshipFixture(t, seedDB, "isob")
	defer cleanupB()

	// Seed an active mentorship directly in church B.
	if _, err := seedDB.Exec(
		`INSERT INTO public.discipleship_mentorships (church_id, group_id, mentor_user_id, mentee_user_id)
		 VALUES ($1, $2, $3, $4)`,
		fB.church, fB.groupID, fB.memberA, fB.memberB,
	); err != nil {
		t.Fatalf("seed church B mentorship: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, fA.church)

	// Deliberately unscoped — RLS must filter, not the WHERE clause.
	rows, err := tx.Query(
		`SELECT church_id FROM public.discipleship_mentorships WHERE church_id IN ($1, $2)`,
		fA.church, fB.church,
	)
	if err != nil {
		t.Fatalf("query mentorships: %v", err)
	}
	seenB := 0
	for rows.Next() {
		var got string
		if err := rows.Scan(&got); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if got == fB.church {
			seenB++
		}
	}
	rows.Close()
	if seenB > 0 {
		t.Errorf("cross-tenant read NOT blocked — saw %d church B rows while context is church A", seenB)
	}

	// Church A's own list endpoint must show zero mentorships (none seeded there).
	h := NewDiscipleshipHandler()
	c, rec := newConversionTestContext(http.MethodGet, "/discipleship/groups/"+fA.groupID+"/mentorships", fA.church, fA.actorID, tx, nil)
	c.SetParamNames("id")
	c.SetParamValues(fA.groupID)
	c.Set("db_role", "pastor") // bypass getDiscipleshipAccessInfo's hierarchy lookup — full-access read
	if err := h.ListGroupMentorships(c); err != nil {
		t.Fatalf("ListGroupMentorships: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("ListGroupMentorships status = %d, want 200, body=%s", rec.Code, rec.Body.String())
	}
	var listResp mentorshipListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if listResp.Count != 0 {
		t.Errorf("church A mentorship count = %d, want 0 (church B's row must not leak)", listResp.Count)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — count correctness: N active pairs report count N, and an ended
// pair is excluded. Spec ref: R6.
// ─────────────────────────────────────────────────────────────────────────────
func TestMentorshipListCountCorrectness(t *testing.T) {
	seedDB := superuserSeedDB(t)
	defer seedDB.Close()
	db := integrationDB(t)
	defer db.Close()
	ensureGlobalDBPool(t)

	f, cleanup := seedMentorshipFixture(t, seedDB, "countcorr")
	defer cleanup()

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("test tx begin: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	setTenantContext(t, tx, f.church)

	h := NewDiscipleshipHandler()

	// Pair 1: memberA mentors memberB.
	body1, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.memberA, MenteeUserID: f.memberB})
	c1, rec1 := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, body1)
	c1.SetParamNames("id")
	c1.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c1); err != nil || rec1.Code != http.StatusCreated {
		t.Fatalf("CreateMentorship (pair 1): err=%v status=%d body=%s", err, rec1.Code, rec1.Body.String())
	}

	// Pair 2: actorID mentors memberC.
	body2, _ := json.Marshal(CreateMentorshipRequest{MentorUserID: f.actorID, MenteeUserID: f.memberC})
	c2, rec2 := newConversionTestContext(http.MethodPost, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, body2)
	c2.SetParamNames("id")
	c2.SetParamValues(f.groupID)
	if err := h.CreateMentorship(c2); err != nil || rec2.Code != http.StatusCreated {
		t.Fatalf("CreateMentorship (pair 2): err=%v status=%d body=%s", err, rec2.Code, rec2.Body.String())
	}
	var created2 mentorshipCreateResponse
	if err := json.Unmarshal(rec2.Body.Bytes(), &created2); err != nil {
		t.Fatalf("decode create response 2: %v", err)
	}

	c3, rec3 := newConversionTestContext(http.MethodGet, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, nil)
	c3.SetParamNames("id")
	c3.SetParamValues(f.groupID)
	c3.Set("db_role", "pastor")
	if err := h.ListGroupMentorships(c3); err != nil {
		t.Fatalf("ListGroupMentorships: %v", err)
	}
	var listResp mentorshipListResponse
	if err := json.Unmarshal(rec3.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if listResp.Count != 2 {
		t.Fatalf("count = %d, want 2", listResp.Count)
	}

	// End pair 2 — count must drop to 1.
	c4, rec4 := newConversionTestContext(http.MethodDelete, "/discipleship/mentorships/"+created2.ID, f.church, f.actorID, tx, nil)
	c4.SetParamNames("id")
	c4.SetParamValues(created2.ID)
	if err := h.EndMentorship(c4); err != nil || rec4.Code != http.StatusOK {
		t.Fatalf("EndMentorship: err=%v status=%d body=%s", err, rec4.Code, rec4.Body.String())
	}

	c5, rec5 := newConversionTestContext(http.MethodGet, "/discipleship/groups/"+f.groupID+"/mentorships", f.church, f.actorID, tx, nil)
	c5.SetParamNames("id")
	c5.SetParamValues(f.groupID)
	c5.Set("db_role", "pastor")
	if err := h.ListGroupMentorships(c5); err != nil {
		t.Fatalf("ListGroupMentorships (after end): %v", err)
	}
	var listResp2 mentorshipListResponse
	if err := json.Unmarshal(rec5.Body.Bytes(), &listResp2); err != nil {
		t.Fatalf("decode list response (after end): %v", err)
	}
	if listResp2.Count != 1 {
		t.Errorf("count after ending one pair = %d, want 1", listResp2.Count)
	}
}
