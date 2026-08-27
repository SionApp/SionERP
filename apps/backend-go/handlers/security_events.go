// Package handlers — GET /security/events: lista de eventos críticos de
// seguridad (issue #53). Ver middleware/audit_log.go LogSecurityEvent para
// los puntos de instrumentación (cambio de rol, suspensión, exportación).
package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type SecurityEventsHandler struct{}

func NewSecurityEventsHandler() *SecurityEventsHandler { return &SecurityEventsHandler{} }

type securityEventDTO struct {
	ID        string `json:"id"`
	EventType string `json:"event_type"`
	UserName  string `json:"user_name"`
	ActorName string `json:"actor_name"`
	IPAddress string `json:"ip_address"`
	CreatedAt string `json:"created_at"`
}

// GetEvents lists the church's security events, most recent first.
func (h *SecurityEventsHandler) GetEvents(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	rows, err := q.Query(`
		SELECT se.id, se.event_type,
		       COALESCE(TRIM(u.first_name || ' ' || u.last_name), ''),
		       COALESCE(TRIM(a.first_name || ' ' || a.last_name), 'Sistema'),
		       COALESCE(se.ip_address, ''),
		       to_char(se.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM security_events se
		LEFT JOIN users u ON u.id = se.user_id AND u.church_id = $1
		LEFT JOIN users a ON a.id = se.actor_id AND a.church_id = $1
		WHERE se.church_id = $1
		ORDER BY se.created_at DESC
		LIMIT 100
	`, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo listar los eventos de seguridad"})
	}
	defer rows.Close()

	out := []securityEventDTO{}
	for rows.Next() {
		var e securityEventDTO
		if err := rows.Scan(&e.ID, &e.EventType, &e.UserName, &e.ActorName, &e.IPAddress, &e.CreatedAt); err != nil {
			continue
		}
		out = append(out, e)
	}
	return c.JSON(http.StatusOK, out)
}
