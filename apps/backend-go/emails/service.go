package emails

import (
	"fmt"
	"html/template"
	"log"
	"strconv"
	"strings"

	"github.com/resendlabs/resend-go"
)

type EmailService struct {
	client      *resend.Client
	fromEmail   string
	frontendURL string
}

func NewEmailService(apiKey, fromEmail, frontendURL string) *EmailService {
	return &EmailService{
		client:      resend.NewClient(apiKey),
		fromEmail:   fromEmail,
		frontendURL: frontendURL,
	}
}

// ── Marca de iglesia ─────────────────────────────────────────────────────────
// Todo correo se renderiza con el nombre/logo/color real de la iglesia que lo
// manda (church_info) en vez de un template fijo — antes decía "Iglesia Sion"
// sin importar quién invitaba. Ver artifact de diseño (propuesta aprobada).

// ChurchBranding son los datos de marca que cada handler que envía un correo
// debe resolver desde church_info antes de llamar a este paquete.
type ChurchBranding struct {
	Name         string
	LogoURL      string // vacío → se usa el monograma (inicial del nombre)
	PrimaryColor string // hex, ej "#1e40af". Vacío → cae al default.
}

const defaultPrimaryColor = "#1e40af"

// brandVars resuelve los campos derivados que los templates necesitan: color
// final (con default), color de texto legible sobre ese color (mismo cálculo
// de luminosidad que useBrandColors.ts en el frontend, para que el correo y
// el dashboard elijan el mismo blanco/tinta sobre el mismo color de marca), y
// el monograma cuando no hay logo.
type brandVars struct {
	Name      string
	LogoURL   string
	Monogram  string
	Primary   string
	PrimaryFg string
}

func resolveBrand(b ChurchBranding) brandVars {
	name := strings.TrimSpace(b.Name)
	if name == "" {
		name = "Tu iglesia"
	}
	primary := strings.TrimSpace(b.PrimaryColor)
	if !isHexColor(primary) {
		primary = defaultPrimaryColor
	}
	monogram := "?"
	for _, r := range strings.ToUpper(name) {
		monogram = string(r)
		break
	}
	return brandVars{
		Name:      name,
		LogoURL:   strings.TrimSpace(b.LogoURL),
		Monogram:  monogram,
		Primary:   primary,
		PrimaryFg: foregroundFor(primary),
	}
}

func isHexColor(s string) bool {
	if len(s) != 7 || s[0] != '#' {
		return false
	}
	_, err := strconv.ParseUint(s[1:], 16, 32)
	return err == nil
}

// foregroundFor decide texto blanco o tinta oscura sobre un color de fondo,
// igual que fgFor() en src/hooks/useBrandColors.ts: por encima de 55% de
// luminosidad (HSL) el fondo es "claro" y va tinta oscura, si no, blanco.
func foregroundFor(hex string) string {
	h := strings.TrimPrefix(hex, "#")
	r, _ := strconv.ParseInt(h[0:2], 16, 32)
	g, _ := strconv.ParseInt(h[2:4], 16, 32)
	b, _ := strconv.ParseInt(h[4:6], 16, 32)
	maxC := max(r, g, b)
	minC := min(r, g, b)
	lightness := float64(maxC+minC) / 2 / 255 * 100
	if lightness > 55 {
		return "#1a1f2e"
	}
	return "#ffffff"
}

// escapeAndBreak escapa HTML y convierte saltos de línea en <br> — el mismo
// tratamiento que ya se le daba al texto plano, ahora reusado dentro del
// shell con marca. El texto de origen (mensaje de correo masivo, cuerpo de
// aviso) es contenido de usuario/sistema, nunca HTML de confianza.
func escapeAndBreak(s string) template.HTML {
	escaped := template.HTMLEscapeString(s)
	return template.HTML(strings.ReplaceAll(escaped, "\n", "<br>"))
}

// ── Shell HTML compartido ────────────────────────────────────────────────────
// Sin degradés ni imágenes externas más que el logo opcional: así se ve igual
// en Gmail, Outlook y Apple Mail. Cada correo trae su propio
// prefers-color-scheme — es independiente del tema del dashboard.

