-- =============================================================================
-- Migration: 20260827000002_notification_queue.sql
-- Issue #52: cola de notificaciones por email. Se apoya en el EmailService
-- (Resend) que ya existe y funciona para invitaciones — no en el canal push,
-- que sigue sin construir (issue #24). Arranca con UN solo caso de uso real:
-- avisar por email cuando se genera la alerta de escalamiento de
-- incumplimiento (discipleship_alerts, alert_type='escalated_non_compliance'),
-- que hoy solo vive in-app y puede pasar desapercibida.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid        NOT NULL REFERENCES public.churches(id),
  user_id     uuid        NOT NULL REFERENCES public.users(id),
  channel     text        NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'push')),
  subject     text        NOT NULL,
  body        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON public.notification_queue (status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_church
  ON public.notification_queue (church_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.notification_queue;
  CREATE POLICY tenant_isolation ON public.notification_queue
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE ON public.notification_queue TO jetro_app;
