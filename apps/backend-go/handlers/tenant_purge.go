// Package handlers — borrado automático de datos de un tenant cancelado.
//
// Disparado por StartTenantPurgeScheduler (scheduler.go) cuando un tenant
// lleva TenantPurgeGraceDays en status='cancelled'. Borra TODA la data
// personal de la iglesia (usuarios, discipulado, música, zonas, reportes,
// etc.) y deja el registro en churches como tombstone (id/name/status,
// deleted_at seteado) para trazabilidad — sin datos personales de sus
// miembros.
//
// El orden de los DELETE respeta las foreign keys reales de la base (ver
// información obtenida de information_schema, no supuesta) — pero la
// seguridad real viene de que todo corre en UNA transacción: si algo falla
// en cualquier paso, no se borra nada. Nunca hay un borrado parcial.
package handlers

import (
	"database/sql"
	"fmt"
)

// tenantPurgeTables lista, EN ORDEN, las tablas con church_id a vaciar antes
// de tocar users/zones. El orden dentro de cada grupo no importa entre sí;
// lo que importa es que un grupo completo termine antes de que empiece el
// siguiente (evita violar foreign keys entre estas tablas).
var tenantPurgeTables = [][]string{
	// Grupo 1: hojas del árbol de dependencias — nada más las referencia.
	{
		"audit_logs", "goal_manual_progress", "discipleship_group_members",
		"discipleship_attendance", "event_registrations", "music_assignments",
		"music_event_songs", "music_unavailability", "module_user_roles",
		"notifications", "report_generations", "reports", "user_permissions",
		"discipleship_alerts", "discipleship_hierarchy",
		// education_lesson_progress depende de education_assignments Y
		// education_lessons (grupo 2) — va en grupo 1 porque nada más lo
		// referencia a él, y debe borrarse ANTES que sus dos padres.
		"education_lesson_progress",
		// Sin foreign key detectada hacia otra tabla de este tenant — se
		// pueden borrar en cualquier momento, van acá por prolijidad.
		"church_info", "modules", "system_settings", "notification_config",
		"settings_audit_log", "role_module_access", "federated_sessions_log",
		"user_invitations", "user_preferences", "user_profiles",
		"cell_multiplication_tracking", "discipleship_levels",
		"access_denied_logs", "music_telegram_files", "live_streams",
		"report_compliance",
	},
	// Grupo 2: dependen de algo del grupo 1.
	{
		"goal_assignments", "events", "music_members", "music_events",
		"music_songs", "discipleship_groups",
		// education_assignments y education_lessons dependen de
		// education_curricula (grupo 3) — deben borrarse antes que ella.
		"education_assignments", "education_lessons",
	},
	// Grupo 3: dependen de algo del grupo 2 (y de zones, que se borra después).
	{"discipleship_goals", "discipleship_reports", "education_curricula"},
}

// purgeChurchData borra todos los datos de una iglesia dentro de una sola
// transacción. Devuelve cuántas filas se borraron por tabla — para el log
// de auditoría ("borramos X filas de Y tablas el día Z"). No borra la fila
// de churches: eso lo hace el caller, convirtiéndola en tombstone.
func purgeChurchData(db *sql.DB, churchID string) (map[string]int64, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("purgeChurchData: begin tx: %w", err)
	}
	defer tx.Rollback() // no-op si ya se hizo Commit

	counts := make(map[string]int64)

	for _, group := range tenantPurgeTables {
		for _, table := range group {
			res, err := tx.Exec(fmt.Sprintf(`DELETE FROM public.%s WHERE church_id = $1`, table), churchID)
			if err != nil {
				return nil, fmt.Errorf("purgeChurchData: delete from %s: %w", table, err)
			}
			n, _ := res.RowsAffected()
			counts[table] = n
		}
	}

	// zones <-> users es circular (zones.supervisor_id -> users,
	// users.zone_id -> zones): hay que romper la referencia antes de poder
	// borrar cualquiera de las dos.
	if _, err := tx.Exec(`UPDATE public.users SET zone_id = NULL WHERE church_id = $1`, churchID); err != nil {
		return nil, fmt.Errorf("purgeChurchData: unlink users.zone_id: %w", err)
	}
	if _, err := tx.Exec(`UPDATE public.zones SET supervisor_id = NULL WHERE church_id = $1`, churchID); err != nil {
		return nil, fmt.Errorf("purgeChurchData: unlink zones.supervisor_id: %w", err)
	}

	res, err := tx.Exec(`DELETE FROM public.users WHERE church_id = $1`, churchID)
	if err != nil {
		return nil, fmt.Errorf("purgeChurchData: delete from users: %w", err)
	}
	n, _ := res.RowsAffected()
	counts["users"] = n

	res, err = tx.Exec(`DELETE FROM public.zones WHERE church_id = $1`, churchID)
	if err != nil {
		return nil, fmt.Errorf("purgeChurchData: delete from zones: %w", err)
	}
	n, _ = res.RowsAffected()
	counts["zones"] = n

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("purgeChurchData: commit: %w", err)
	}
	return counts, nil
}
