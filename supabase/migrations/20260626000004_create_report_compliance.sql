-- =============================================================================
-- Migration: 20260626000004_create_report_compliance.sql
-- Create the report_compliance table for per-user per-ISO-week compliance
-- tracking. Scheduler (PR2) upserts rows here each Saturday at 23:00.
-- Request-path endpoints read and update via TenantTx (RLS enforced).
-- Scheduler uses the superuser postgres pool and carries explicit church_id
-- on every write, so RLS is a safety net, not the primary gate for it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.report_compliance (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         uuid        NOT NULL REFERENCES public.churches(id),
  user_id           uuid        NOT NULL,
  iso_week          text        NOT NULL,             -- 'YYYY-Www' — ISO-8601
  period_start      date        NOT NULL,             -- Monday of the ISO week
  period_end        date        NOT NULL,             -- Saturday of the ISO week
  due_date          date        NOT NULL,             -- Saturday (== period_end); explicit for future grace logic
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'on_time', 'late', 'missed')),
  report_id         uuid,                             -- nullable; set when a report is submitted
  missed_count      int         NOT NULL DEFAULT 0,   -- recomputed = COUNT(status='missed') for this user
  escalation_sent   boolean     NOT NULL DEFAULT false,
  notified_failer   boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (church_id, user_id, iso_week)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Fast per-user compliance history lookup
CREATE INDEX IF NOT EXISTS idx_report_compliance_user
  ON public.report_compliance (church_id, user_id);

-- Fast per-week sweep query (scan all users in a church for a given week)
CREATE INDEX IF NOT EXISTS idx_report_compliance_week
  ON public.report_compliance (church_id, iso_week);

-- Partial index: only missed rows — used by COUNT(status='missed') recompute
-- and the supervisor "who failed" panel
CREATE INDEX IF NOT EXISTS idx_report_compliance_missed
  ON public.report_compliance (church_id, user_id)
  WHERE status = 'missed';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.report_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_compliance FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.report_compliance;
  CREATE POLICY tenant_isolation ON public.report_compliance
    USING (
      church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
      church_id = current_setting('app.current_church_id', true)::uuid
    );
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- jetro_app is the application role used by request-path handlers.
-- The scheduler connects as postgres (superuser, BYPASSRLS) and does not
-- need a separate grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_compliance TO jetro_app;
