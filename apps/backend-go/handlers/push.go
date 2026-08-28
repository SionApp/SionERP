// Package handlers — issue #24: Web Push. Endpoints para que el navegador
// registre/borre su suscripción PushManager, y el helper que el worker de
// notification_queue usa para EMPUJAR notificaciones al dispositivo aunque la
// pestaña esté cerrada. Reusa la misma cola (notification_queue) que el email:
// una fila channel='push' → este canal la entrega.
package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"backend-sion/config"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/labstack/echo/v4"
)

type PushHandler struct{}

func NewPushHandler() *PushHandler { return &PushHandler{} }

// GetVAPIDPublicKey GET /push/vapid-public-key — el frontend la necesita para
// armar pushManager.subscribe({ applicationServerKey }). Pública dentro del
// grupo protegido: no revela nada sensible (la clave es, por diseño, pública).
func (h *PushHandler) GetVAPIDPublicKey(c echo.Context) error {
	pc := config.GetPushConfig()
	if !pc.IsPushEnabled() {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "push no configurado en el servidor",
		})
	}
	return c.JSON(http.StatusOK, map[string]string{"publicKey": pc.PublicKey})
}

type subscribeRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

// Subscribe POST /push/subscribe — guarda (o refresca) la suscripción del
// navegador para el usuario autenticado. Idempotente por endpoint único: si el
// mismo navegador re-suscribe, se actualizan las llaves y el last_used_at.
func (h *PushHandler) Subscribe(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	churchID, _ := c.Get("church_id").(string)
	userID, _ := c.Get("user_id").(string)
	if churchID == "" || userID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing session context"})
	}

	var req subscribeRequest
	if err := c.Bind(&req); err != nil || req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "suscripción inválida"})
	}

	_, err = q.Exec(`
		INSERT INTO push_subscriptions (church_id, user_id, endpoint, p256dh, auth, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (endpoint) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			church_id = EXCLUDED.church_id,
			p256dh = EXCLUDED.p256dh,
			auth = EXCLUDED.auth,
			user_agent = EXCLUDED.user_agent,
			last_used_at = now()
	`, churchID, userID, req.Endpoint, req.Keys.P256dh, req.Keys.Auth, c.Request().UserAgent())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo guardar la suscripción"})
	}
	return c.JSON(http.StatusOK, map[string]bool{"subscribed": true})
}

type unsubscribeRequest struct {
	Endpoint string `json:"endpoint"`
}

// Unsubscribe POST /push/unsubscribe — borra la suscripción de ESTE navegador
// (el usuario apagó las notificaciones, o el browser rotó el endpoint).
func (h *PushHandler) Unsubscribe(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID, _ := c.Get("user_id").(string)
	var req unsubscribeRequest
	if err := c.Bind(&req); err != nil || req.Endpoint == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "endpoint requerido"})
	}
	_, _ = q.Exec(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, req.Endpoint, userID)
	return c.JSON(http.StatusOK, map[string]bool{"unsubscribed": true})
}

// pushPayload es lo que el service worker (public/sw.js) espera en el evento
// 'push': title/body/url. Mantener en sync con ese archivo.
type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
}

// sendWebPushToUser empuja una notificación a TODOS los navegadores suscritos
// del usuario. Corre desde el worker (pool global, no TenantTx) — por eso
// scopea explícito por user_id. Devuelve cuántos envíos salieron OK. Una
// suscripción que el push service reporta como muerta (404/410) se borra sola.
func sendWebPushToUser(db *sql.DB, userID, title, body, url string) (int, error) {
	pc := config.GetPushConfig()
	if !pc.IsPushEnabled() {
		return 0, nil
	}

	rows, err := db.Query(
		`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, userID,
	)
	if err != nil {
		return 0, err
	}
	type sub struct{ id, endpoint, p256dh, auth string }
	var subs []sub
	for rows.Next() {
		var s sub
		if rows.Scan(&s.id, &s.endpoint, &s.p256dh, &s.auth) == nil {
			subs = append(subs, s)
		}
	}
	rows.Close()

	if url == "" {
		url = "/"
	}
	payload, _ := json.Marshal(pushPayload{Title: title, Body: body, URL: url})

	sent := 0
	for _, s := range subs {
		resp, sendErr := webpush.SendNotification(payload, &webpush.Subscription{
			Endpoint: s.endpoint,
			Keys:     webpush.Keys{P256dh: s.p256dh, Auth: s.auth},
		}, &webpush.Options{
			Subscriber:      pc.Subject,
			VAPIDPublicKey:  pc.PublicKey,
			VAPIDPrivateKey: pc.PrivateKey,
			TTL:             30,
		})
		if sendErr != nil {
			continue
		}
		// 404/410 → el navegador desinstaló/rotó la suscripción: limpiarla.
		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
			_, _ = db.Exec(`DELETE FROM push_subscriptions WHERE id = $1`, s.id)
		} else if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			sent++
		}
		resp.Body.Close()
	}
	return sent, nil
}
