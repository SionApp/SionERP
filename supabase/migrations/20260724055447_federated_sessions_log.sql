-- =============================================================================
-- Migration: 20260724000001_federated_sessions_log.sql
-- Acceso federado (I2 fase 1, modo read) — auditoría local de cada canje de
-- token de BonDev + anti-replay. Ver SDD completo en Engram, proyecto
-- "sionerp", topic sdd/federated-access-verify/{proposal,spec,design,tasks}.
--
-- church_id NOT NULL + RLS tenant_isolation: mismo patrón que las 33 tablas
-- tenant de phase4_rls_cutover.sql — esta tabla no es un caso especial. El
-- handler de redeem (público, sin sesión previa) setea
-- app.current_church_id manualmente antes del INSERT, con el church_id ya
-- validado del token (no hay TenantTx corriendo todavía en ese punto, no
-- hay sesión de la que "heredarlo").
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.federated_sessions_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    jti           text NOT NULL UNIQUE,   -- anti-replay: un token de acceso federado es de un solo uso
    operator_id   text NOT NULL,          -- claims.Sub — vive en BonDev, NO es FK (sistema externo)
    operator_name text NOT NULL,
    church_id     uuid NOT NULL REFERENCES public.churches(id),
    mode          text NOT NULL,          -- "read" en v1; "edit" queda para I2 fase 2
    redeemed_at   timestamptz NOT NULL DEFAULT now(),
    origin_ip     text,
    expires_at    timestamptz NOT NULL    -- copiado del `exp` del token, para poder limpiar filas viejas
);

CREATE INDEX IF NOT EXISTS idx_federated_sessions_log_church
    ON public.federated_sessions_log (church_id);

CREATE INDEX IF NOT EXISTS idx_federated_sessions_log_expires
    ON public.federated_sessions_log (expires_at);

ALTER TABLE public.federated_sessions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federated_sessions_log FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.federated_sessions_log;
  CREATE POLICY tenant_isolation ON public.federated_sessions_log
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