const emailShellCSS = `
  body{margin:0;padding:32px 16px;background:#eceef5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
  .card{max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,24,40,.06);}
  .band{background:{{.Brand.Primary}};padding:22px 32px;}
  .mark{display:flex;align-items:center;gap:10px;}
  .mark-glyph{width:30px;height:30px;border-radius:9px;overflow:hidden;background:rgba(255,255,255,.16);color:{{.Brand.PrimaryFg}};font-weight:700;font-size:14px;line-height:30px;text-align:center;font-family:Georgia,serif;}
  .mark-glyph img{width:100%;height:100%;object-fit:cover;display:block;}
  .mark-name{color:{{.Brand.PrimaryFg}};font-size:14px;font-weight:600;}
  .body{padding:32px 32px 8px;color:#1a1f2e;}
  h1{font-size:19px;font-weight:600;margin:0 0 14px;line-height:1.4;}
  p{font-size:14.5px;line-height:1.65;color:#3a4152;margin:0 0 22px;}
  .cta{display:inline-block;background:{{.Brand.Primary}};color:{{.Brand.PrimaryFg}} !important;text-decoration:none;font-size:14.5px;font-weight:600;padding:13px 26px;border-radius:9px;}
  .note{font-size:12.5px;color:#6a7285;border-top:1px solid #edeff5;padding:18px 32px 26px;margin:26px 0 0;}
  .tag{display:inline-flex;align-items:center;gap:6px;background:#e6f4ed;color:#1a7f4f;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:5px 11px;border-radius:999px;margin-bottom:14px;}
  .notice{border-left:4px solid #b3261e;background:#fbe9e8;padding:20px 28px;margin:0 0 24px;border-radius:0 10px 10px 0;}
  .notice h1{font-size:16px;margin:0 0 6px;color:#8c1f19;}
  .notice p{font-size:13.5px;color:#7a2b26;margin:0;}
  @media (prefers-color-scheme: dark){
    body{background:#0f1117;} .card{background:#1c1f2b;} .body{color:#eceef5;}
    p{color:#a8afc0;} .note{color:#828aa0;border-top-color:#2a2e3c;}
    .tag{background:#1c2e26;color:#7fd8a6;}
    .notice{background:#3a2325;} .notice h1{color:#f2b8b5;} .notice p{color:#e3a9a6;}
  }
`

const brandMarkTemplate = `
      <div class='mark'>
        <div class='mark-glyph'>{{if .Brand.LogoURL}}<img src="{{.Brand.LogoURL}}" alt="{{.Brand.Name}}">{{else}}{{.Brand.Monogram}}{{end}}</div>
        <div class='mark-name'>{{.Brand.Name}}</div>
      </div>`

// ── 1) Invitación ────────────────────────────────────────────────────────────

type InvitationEmailData struct {
	FirstName string
	LastName  string
	Email     string
	Role      string
	MagicLink string
	ExpiresIn string
	Church    ChurchBranding
}

var invitationTemplate = template.Must(template.New("invitation").Parse(`
<!DOCTYPE html><html><head><meta charset='utf-8'>
<meta name='color-scheme' content='light dark'>
<style>` + emailShellCSS + `
  .role-chip{display:inline-block;background:#e7ecfb;color:{{.Brand.Primary}};font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;}
  @media (prefers-color-scheme: dark){ .role-chip{background:#202a45;color:#8fadff;} }
</style></head>
<body>
  <div class='card'>
    <div class='band'>` + brandMarkTemplate + `
    </div>
    <div class='body'>
      <h1>{{.FirstName}}, te invitaron a sumarte al equipo</h1>
      <p>Vas a entrar con el rol de <span class='role-chip'>{{.Role}}</span>. Con tu cuenta vas a poder gestionar {{.Brand.Name}} en JETRO, según lo que tu rol permita.</p>
      <div style="margin:26px 0 30px;">
        <a class='cta' href="{{.MagicLink}}">Aceptar invitación →</a>
      </div>
      <p style='font-size:13px;color:#8891a3;'>Este enlace vence en {{.ExpiresIn}}.</p>
    </div>
    <p class='note'>Si no esperabas esta invitación, podés ignorar este correo con tranquilidad.<br>Enviado por {{.Brand.Name}} vía JETRO.</p>
  </div>
</body></html>
`))

