// education_admin_course_mgmt_test.go — runtime harness for PR-H's backend
// deltas (CreateCurriculum/UpdateCurriculum metadata fields, GetCurricula's
// teacher_name/student_count additions, and the module/lesson-order flow
// ModuleLessonTree drives). Same superuserSeedDB/integrationDB/
// newQuizTestContext harness every other education test file in this
// package already uses (see isolation_test.go's own header for the
// INTEGRATION_TEST_DSN setup instructions) — reused verbatim rather than
// duplicated, since these helpers are handler-agnostic despite the "quiz"
// name on two of them.
package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func TestAdminCourseMgmtCreateCurriculumWithMetadata(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-0000000a0c01"
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	if _, err := setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		church, "Admin Course Mgmt Church", "edu-admin-course-mgmt-church",
	); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	var teacherID string
	if err := setup.QueryRow(
		`INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, church_id)
		 VALUES ('edu-admin-teacher','Edu','Teacher','000','n/a','edu-admin-teacher@example.test','member',$1)
		 ON CONFLICT (id_number) DO UPDATE SET church_id = EXCLUDED.church_id
		 RETURNING id`,
		church,
	).Scan(&teacherID); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed teacher: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.users WHERE id_number = 'edu-admin-teacher'`)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	})

	h := NewEducationHandler()

	// ── 1. CreateCurriculum with the full metadata set ──
	createBody, _ := json.Marshal(map[string]interface{}{
		"name":            "Fundamentos de la fe",
		"description":     "Curso introductorio",
		"track":           "discipulado",
		"level":           "I",
		"hours":           8.5,
		"teacher_user_id": teacherID,
		"cover_path":      "education/covers/test-cover.jpg",
		"objectives":      []string{"Entender qué es el discipulado", "Conocer la historia de la iglesia"},
		"requirements":    "Ninguno",
	})
	c, rec, tx := newQuizTestContext(t, db, http.MethodPost, "/education/curricula", church, "", createBody)
	if err := h.CreateCurriculum(c); err != nil {
		t.Fatalf("CreateCurriculum: %v", err)
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("CreateCurriculum status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected non-empty id")
	}

	var track, level, teacherUserID sql.NullString
	var hours sql.NullFloat64
	var objectivesRaw []byte
	if err := tx.QueryRow(
		`SELECT track, level, hours, teacher_user_id::text, objectives FROM education_curricula WHERE id = $1`,
		created.ID,
	).Scan(&track, &level, &hours, &teacherUserID, &objectivesRaw); err != nil {
		t.Fatalf("verify insert: %v", err)
	}
	if track.String != "discipulado" || level.String != "I" || hours.Float64 != 8.5 || teacherUserID.String != teacherID {
		t.Fatalf("metadata not persisted correctly: track=%v level=%v hours=%v teacher=%v", track, level, hours, teacherUserID)
	}
	var objectives []string
	if err := json.Unmarshal(objectivesRaw, &objectives); err != nil {
		t.Fatalf("decode objectives: %v", err)
	}
	if len(objectives) != 2 || objectives[0] != "Entender qué es el discipulado" {
		t.Fatalf("objectives not persisted correctly: %v", objectives)
	}
	_ = tx.Rollback()

	// ── 2. Invalid track is rejected ──
	badBody, _ := json.Marshal(map[string]interface{}{"name": "x", "track": "not-a-track"})
	c2, rec2, tx2 := newQuizTestContext(t, db, http.MethodPost, "/education/curricula", church, "", badBody)
	if err := h.CreateCurriculum(c2); err != nil {
		t.Fatalf("CreateCurriculum (bad track): %v", err)
	}
	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid track, got %d: %s", rec2.Code, rec2.Body.String())
	}
	_ = tx2.Rollback()

	// ── 3. UpdateCurriculum clears track/teacher via explicit '' sentinel,
	//        leaves objectives untouched (field omitted) ──
	tx3, err := db.Begin()
	if err != nil {
		t.Fatalf("begin tx3: %v", err)
	}
	setTenantContext(t, tx3, church)
	insertBody, _ := json.Marshal(map[string]interface{}{
		"name":            "Curso a editar",
		"track":           "servicio",
		"teacher_user_id": teacherID,
		"objectives":      []string{"Objetivo original"},
	})
	c3a, rec3a := newQuizContextOn(tx3, http.MethodPost, "/education/curricula", church, "", insertBody)
	if err := h.CreateCurriculum(c3a); err != nil {
		t.Fatalf("CreateCurriculum (for update test): %v", err)
	}
	var created3 struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(rec3a.Body.Bytes(), &created3); err != nil {
		t.Fatalf("decode create3 response: %v", err)
	}

	updateBody, _ := json.Marshal(map[string]interface{}{"track": "", "teacher_user_id": ""})
	c3b, rec3b := newQuizContextOn(tx3, http.MethodPut, fmt.Sprintf("/education/curricula/%s", created3.ID), church, "", updateBody)
	c3b.SetParamNames("id")
	c3b.SetParamValues(created3.ID)
	if err := h.UpdateCurriculum(c3b); err != nil {
		t.Fatalf("UpdateCurriculum: %v", err)
	}
	if rec3b.Code != http.StatusOK {
		t.Fatalf("UpdateCurriculum status = %d, body = %s", rec3b.Code, rec3b.Body.String())
	}

	var track3, teacher3 sql.NullString
	var objectivesRaw3 []byte
	if err := tx3.QueryRow(
		`SELECT track, teacher_user_id::text, objectives FROM education_curricula WHERE id = $1`, created3.ID,
	).Scan(&track3, &teacher3, &objectivesRaw3); err != nil {
		t.Fatalf("verify update: %v", err)
	}
	if track3.Valid || teacher3.Valid {
		t.Fatalf("expected track/teacher_user_id cleared to NULL, got track=%v teacher=%v", track3, teacher3)
	}
	var objectives3 []string
	if err := json.Unmarshal(objectivesRaw3, &objectives3); err != nil {
		t.Fatalf("decode objectives3: %v", err)
	}
	if len(objectives3) != 1 || objectives3[0] != "Objetivo original" {
		t.Fatalf("objectives should be untouched when omitted from the update payload, got %v", objectives3)
	}
	_ = tx3.Rollback()
}

func TestAdminCourseMgmtModuleLessonOrderFlow(t *testing.T) {
	seedDB := superuserSeedDB(t)
	t.Cleanup(func() { seedDB.Close() })
	db := integrationDB(t)
	defer db.Close()

	church := "aaaaaaaa-0000-0000-0000-0000000a0c02"
	setup, err := seedDB.Begin()
	if err != nil {
		t.Fatalf("setup tx: %v", err)
	}
	if _, err := setup.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
		church, "Admin Module Lesson Order Church", "edu-admin-module-order-church",
	); err != nil {
		_ = setup.Rollback()
		t.Fatalf("seed church: %v", err)
	}
	if err := setup.Commit(); err != nil {
		t.Fatalf("seed commit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = seedDB.Exec(`DELETE FROM public.education_curricula WHERE church_id = $1`, church)
		_, _ = seedDB.Exec(`DELETE FROM public.churches WHERE id = $1`, church)
	})

	h := NewEducationHandler()
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	setTenantContext(t, tx, church)
	defer func() { _ = tx.Rollback() }()

	// Curriculum
	curriculumBody, _ := json.Marshal(map[string]interface{}{"name": "Curso con módulos"})
	cCurr, recCurr := newQuizContextOn(tx, http.MethodPost, "/education/curricula", church, "", curriculumBody)
	if err := h.CreateCurriculum(cCurr); err != nil {
		t.Fatalf("CreateCurriculum: %v", err)
	}
	var curr struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(recCurr.Body.Bytes(), &curr)

	// Module
	moduleBody, _ := json.Marshal(map[string]interface{}{"title": "Módulo 1"})
	cMod, recMod := newQuizContextOn(tx, http.MethodPost, fmt.Sprintf("/education/curricula/%s/modules", curr.ID), church, "", moduleBody)
	cMod.SetParamNames("id")
	cMod.SetParamValues(curr.ID)
	if err := h.CreateCourseModule(cMod); err != nil {
		t.Fatalf("CreateCourseModule: %v", err)
	}
	if recMod.Code != http.StatusCreated {
		t.Fatalf("CreateCourseModule status = %d, body = %s", recMod.Code, recMod.Body.String())
	}
	var mod struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(recMod.Body.Bytes(), &mod)

	// Two lessons: one starts inside the module, one starts in "General".
	lesson1Body, _ := json.Marshal(map[string]interface{}{"title": "Lección 1", "module_id": mod.ID})
	cL1, recL1 := newQuizContextOn(tx, http.MethodPost, fmt.Sprintf("/education/curricula/%s/lessons", curr.ID), church, "", lesson1Body)
	cL1.SetParamNames("id")
	cL1.SetParamValues(curr.ID)
	if err := h.CreateLesson(cL1); err != nil {
		t.Fatalf("CreateLesson 1: %v", err)
	}
	var l1 struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(recL1.Body.Bytes(), &l1)

	lesson2Body, _ := json.Marshal(map[string]interface{}{"title": "Lección 2"})
	cL2, recL2 := newQuizContextOn(tx, http.MethodPost, fmt.Sprintf("/education/curricula/%s/lessons", curr.ID), church, "", lesson2Body)
	cL2.SetParamNames("id")
	cL2.SetParamValues(curr.ID)
	if err := h.CreateLesson(cL2); err != nil {
		t.Fatalf("CreateLesson 2: %v", err)
	}
	var l2 struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(recL2.Body.Bytes(), &l2)

	var l2ModuleBefore sql.NullString
	if err := tx.QueryRow(`SELECT module_id::text FROM education_lessons WHERE id = $1`, l2.ID).Scan(&l2ModuleBefore); err != nil {
		t.Fatalf("verify lesson2 pre-move: %v", err)
	}
	if l2ModuleBefore.Valid {
		t.Fatalf("expected lesson 2 to start in General (module_id NULL), got %v", l2ModuleBefore)
	}

	// SetLessonOrder — moves lesson 2 INTO the module, ahead of lesson 1
	// (mirrors ModuleLessonTree's flattenToOrderEntries: full ordered set,
	// module-scoped groups first).
	orderBody, _ := json.Marshal(map[string]interface{}{
		"lessons": []map[string]interface{}{
			{"id": l2.ID, "module_id": mod.ID, "order_index": 1},
			{"id": l1.ID, "module_id": mod.ID, "order_index": 2},
		},
	})
	cOrder, recOrder := newQuizContextOn(tx, http.MethodPut, fmt.Sprintf("/education/curricula/%s/lesson-order", curr.ID), church, "", orderBody)
	cOrder.SetParamNames("id")
	cOrder.SetParamValues(curr.ID)
	if err := h.SetLessonOrder(cOrder); err != nil {
		t.Fatalf("SetLessonOrder: %v", err)
	}
	if recOrder.Code != http.StatusOK {
		t.Fatalf("SetLessonOrder status = %d, body = %s", recOrder.Code, recOrder.Body.String())
	}

	var l2ModuleAfter sql.NullString
	var l2OrderAfter, l1OrderAfter int
	if err := tx.QueryRow(`SELECT module_id::text, order_index FROM education_lessons WHERE id = $1`, l2.ID).Scan(&l2ModuleAfter, &l2OrderAfter); err != nil {
		t.Fatalf("verify lesson2 post-move: %v", err)
	}
	if err := tx.QueryRow(`SELECT order_index FROM education_lessons WHERE id = $1`, l1.ID).Scan(&l1OrderAfter); err != nil {
		t.Fatalf("verify lesson1 post-move: %v", err)
	}
	if !l2ModuleAfter.Valid || l2ModuleAfter.String != mod.ID {
		t.Fatalf("expected lesson 2 moved into module %s, got %v", mod.ID, l2ModuleAfter)
	}
	if l2OrderAfter != 1 || l1OrderAfter != 2 {
		t.Fatalf("expected lesson2.order_index=1 lesson1.order_index=2, got l2=%d l1=%d", l2OrderAfter, l1OrderAfter)
	}

	// GetCurricula (admin list) now surfaces the real lesson_count (2) —
	// the PR-H addition this test also covers.
	// GetCurricula needs a non-empty (not necessarily FK-real) caller id —
	// getEducationAccessInfo rejects an empty user_id outright.
	cList, recList := newQuizContextOn(tx, http.MethodGet, "/education/curricula", church, "cccccccc-0000-0000-0000-0000000a0c02", nil)
	c3Level := 3
	cList.Set("module_role_level", c3Level)
	if err := h.GetCurricula(cList); err != nil {
		t.Fatalf("GetCurricula: %v", err)
	}
	var list []struct {
		ID          string `json:"id"`
		LessonCount int    `json:"lesson_count"`
	}
	if err := json.Unmarshal(recList.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	found := false
	for _, item := range list {
		if item.ID == curr.ID {
			found = true
			if item.LessonCount != 2 {
				t.Fatalf("expected lesson_count=2 for %s, got %d", curr.ID, item.LessonCount)
			}
		}
	}
	if !found {
		t.Fatalf("curriculum %s not found in GetCurricula response", curr.ID)
	}
}
