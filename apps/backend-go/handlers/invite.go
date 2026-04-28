// Package handlers contiene los controladores para manejar las solicitudes HTTP relacionadas con invitaciones de usuarios.
package handlers

import (
	"backend-sion/config"
	"backend-sion/emails"
	"backend-sion/models"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
)

type InviteHandler struct {
	supabase *config.SupabaseClient
}

func NewInviteHandler() *InviteHandler {
	return &InviteHandler{
		supabase: config.NewSupabaseClient(),
	}
}

func (h *InviteHandler) InviteUser(c echo.Context) error {
	var req models.InviteUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	inviteBy := c.Get("user_id").(string)

	db := config.GetDB()

	var existingInvite string

	checkQuery := `
		SELECT id FROM user_invitations 
		WHERE email = $1 AND status IN ('pending', 'accepted')`

	err := db.DB.QueryRow(checkQuery, req.Email).Scan(&existingInvite)
	if err == nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "User already has an active invite",
		})
	}

	insertQuery := `
		INSERT INTO user_invitations (email, first_name, last_name, phone, id_number, assigned_role, invited_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')
		RETURNING id, expires_at`

	var invitationID string
	var expiresAt time.Time

	err = db.DB.QueryRow(insertQuery, req.Email, req.FirstName, req.LastName, req.Phone, req.IdNumber, req.Role, inviteBy).Scan(&invitationID, &expiresAt)
	if err != nil {
		fmt.Printf("Error creating invite: %v", insertQuery)
		fmt.Println("Error creating invite:", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error creating invite",
		})
	}

	userData := map[string]interface{}{
		"first_name":    req.FirstName,
		"last_name":     req.LastName,
		"phone":         req.Phone,
		"id_number":     req.IdNumber,
		"role":          req.Role,
	}

	// Usar FRONTEND_URL del header o variable de entorno
	// Por defecto usa la URL de Supabase redirect para manejo del callback
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // Puerto por defecto de Vite
	}
	redirectURL := frontendURL

	magicLink, err := h.supabase.GenerateMagicLink(req.Email, redirectURL, userData)
	if err != nil {
		// Marcar invitación como fallida
		_, updateErr := db.DB.Exec("UPDATE user_invitations SET status = 'failed' WHERE id = $1", invitationID)
		if updateErr != nil {
			c.Logger().Errorf("Failed to update invitation status to 'failed' for ID %s: %v", invitationID, updateErr)
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": fmt.Sprintf("Failed to generate magic link: %v", err),
		})
	}
	updateQuery := `
	UPDATE user_invitations 
	SET magic_link_hash = $1
	WHERE id = $2`

	_, err = db.DB.Exec(updateQuery, magicLink.HashedToken, invitationID)
	if err != nil {
		c.Logger().Errorf("Failed to update magic_link_hash for invitation ID %s: %v", invitationID, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to save magic link hash. Invitation created but magic link may not be valid.",
		})
	}

	// ==========================================
	// ENVIAR EMAIL CON RESEND
	// ==========================================
	emailConfig := config.GetEmailConfig()
	
	// Solo enviar email si está configurado
	if emailConfig.IsEmailEnabled() {
		emailService := emails.NewEmailService(
			emailConfig.APIKey,
			emailConfig.FromEmail,
			emailConfig.FrontendURL,
		)
		
		// Enviar email
		emailErr := emailService.SendInvitationEmail(emails.InvitationEmailData{
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
			Role:      getRoleDisplayName(req.Role),
			MagicLink: magicLink.HashedToken, // Usamos el token como parte del link
			ExpiresIn: "7 días",
		})
		
		if emailErr != nil {
			c.Logger().Errorf("Failed to send invitation email: %v", emailErr)
			// No fallamos la invitación por error de email
		}
	} else {
		// Si no está configurado, logs el link para desarrollo
		devLink := fmt.Sprintf("%s/?token=%s", emailConfig.FrontendURL, magicLink.HashedToken)
		fmt.Printf("\n========== MAGIC LINK PARA DESARROLLO ==========\n")
		fmt.Printf("Email: %s\n", req.Email)
		fmt.Printf("Link: %s\n", devLink)
		fmt.Printf("==================================================\n\n")
	}

	return c.JSON(http.StatusOK, &models.InviteResponse{
		InvitationID: invitationID,
		Email:        req.Email,
		Status:       "pending",
		ExpiresAt:    expiresAt,
		Message:      "Invitación enviada exitosamente. El usuario recibirá un email con el magic link.",
	})
}

