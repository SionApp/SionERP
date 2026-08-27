-- =============================================================================
-- Migration: 20260827000006_federated_edit_mode.sql
-- Acceso federado (I2 fase 2, modo edit) — el operador de BonDev actúa con
-- un rol real de SionERP en vez de sólo lectura. Reason/TicketID quedan
-- registrados como trazabilidad obligatoria de por qué alguien externo
-- editó datos de un cliente. Ver handlers/federated.go Redeem.
-- =============================================================================

ALTER TABLE public.federated_sessions_log
  ADD COLUMN IF NOT EXISTS role       text,
  ADD COLUMN IF NOT EXISTS reason     text,
  ADD COLUMN IF NOT EXISTS ticket_id  text;

ALTER TABLE public.federated_sessions_log
  DROP CONSTRAINT IF EXISTS federated_edit_requires_role_and_reason;
ALTER TABLE public.federated_sessions_log
  ADD CONSTRAINT federated_edit_requires_role_and_reason
  CHECK (mode <> 'edit' OR (role IS NOT NULL AND reason IS NOT NULL AND ticket_id IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Fila "shadow" en users para el operador de BonDev en modo edit. Cualquier
-- created_by/user_id que un handler persista como FK a users(id) necesita un
-- UUID real de esta tabla — el "federated:<operator_id>" que usa modo read
-- no sirve para escribir. Se upsertea UNA fila por (church_id,
-- bondev_operator_id) — mismo operador en la misma iglesia reutiliza siempre
-- el mismo UUID entre sesiones, así el rastro de auditoría es consistente.
-- is_support_operator la excluye de listados/reportes normales de miembros.
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_support_operator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bondev_operator_id  text;

CREATE UNIQUE INDEX IF NOT EXISTS users_church_bondev_operator_key
  ON public.users (church_id, bondev_operator_id)
  WHERE bondev_operator_id IS NOT NULL;
