// Package handlers — issue #9: correos masivos a usuarios/grupos. No es un
// canal de envío nuevo: encola una fila por destinatario en
// notification_queue (issue #52), la misma cola que StartNotificationQueueWorker
// ya procesa cada 5 minutos vía Resend. Reusar la cola evita un segundo
// camino de envío con su propio manejo de fallos/reintentos.
package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type CommunicationsHandler struct{}

func NewCommunicationsHandler() *CommunicationsHandler { return &CommunicationsHandler{} }

// bulkEmailMaxRecipients: techo razonable para no dejar encolar un envío
// masivo accidental de miles de filas de una sola request.
const bulkEmailMaxRecipients = 1000

type bulkEmailRequest struct {
	RecipientIDs []string `json:"recipient_ids"`
	Subject      string   `json:"subject"`
	Body         string   `json:"body"`
}

// SendBulkEmail POST /communications/bulk-email — encola un correo para cada
// user_id de la lista. Los usuarios que no pertenezcan a la iglesia del
// caller quedan afuera por el WHERE church_id, sin necesidad de validarlos
// uno por uno antes de encolar.
func (h *CommunicationsHandler) SendBulkEmail(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, ok := c.Get("church_id").(string)
	if !ok || churchID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing church context"})
	}

	var req bulkEmailRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "cuerpo inválido"})
	}
	if req.Subject == "" || req.Body == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "asunto y mensaje son obligatorios"})
	}
	if len(req.RecipientIDs) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "seleccioná al menos un destinatario"})
	}
	if len(req.RecipientIDs) > bulkEmailMaxRecipients {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "demasiados destinatarios en un solo envío"})
	}

	queued := 0
	for _, userID := range req.RecipientIDs {
		result, err := q.Exec(`
			INSERT INTO notification_queue (church_id, user_id, channel, subject, body)
			SELECT $1, id, 'email', $2, $3 FROM users WHERE id = $4::uuid AND church_id = $1
		`, churchID, req.Subject, req.Body, userID)
		if err != nil {
			continue
		}
		if n, _ := result.RowsAffected(); n > 0 {
			queued++
		}
	}

	return c.JSON(http.StatusOK, map[string]any{"queued": queued})
}