// ResendInvitation reenvía una invitación expirada
func (h *InviteHandler) ResendInvitation(c echo.Context) error {
	invitationID := c.Param("id")

	db := config.GetDB()

	// 1. Obtener datos de la invitación
	var inv models.InviteUserRequest
	query := `
			SELECT email, first_name, last_name, phone, id_number, assigned_role
			FROM user_invitations
			WHERE id = $1
	`
	err := db.DB.QueryRow(query, invitationID).Scan(
			&inv.Email, &inv.FirstName, &inv.LastName, &inv.Phone, &inv.IdNumber, &inv.Role,
	)
	if err != nil {
			return c.JSON(http.StatusNotFound, map[string]string{
					"error": "Invitation not found",
			})
	}

	// 2. Actualizar estado y expiración
	updateQuery := `
			UPDATE user_invitations
			SET status = 'resent', 
					expires_at = NOW() + INTERVAL '7 days',
					updated_at = NOW()
			WHERE id = $1
			RETURNING expires_at
	`
	var newExpiresAt time.Time
	err = db.DB.QueryRow(updateQuery, invitationID).Scan(&newExpiresAt)
	if err != nil {
		c.Logger().Errorf("Failed to update invitation expiration for ID %s: %v", invitationID, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update invitation expiration",
		})
	}

	// 3. Generar nuevo Magic Link
	userData := map[string]interface{}{
			"first_name":    inv.FirstName,
			"last_name":     inv.LastName,
			"phone":         inv.Phone,
			"id_number":     inv.IdNumber,
			"role":          inv.Role,
			"invitation_id": invitationID,
	}

	redirectURL := "https://tu-dominio.com/onboarding"

	_, err = h.supabase.GenerateMagicLink(inv.Email, redirectURL, userData)
	if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Failed to resend invitation",
			})
	}

	return c.JSON(http.StatusOK, &models.InviteResponse{
		InvitationID: invitationID,
		Email:        inv.Email,
		Status:       "pending",
		ExpiresAt:    newExpiresAt,
		Message:      "Invitación reenviada exitosamente",
	})
}

// GetInvitations lista todas las invitaciones (para el frontend)
func (h *InviteHandler) GetInvitations(c echo.Context) error {
	db := config.GetDB()

	query := `
			SELECT 
					i.id, i.email, i.first_name, i.last_name, i.phone, 
					i.assigned_role, i.status, i.invited_at, i.expires_at,
					u.first_name || ' ' || u.last_name as invited_by_name
			FROM user_invitations i
			LEFT JOIN users u ON i.invited_by = u.id
			ORDER BY i.invited_at DESC
	`

	rows, err := db.DB.Query(query)
	if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "Error fetching invitations",
			})
	}
	defer rows.Close()

	invitations := []map[string]interface{}{}
	for rows.Next() {
			var id, email, assignedRole, status string
			var firstName, lastName, phone sql.NullString
			var invitedAt, expiresAt time.Time
			var invitedByName sql.NullString

			err := rows.Scan(
					&id, &email, &firstName, &lastName, &phone,
					&assignedRole, &status, &invitedAt, &expiresAt,
					&invitedByName,
			)
			if err != nil {
					fmt.Printf("Error scanning invitation row: %v\n", err)
					return c.JSON(http.StatusInternalServerError, map[string]string{
							"error": "Error processing invitations",
					})
			}

			inv := map[string]interface{}{
					"id":             id,
					"email":          email,
					"first_name":     firstName.String,
					"last_name":      lastName.String,
					"phone":          phone.String,
					"assigned_role":  assignedRole,
					"status":         status,
					"invited_at":     invitedAt.Format(time.RFC3339),
					"expires_at":     expiresAt.Format(time.RFC3339),
					"invited_by_name": invitedByName.String,
			}
			invitations = append(invitations, inv)
	}

	if err = rows.Err(); err != nil {
		fmt.Printf("Error iterating over invitation rows: %v\n", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error processing invitations",
		})
	}
	fmt.Println("Invitations fetched:", invitations)

	return c.JSON(http.StatusOK, invitations)
}

// AcceptInvitation marca una invitación como aceptada
// Se puede llamar manualmente o se actualiza automáticamente cuando el usuario acepta el magic link
func (h *InviteHandler) AcceptInvitation(c echo.Context) error {
	invitationID := c.Param("id")
	userID := c.Get("user_id").(string)

	db := config.GetDB()

	// Verificar que la invitación existe y está pendiente
	var email string
	var status string
	checkQuery := `
		SELECT email, status 
		FROM user_invitations 
		WHERE id = $1
	`
	err := db.DB.QueryRow(checkQuery, invitationID).Scan(&email, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Invitation not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error checking invitation",
		})
	}

	// Verificar que el usuario autenticado corresponde al email de la invitación
	var userEmail string
	err = db.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&userEmail)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not found",
		})
	}

	if userEmail != email {
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "This invitation does not belong to the authenticated user",
		})
	}

	// Actualizar el estado de la invitación
	updateQuery := `
		UPDATE user_invitations
		SET status = 'accepted',
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, status, expires_at
	`
	
	var updatedID, updatedEmail, updatedStatus string
	var expiresAt time.Time
	err = db.DB.QueryRow(updateQuery, invitationID).Scan(&updatedID, &updatedEmail, &updatedStatus, &expiresAt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error updating invitation",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Invitation accepted successfully",
		"invitation": map[string]interface{}{
			"id":         updatedID,
			"email":      updatedEmail,
			"status":     updatedStatus,
			"expires_at": expiresAt.Format(time.RFC3339),
		},
	})
}

// Helper para obtener el nombre display del rol en español
func getRoleDisplayName(role string) string {
	switch role {
	case "admin":
		return "Administrador"
	case "pastor":
		return "Pastor"
	case "staff":
		return "Staff"
	case "supervisor":
		return "Supervisor"
	case "server":
		return "Servidor"
	case "member":
		return "Miembro"
	default:
		return role
	}
}