-- Migration: Add audit triggers to critical business tables
-- Date: 2026-04-21
-- Description: Agrega triggers de auditoría a las tablas más críticas del negocio de discipulado

-- ========================================
-- 1. discipleship_alerts - Crítico para tracking de alertas
-- ========================================

DROP TRIGGER IF EXISTS audit_discipleship_alerts ON public.discipleship_alerts;

CREATE TRIGGER audit_discipleship_alerts
    AFTER INSERT OR DELETE OR UPDATE ON public.discipleship_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- 2. discipleship_goals - Crítico para tracking de metas
-- ========================================

DROP TRIGGER IF EXISTS audit_discipleship_goals ON public.discipleship_goals;

CREATE TRIGGER audit_discipleship_goals
    AFTER INSERT OR DELETE OR UPDATE ON public.discipleship_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- 3. cell_multiplication_tracking - Crítico para seguimiento de multiplicaciones
-- ========================================

DROP TRIGGER IF EXISTS audit_cell_multiplication_tracking ON public.cell_multiplication_tracking;

CREATE TRIGGER audit_cell_multiplication_tracking
    AFTER INSERT OR DELETE OR UPDATE ON public.cell_multiplication_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- 4. discipleship_reports - Crítico para reportes de discipulado
-- ========================================

DROP TRIGGER IF EXISTS audit_discipleship_reports ON public.discipleship_reports;

CREATE TRIGGER audit_discipleship_reports
    AFTER INSERT OR DELETE OR UPDATE ON public.discipleship_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- 5. user_profiles - Perfiles de usuario
-- ========================================

DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;

CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR DELETE OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_user_changes();

-- ========================================
-- Verificar que los triggers fueron creados
-- ========================================

SELECT
    trigger_name,
    event_object_table AS table_name,
    action_timing AS timing,
    event_manipulation AS event
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_%'
ORDER BY event_object_table;
