package handlers

import (
	"backend-sion/config"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// StartWeeklyReportScheduler lanza el goroutine que cada martes a las 8am
// revisa qué usuarios no enviaron su reporte semanal y genera alertas.
func StartWeeklyReportScheduler() {
	go func() {
		for {
			next := nextTuesdayAt8AM(time.Now())
			log.Printf("[scheduler] próxima revisión de reportes: %s", next.Format("Mon 02/01 15:04"))
			time.Sleep(time.Until(next))

			db := config.GetDB()
			if db == nil || db.DB == nil {
				log.Println("[scheduler] DB no disponible, omitiendo revisión")
				continue
			}

			count, err := checkMissingWeeklyReports(db.DB)
			if err != nil {
				log.Printf("[scheduler] error al revisar reportes: %v", err)
			} else {
				log.Printf("[scheduler] alertas de reporte faltante creadas: %d", count)
			}
		}
	}()
}

// nextTuesdayAt8AM calcula el próximo martes a las 08:00 local.
// Si hoy es martes pero ya pasaron las 8am, devuelve el martes siguiente.
func nextTuesdayAt8AM(from time.Time) time.Time {
	const tuesday = time.Tuesday
	daysUntil := (int(tuesday) - int(from.Weekday()) + 7) % 7
	if daysUntil == 0 && (from.Hour() > 8 || (from.Hour() == 8 && from.Minute() >= 1)) {
		daysUntil = 7
	}
	target := from.AddDate(0, 0, daysUntil)
	return time.Date(target.Year(), target.Month(), target.Day(), 8, 0, 0, 0, from.Location())
}

// checkMissingWeeklyReports busca usuarios con jerarquía asignada que no
// enviaron reporte en los últimos 7 días y crea una alerta por cada uno.
// Retorna la cantidad de alertas nuevas creadas.
func checkMissingWeeklyReports(db *sql.DB) (int, error) {
	rows, err := db.Query(`
		SELECT h.user_id,
		       COALESCE(u.first_name || ' ' || u.last_name, u.email) AS user_name,
		       h.hierarchy_level,
		       h.zone_id
		FROM discipleship_hierarchy h
		JOIN users u ON h.user_id = u.id
		WHERE u.is_active = true
		  AND h.hierarchy_level BETWEEN 1 AND 4
	`)
	if err != nil {
		return 0, fmt.Errorf("consultando jerarquía: %w", err)
	}
	defer rows.Close()

	levelNames := map[int]string{
		1: "Líder",
		2: "Supervisor Auxiliar",
		3: "Supervisor General",
		4: "Coordinador",
	}

	count := 0
	for rows.Next() {
		var userID, userName string
		var level int
		var zoneID sql.NullString

		if err := rows.Scan(&userID, &userName, &level, &zoneID); err != nil {
			continue
		}

		// ¿Ya tiene un reporte enviado/aprobado esta semana?
		var hasReport bool
		_ = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM discipleship_reports
				WHERE reporter_id   = $1
				  AND report_level  = $2
				  AND status        IN ('submitted', 'approved')
				  AND period_end    >= CURRENT_DATE - INTERVAL '7 days'
			)
		`, userID, level).Scan(&hasReport)

		if hasReport {
			continue
		}

		// ¿Ya existe una alerta activa de no_reports para este usuario esta semana?
		var alertExists bool
		_ = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM discipleship_alerts
				WHERE related_user_id = $1
				  AND alert_type      = 'no_reports'
				  AND resolved        = false
				  AND created_at      >= CURRENT_DATE - INTERVAL '7 days'
			)
		`, userID).Scan(&alertExists)

		if alertExists {
			continue
		}

		levelName := levelNames[level]
		if levelName == "" {
			levelName = fmt.Sprintf("Nivel %d", level)
		}

		var zoneIDVal interface{}
		if zoneID.Valid && zoneID.String != "" {
			zoneIDVal = zoneID.String
		}

		_, err = db.Exec(`
			INSERT INTO discipleship_alerts (
				alert_type, title, message, priority,
				related_user_id, zone_id, action_required
			) VALUES (
				'no_reports', $1, $2, 2, $3, $4, true
			)
		`,
			fmt.Sprintf("Reporte semanal pendiente — %s", levelName),
			fmt.Sprintf("%s (%s) no envió su reporte semanal", userName, levelName),
			userID,
			zoneIDVal,
		)
		if err == nil {
			count++
		}
	}

	return count, nil
}

// SchedulerHandler expone endpoints para administrar el scheduler.
type SchedulerHandler struct{}

func NewSchedulerHandler() *SchedulerHandler {
	return &SchedulerHandler{}
}

// TriggerMissingReportsCheck permite disparar la revisión manualmente
// sin esperar al martes. Útil para testing y ejecución manual desde el panel.
func (h *SchedulerHandler) TriggerMissingReportsCheck(c echo.Context) error {
	db := config.GetDB()
	if db == nil || db.DB == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "Base de datos no disponible",
		})
	}

	count, err := checkMissingWeeklyReports(db.DB)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error al revisar reportes: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"alerts_created": count,
		"message":        fmt.Sprintf("Revisión completada. %d alertas nuevas creadas.", count),
		"checked_at":     time.Now().Format(time.RFC3339),
	})
}
