-- =============================================================================
-- Migration: 20260626000001_fix_alert_type_check.sql
-- Fix discipleship_alerts.alert_type CHECK constraint to include all live
-- values used in code PLUS new compliance types: missed_report,
-- escalated_non_compliance.
--
-- Audited alert_type strings from code:
--   scheduler.go:134          no_reports
--   discipleship_alerts.go    no_reports, low_attendance, spiritual_decline,
--                             no_growth, consistency_milestone,
--                             evangelism_champion, solid_group
--   Legacy generic (original) critical, warning, info, success
--   New (PR1+PR2)             missed_report, escalated_non_compliance
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.discipleship_alerts
    DROP CONSTRAINT IF EXISTS discipleship_alerts_alert_type_check;

  ALTER TABLE public.discipleship_alerts
    ADD CONSTRAINT discipleship_alerts_alert_type_check
    CHECK (alert_type IN (
      'critical', 'warning', 'info', 'success',
      'no_reports', 'low_attendance', 'spiritual_decline', 'no_growth',
      'consistency_milestone', 'evangelism_champion', 'solid_group',
      'missed_report', 'escalated_non_compliance'
    ));
END $$;
