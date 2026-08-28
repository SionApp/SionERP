-- =============================================================================
-- Migration: 20260828000001_push_subscriptions.sql
-- Issue #24: notificaciones push (Web Push). Cierra el canal 'push' que la cola
-- de notificaciones (notification_queue, issue #52) ya anticipa en su CHECK
-- (channel IN ('email','push')) pero que hasta ahora nadie consumía.
--
-- Una fila por cada suscripción de navegador (endpoint único que devuelve el
-- PushManager). Un mismo usuario puede tener varias (teléfono, notebook, etc.)
-- — por eso NO se colapsa a una por usuario como active_sessions.
--
-- El backend escribe/lee esta tabla por el pool global (superuser), scopeando
-- SIEMPRE por church_id/user_id explícito en el WHERE — igual que auth.go. La
-- policy tenant_isolation es defensa en profundidad para cuando TenantTx quede
-- activo (Phase 2). El cliente NUNCA toca esta tabla directo: se suscribe vía
-- POST /api/v1/push/subscribe.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid        NOT NULL REFERENCES public.churches(id),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.push_subscriptions;
  CREATE POLICY tenant_isolation ON public.push_subscriptions
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO jetro_app;
