-- =============================================================================
-- Migration: 20260827000005_report_schedules.sql
-- Issue #67: programación automática de reportes (users/growth/demographics/
-- activities) con frecuencia, título personalizable y destinatarios. El envío
-- reutiliza notification_queue (issue #52) — no genera CSV/PDF por email, solo
-- avisa que el reporte está listo para verse en /reportes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          uuid        NOT NULL REFERENCES public.churches(id),
  report_type        text        NOT NULL CHECK (report_type IN ('users','growth','demographics','activities')),
  format             text        NOT NULL DEFAULT 'pdf' CHECK (format IN ('csv','pdf')),
  title              text        NOT NULL,
  frequency          text        NOT NULL CHECK (frequency IN ('weekly','monthly')),
  recipient_user_ids uuid[]      NOT NULL DEFAULT '{}',
  active             boolean     NOT NULL DEFAULT true,
  next_run_at        timestamptz NOT NULL DEFAULT now(),
  created_by         uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_due
  ON public.report_schedules (next_run_at)
  WHERE active;

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.report_schedules;
  CREATE POLICY tenant_isolation ON public.report_schedules
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO jetro_app;
