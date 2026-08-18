package handlers

// tenant_purge_test.go — Integration test for purgeChurchData.
//
// Corre solo con TEST_DATABASE_URL seteada (mismo patrón que compliance_test.go).
// Verifica lo que realmente importa acá porque el borrado es irreversible:
//   1. La referencia circular zones<->users no rompe la transacción.
//   2. Se borra TODO lo del tenant purgado (incluyendo una tabla de cada
//      "capa" de dependencias: hoja, media, alta).
//   3. Un tenant de control, sin relación, queda completamente intacto.

import (
	"database/sql"
	"testing"
)

func TestPurgeChurchData(t *testing.T) {
	db := openTestDB(t)

	// Tenant a purgar: zona + usuario con referencia circular
	// (zone.supervisor_id -> user, user.zone_id -> zone), un grupo (capa
	// media) y un reporte (capa alta) — ejercitan las tres capas del
	// orden de borrado, no solo el caso fácil.
	churchA := seedChurch(t, db, "Purge Target Co")
	userA := seedUser(t, db, churchA, "purge-target@test.local")
	zoneA := seedZone(t, db, churchA, "Zona a Purgar")
	if _, err := db.Exec(`UPDATE users SET zone_id = $1 WHERE id = $2`, zoneA, userA); err != nil {
		t.Fatalf("link user to zone: %v", err)
	}
	if _, err := db.Exec(`UPDATE zones SET supervisor_id = $1 WHERE id = $2`, userA, zoneA); err != nil {
		t.Fatalf("link zone to supervisor (referencia circular): %v", err)
	}
	groupA := seedGroup(t, db, churchA, zoneA, userA, "Grupo a Purgar")
	reportA := seedDiscipleshipReport(t, db, churchA, userA, 5, 2)
	_ = groupA
	_ = reportA

	// Tenant de control: no debe verse afectado por la purga de churchA.
	churchB := seedChurch(t, db, "Control Co (no tocar)")
	userB := seedUser(t, db, churchB, "control@test.local")
	zoneB := seedZone(t, db, churchB, "Zona de Control")
	t.Cleanup(func() {
		db.Exec(`DELETE FROM churches WHERE id IN ($1, $2)`, churchA, churchB)
	})

	counts, err := purgeChurchData(db, churchA)
	if err != nil {
		t.Fatalf("purgeChurchData falló — con la transacción, esto significa que NO se borró nada: %v", err)
	}

	if counts["users"] != 1 {
		t.Errorf("esperaba 1 usuario borrado de churchA, borró %d", counts["users"])
	}
	if counts["zones"] != 1 {
		t.Errorf("esperaba 1 zona borrada de churchA, borró %d", counts["zones"])
	}
	if counts["discipleship_groups"] != 1 {
		t.Errorf("esperaba 1 grupo borrado de churchA, borró %d", counts["discipleship_groups"])
	}
	if counts["discipleship_reports"] != 1 {
		t.Errorf("esperaba 1 reporte borrado de churchA, borró %d", counts["discipleship_reports"])
	}

	assertZeroRows(t, db, "users", churchA)
	assertZeroRows(t, db, "zones", churchA)
	assertZeroRows(t, db, "discipleship_groups", churchA)
	assertZeroRows(t, db, "discipleship_reports", churchA)

	// El tenant de control tiene que seguir intacto — el bug más caro acá
	// sería un WHERE mal armado que se lleve puesto a alguien más.
	assertOneRow(t, db, "users", churchB, userB)
	assertOneRow(t, db, "zones", churchB, zoneB)
}

func assertZeroRows(t *testing.T, db *sql.DB, table, churchID string) {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM `+table+` WHERE church_id = $1`, churchID).Scan(&n); err != nil {
		t.Fatalf("assertZeroRows(%s): %v", table, err)
	}
	if n != 0 {
		t.Errorf("%s: esperaba 0 filas para el tenant purgado, quedaron %d", table, n)
	}
}

func assertOneRow(t *testing.T, db *sql.DB, table, churchID, expectID string) {
	t.Helper()
	var id string
	err := db.QueryRow(`SELECT id FROM `+table+` WHERE church_id = $1`, churchID).Scan(&id)
	if err != nil {
		t.Fatalf("assertOneRow(%s): tenant de control perdió su fila — la purga se llevó puesto algo que no debía: %v", table, err)
	}
	if id != expectID {
		t.Errorf("%s: id inesperado %q (esperaba %q)", table, id, expectID)
	}
}
