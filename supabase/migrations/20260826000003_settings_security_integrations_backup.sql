-- =============================================================================
-- Migration: 20260826000003_settings_security_integrations_backup.sql
-- Issue #61: de las 6 categorías de Settings prometidas, solo general/iglesia/
-- notificaciones tenían tabla + endpoint. Seguridad, integraciones y respaldos
-- no existían ni como tabla. Una fila por iglesia (singleton por tenant, mismo
-- espíritu que notification_config/system_settings pero sin el bagaje del
-- constraint de singleton global histórico — se arranca ya multi-tenant).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_settings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                 uuid        NOT NULL UNIQUE REFERENCES public.churches(id),
  min_password_length       int         NOT NULL DEFAULT 8,
  require_uppercase         boolean     NOT NULL DEFAULT false,
  require_number            boolean     NOT NULL DEFAULT false,
  require_special_char      boolean     NOT NULL DEFAULT false,
  password_expiry_days      int,                              -- NULL = nunca expira
  max_login_attempts        int         NOT NULL DEFAULT 5,
  lockout_duration_minutes  int         NOT NULL DEFAULT 15,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_settings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                 uuid        NOT NULL UNIQUE REFERENCES public.churches(id),
  whatsapp_enabled          boolean     NOT NULL DEFAULT false,
  whatsapp_phone_number_id  text,
  whatsapp_api_key          text,
  payment_provider          text        NOT NULL DEFAULT 'none'
                            CHECK (payment_provider IN ('none', 'stripe', 'mercadopago')),
  payment_api_key           text,
  email_provider            text        NOT NULL DEFAULT 'none'
                            CHECK (email_provider IN ('none', 'resend', 'sendgrid')),
  email_api_key             text,
  crm_webhook_url           text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_settings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                 uuid        NOT NULL UNIQUE REFERENCES public.churches(id),
  retention_days            int         NOT NULL DEFAULT 30,
  notify_email              text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_security_settings_updated_at ON public.security_settings;
CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_integration_settings_updated_at ON public.integration_settings;
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_backup_settings_updated_at ON public.backup_settings;
CREATE TRIGGER update_backup_settings_updated_at
  BEFORE UPDATE ON public.backup_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.security_settings;
  CREATE POLICY tenant_isolation ON public.security_settings
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.integration_settings;
  CREATE POLICY tenant_isolation ON public.integration_settings
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_settings FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.backup_settings;
  CREATE POLICY tenant_isolation ON public.backup_settings
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.security_settings TO jetro_app;
GRANT SELECT, INSERT, UPDATE ON public.integration_settings TO jetro_app;
GRANT SELECT, INSERT, UPDATE ON public.backup_settings TO jetro_app;
