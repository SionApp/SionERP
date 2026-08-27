-- =============================================================================
-- Migration: 20260827000003_fix_alert_type_check_constraint.sql
-- Bug real encontrado verificando #34 en navegador: discipleship_alerts tiene
-- un CHECK constraint con una lista CERRADA de alert_type válidos. Dos tipos
-- agregados en handlers Go en sesiones anteriores nunca pasaron ese check:
--   - 'insufficient_discipleship' (issue #43, tanda "Ahora") — roto desde que
--     se agregó, el INSERT fallaba en silencio (_, _ = q.Exec(...) ignora el
--     error) y GenerateAutomaticAlerts nunca creaba la alerta.
--   - 'report_reminder' (issue #34, esta tanda) — mismo problema, detectado
--     antes de llegar a producción gracias a la verificación en navegador.
-- =============================================================================

ALTER TABLE public.discipleship_alerts
  DROP CONSTRAINT IF EXISTS discipleship_alerts_alert_type_check;

ALTER TABLE public.discipleship_alerts
  ADD CONSTRAINT discipleship_alerts_alert_type_check
  CHECK (alert_type = ANY (ARRAY[
    'critical', 'warning', 'info', 'success',
    'no_reports', 'low_attendance', 'spiritual_decline', 'no_growth',
    'consistency_milestone', 'evangelism_champion', 'solid_group',
    'missed_report', 'escalated_non_compliance',
    'insufficient_discipleship', 'report_reminder'
  ]::text[]));