// SendInvitationEmail envía el email de invitación con magic link, con la
// marca real de la iglesia que invita (nombre, logo, color).
func (s *EmailService) SendInvitationEmail(data InvitationEmailData) error {
	magicLink := fmt.Sprintf("%s/?token=%s", s.frontendURL, data.MagicLink)

	view := struct {
		InvitationEmailData
		Brand     brandVars
		MagicLink string
	}{
		InvitationEmailData: data,
		Brand:               resolveBrand(data.Church),
		MagicLink:           magicLink,
	}

	var htmlBody strings.Builder
	if err := invitationTemplate.Execute(&htmlBody, view); err != nil {
		return fmt.Errorf("error executing invitation template: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{data.Email},
		Subject: fmt.Sprintf("Te invitaron a unirte a %s — JETRO", view.Brand.Name),
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

// SendInvitationEmailSimple versión simple que solo usa el magic link sin
// procesar template — útil cuando no hay API key configurada.
func (s *EmailService) SendInvitationEmailSimple(data InvitationEmailData) (string, error) {
	magicLink := fmt.Sprintf("%s/?token=%s", s.frontendURL, data.MagicLink)
	return magicLink, nil
}

// ── 2) Correos de la cola (reporte listo / escalamiento / correo masivo) ────
// Los tres comparten UN solo template: banda de marca + contenido según
// `Tone` + botón opcional. Cada `tone` corresponde a una fila real del
// handoff de diseño: 'success' = reporte listo, 'warning' = escalamiento,
// 'info' = correo masivo (plano, sin tag ni caja).

type QueuedEmailData struct {
	Church      ChurchBranding
	Subject     string // se usa como título (H1) del correo
	Body        string // texto plano; se escapa y convierte \n en <br>
	Tone        string // "info" | "success" | "warning"
	ActionURL   string // vacío = sin botón
	ActionLabel string
}

var queuedEmailTemplate = template.Must(template.New("queued").Parse(`
<!DOCTYPE html><html><head><meta charset='utf-8'>
<meta name='color-scheme' content='light dark'>
<style>` + emailShellCSS + `</style></head>
<body>
  <div class='card'>
    <div class='band'>` + brandMarkTemplate + `
    </div>
    <div class='body'>
      {{if eq .Tone "success"}}
        <span class='tag'>✓ Listo</span>
        <h1>{{.Subject}}</h1>
        <p>{{.BodyHTML}}</p>
      {{else if eq .Tone "warning"}}
        <div class='notice'>
          <h1>{{.Subject}}</h1>
          <p>{{.BodyHTML}}</p>
        </div>
      {{else}}
        <h1>{{.Subject}}</h1>
        <p>{{.BodyHTML}}</p>
      {{end}}
      {{if .ActionURL}}
      <div style="margin:0 0 22px;">
        <a class='cta' href="{{.ActionURL}}">{{.ActionLabel}} →</a>
      </div>
      {{end}}
    </div>
    <p class='note'>Enviado por {{.Brand.Name}} vía JETRO.</p>
  </div>
</body></html>
`))

// SendQueuedNotification renderiza y manda un correo de notification_queue
// con la marca real de la iglesia. Reemplaza al viejo SendPlainNotification
// (texto envuelto en un <p> sin marca) — issue de diseño: propuesta de
// templates de correo, aprobada por el usuario.
func (s *EmailService) SendQueuedNotification(to string, data QueuedEmailData) error {
	tone := data.Tone
	if tone != "success" && tone != "warning" {
		tone = "info"
	}
	actionLabel := data.ActionLabel
	if data.ActionURL != "" && actionLabel == "" {
		actionLabel = "Ver más"
	}

	view := struct {
		Brand       brandVars
		Subject     string
		BodyHTML    template.HTML
		Tone        string
		ActionURL   string
		ActionLabel string
	}{
		Brand:       resolveBrand(data.Church),
		Subject:     data.Subject,
		BodyHTML:    escapeAndBreak(data.Body),
		Tone:        tone,
		ActionURL:   data.ActionURL,
		ActionLabel: actionLabel,
	}

	var htmlBody strings.Builder
	if err := queuedEmailTemplate.Execute(&htmlBody, view); err != nil {
		return fmt.Errorf("error executing queued email template: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: data.Subject,
		Html:    htmlBody.String(),
	}

	result, err := s.client.Emails.Send(params)
	if err != nil {
		log.Printf("Error sending notification email to %s: %v", to, err)
		return fmt.Errorf("error sending notification email: %w", err)
	}
	log.Printf("Notification email sent to %s, ID: %s", to, result.Id)
	return nil
}
