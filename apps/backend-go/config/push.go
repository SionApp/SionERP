package config

import "os"

// PushConfig — llaves VAPID para Web Push (issue #24). Se generan una sola vez
// (ver scripts o `webpush.GenerateVAPIDKeys`) y viven en variables de entorno.
// La pública también se expone al frontend vía GET /push/vapid-public-key para
// que el navegador arme la suscripción con applicationServerKey.
type PushConfig struct {
	PublicKey  string
	PrivateKey string
	// Subject: mailto: o https:// de contacto, requerido por el protocolo VAPID.
	Subject string
}

func GetPushConfig() *PushConfig {
	subject := os.Getenv("VAPID_SUBJECT")
	if subject == "" {
		subject = "mailto:soporte@sionerp.local"
	}
	return &PushConfig{
		PublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		PrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		Subject:    subject,
	}
}

// IsPushEnabled verifica si las llaves VAPID están configuradas.
func (p *PushConfig) IsPushEnabled() bool {
	return p.PublicKey != "" && p.PrivateKey != ""
}
