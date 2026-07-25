-- =============================================================================
-- Migration: 20260725000001_provider_api_foundations.sql
-- I1 — SionERP Provider API (endpoints /provider/* que consume BonDev).
-- Ver SDD completo en Engram, proyecto "sionerp",
-- topic sdd/provider-api/{proposal,spec,design,tasks}.
-- =============================================================================

-- --- churches: columnas que el contrato tenantWire/tenantHealthWire de BonDev
-- necesita y que Phase 0 nunca agregó (solo id/name/slug).
ALTER TABLE public.churches
    ADD COLUMN IF NOT EXISTS plan   text,
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS region text;

-- --- users.last_seen_at: base para calcular active_users_30d en GetTenantHealth.
-- Se actualiza (throttleado a 1h) desde SupabaseAuth() en cada request autenticado.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_church_last_seen
    ON public.users (church_id, last_seen_at);

-- ponytail: no hace falta una tabla de invitaciones propia — CreateTenant
-- reusa config.NewSupabaseClient().GenerateMagicLink(), el mismo mecanismo
-- que ya usa handlers/invite.go para invitar usuarios sin password. El
-- admin creado por CreateTenant recibe un action_link de un solo uso
-- (emitido por Supabase Auth, no por nosotros) — cero schema nuevo.
