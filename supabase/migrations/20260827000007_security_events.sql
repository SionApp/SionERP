-- =============================================================================
-- Migration: 20260827000007_security_events.sql
-- Issue #53: auditoría extendida + eventos críticos de seguridad.
-- audit_logs ya registra cambios de datos (table_name/record_id/old_new
-- values) — le falta contexto de RED (IP, user agent, sesión). security_events
-- es una tabla NUEVA y deliberadamente separada: no es "quién cambió qué
-- fila", es "qué acción sensible pasó" (cambio de rol, suspensión,
-- exportación masiva) — evento de negocio, no diff de columnas.
-- =============================================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE TABLE IF NOT EXISTS public.security_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid        NOT NULL REFERENCES public.churches(id),
  event_type  text        NOT NULL CHECK (event_type IN (
                'role_changed', 'user_suspended', 'user_reactivated', 'user_data_exported'
              )),
  user_id     uuid        REFERENCES public.users(id) ON DELETE SET NULL, -- a quién afecta
  actor_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL, -- quién lo hizo
  ip_address  text,
  user_agent  text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_church
  ON public.security_events (church_id, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.security_events;
  CREATE POLICY tenant_isolation ON public.security_events
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT ON public.security_events TO jetro_app;
