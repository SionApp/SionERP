-- =============================================================================
-- Migration: 20260626000002_fix_report_status_check.sql
-- Fix discipleship_reports.status CHECK constraint to include
-- 'revision_required', which is used in discipleship_reports.go:441
-- (RejectReport handler) but was missing from the original constraint.
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.discipleship_reports
    DROP CONSTRAINT IF EXISTS discipleship_reports_status_check;

  ALTER TABLE public.discipleship_reports
    ADD CONSTRAINT discipleship_reports_status_check
    CHECK (status IN (
      'draft', 'submitted', 'approved', 'needs_attention', 'revision_required'
    ));
END $$;
