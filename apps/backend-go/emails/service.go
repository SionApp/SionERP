package emails

import (
	"fmt"
	"html/template"
	"log"
	"strings"

	"github.com/resendlabs/resend-go"
)

type EmailService struct {
	client      *resend.Client
	fromEmail   string
	frontendURL string
}

type InvitationEmailData struct {
	FirstName string
	LastName  string
	Email     string
	Role      string
	MagicLink string
	ExpiresIn string
}

func NewEmailService(apiKey, fromEmail, frontendURL string) *EmailService {
	return &EmailService{
		client:      resend.NewClient(apiKey),
		fromEmail:   fromEmail,
		frontendURL: frontendURL,
	}
}

// SendInvitationEmail envía el email de invitación con magic link
func (s *EmailService) SendInvitationEmail(data InvitationEmailData) error {
	// Generar el link de invitación
	magicLink := fmt.Sprintf("%s/?token=%s", s.frontendURL, data.MagicLink)

	// Template del email en HTML
	htmlTemplate := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ Iglesia Sion</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Gestión Eclesiástica</p>
    </div>
    
    <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">¡Te han invitado a SionERP!</h2>
        
        <p>Hola <strong>{{.FirstName}} {{.LastName}}</strong>,</p>
        
        <p>Has sido invitado para unirte a <strong>SionERP</strong> con el rol de <strong>{{.Role}}</strong>.</p>
        
        <p>Para aceptar tu invitación y crear tu cuenta, haz clic en el siguiente botón:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{.MagicLink}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Aceptar Invitación →
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            <strong>Nota:</strong> Este enlace expira en {{.ExpiresIn}}.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            Si no esperabas esta invitación, puedes ignorar este email.<br>
            © 2024 Iglesia Sion - SionERP
        </p>
    </div>
</body>
</html>
`

	// Parsear el template
	tmpl, err := template.New("invitation").Parse(htmlTemplate)
	if err != nil {
		return fmt.Errorf("error parsing template: %w", err)
	}

	// Preparar datos para el template
	templateData := struct {
		FirstName  string
		LastName   string
		Email      string
		Role       string
		MagicLink  string
		ExpiresIn  string
	}{
		FirstName: data.FirstName,
		LastName:  data.LastName,
		Email:     data.Email,
		Role:      data.Role,
		MagicLink: magicLink,
		ExpiresIn: data.ExpiresIn,
	}

	// Renderizar el HTML
	var htmlBody strings.Builder
	if err := tmpl.Execute(&htmlBody, templateData); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	// Enviar el email usando el servicio Emails
	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{data.Email},
		Subject: "🏛️ Invitación a SionERP - Iglesia Sion",
		Html:    htmlBody.String(),
	}

	result, err := s.client.Emails.Send(params)
	if err != nil {
		log.Printf("Error sending email to %s: %v", data.Email, err)
		return fmt.Errorf("error sending email: %w", err)
	}

	log.Printf("Email sent successfully to %s, ID: %s", data.Email, result.Id)
	return nil
}

// SendInvitationEmailSimple versión simple que solo usa el magic link sin procesar template
// Útil cuando no tienes API key configurada y quieres ver el link en logs
func (s *EmailService) SendInvitationEmailSimple(data InvitationEmailData) (string, error) {
	// Generar el link completo
	magicLink := fmt.Sprintf("%s/?token=%s", s.frontendURL, data.MagicLink)
	return magicLink, nil
}