package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type NotificationsHandler struct{}

func NewNotificationsHandler() *NotificationsHandler {
	return &NotificationsHandler{}
}

// GetNotifications returns up to 50 notifications for the authenticated user.
// Supports ?unread=true to return only unread notifications.
func (h *NotificationsHandler) GetNotifications(c echo.Context) error {
	userID := c.Get("user_id").(string)
	db := config.GetDB()

	query := `
		SELECT id, user_id, type, title, message,
		       action_url, action_text,
		       related_entity_type, related_entity_id,
		       read, created_at
		FROM notifications
		WHERE user_id = $1
	`

	if c.QueryParam("unread") == "true" {
		query += " AND read = false"
	}

	query += " ORDER BY created_at DESC LIMIT 50"

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		c.Logger().Error("GetNotifications query error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al obtener notificaciones",
		})
	}
	defer rows.Close()

	notifications := make([]models.Notification, 0)
	for rows.Next() {
		var n models.Notification
		var actionURL, actionText, relatedEntityType, relatedEntityID sql.NullString
		var createdAt time.Time

		err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message,
			&actionURL, &actionText,
			&relatedEntityType, &relatedEntityID,
			&n.Read, &createdAt,
		)
		if err != nil {
			continue
		}

		n.CreatedAt = createdAt
		if actionURL.Valid {
			n.ActionURL = &actionURL.String
		}
		if actionText.Valid {
			n.ActionText = &actionText.String
		}
		if relatedEntityType.Valid {
			n.RelatedEntityType = &relatedEntityType.String
		}
		if relatedEntityID.Valid {
			n.RelatedEntityID = &relatedEntityID.String
		}

		notifications = append(notifications, n)
	}

	return c.JSON(http.StatusOK, notifications)
}

// MarkAsRead marks a single notification as read.
// Returns 404 if the notification does not belong to the authenticated user.
func (h *NotificationsHandler) MarkAsRead(c echo.Context) error {
	id := c.Param("id")
	userID := c.Get("user_id").(string)
	db := config.GetDB()

	result, err := db.DB.Exec(`
		UPDATE notifications SET read = true
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		c.Logger().Error("MarkAsRead error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al marcar notificación como leída",
		})
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Notificación no encontrada",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Notificación marcada como leída",
	})
}

// MarkAllAsRead marks all unread notifications for the authenticated user as read.
func (h *NotificationsHandler) MarkAllAsRead(c echo.Context) error {
	userID := c.Get("user_id").(string)
	db := config.GetDB()

	_, err := db.DB.Exec(`
		UPDATE notifications SET read = true
		WHERE user_id = $1 AND read = false
	`, userID)
	if err != nil {
		c.Logger().Error("MarkAllAsRead error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al marcar notificaciones como leídas",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Todas las notificaciones marcadas como leídas",
	})
}

// DismissNotification deletes a single notification.
// Returns 404 if the notification does not belong to the authenticated user.
func (h *NotificationsHandler) DismissNotification(c echo.Context) error {
	id := c.Param("id")
	userID := c.Get("user_id").(string)
	db := config.GetDB()

	result, err := db.DB.Exec(`
		DELETE FROM notifications
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		c.Logger().Error("DismissNotification error:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error al eliminar notificación",
		})
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Notificación no encontrada",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Notificación eliminada",
	})
}
