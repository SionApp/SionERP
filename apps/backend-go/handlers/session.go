// Package handlers — sesión única activa (ver middleware/session.go). El
// frontend llama a este endpoint apenas se autentica, con un session_id propio;
// el UPSERT sobre active_sessions (PK = user_id) pisa cualquier sesión anterior
// del mismo usuario, forzando el cierre en el otro dispositivo.
package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type SessionHandler struct{}

func NewSessionHandler() *SessionHandler { return &SessionHandler{} }

type claimSessionRequest struct {
	SessionID string `json:"session_id"`
}

// ClaimSession POST /auth/session/claim — reclama la sesión activa para este
// dispositivo. Exento del SessionGuard (ver session.go) porque es, justamente,
// el request que toma la sesión.
func (h *SessionHandler) ClaimSession(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	userID, _ := c.Get("user_id").(string)
	if churchID == "" || userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing session context"})
	}

	var req claimSessionRequest
	if err := c.Bind(&req); err != nil || req.SessionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "session_id requerido"})
	}

	_, err = q.Exec(`
		INSERT INTO active_sessions (user_id, church_id, session_id, user_agent)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
			session_id = EXCLUDED.session_id,
			church_id = EXCLUDED.church_id,
			user_agent = EXCLUDED.user_agent,
			last_seen_at = now()
	`, userID, churchID, req.SessionID, c.Request().UserAgent())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo reclamar la sesión"})
	}
	return c.JSON(http.StatusOK, map[string]bool{"claimed": true})
}
