-- =============================================================================
-- Migration: 20260626000003_alert_addressed_to.sql
-- Add addressed_to column to discipleship_alerts so compliance alerts can
-- be addressed to a specific user (the failer or the supervisor to escalate to).
--
-- No FK to users(id) — consistent with existing related_user_id which also
-- has no FK. This keeps the schema lightweight and avoids cascade issues.
-- =============================================================================

ALTER TABLE public.discipleship_alerts
  ADD COLUMN IF NOT EXISTS addressed_to uuid;

CREATE INDEX IF NOT EXISTS idx_disc_alerts_addressed_to
  ON public.discipleship_alerts (church_id, addressed_to)
  WHERE addressed_to IS NOT NULL;
