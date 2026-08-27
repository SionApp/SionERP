-- =============================================================================
-- Migration: 20260827000001_report_reminder_column.sql
-- Issue #34: recordatorio preventivo. El scheduler de cumplimiento (scheduler.go)
-- ya avisa DESPUÉS de que alguien no reporta (missed_report, sábado 23:00).
-- Esta columna deja registrado si ya se mandó el aviso PREVENTIVO de esta
-- semana (viernes), para no duplicarlo — mismo criterio que notified_failer.
-- =============================================================================

ALTER TABLE public.report_compliance
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
