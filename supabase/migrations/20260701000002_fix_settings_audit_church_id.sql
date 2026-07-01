-- =============================================================================
-- Migration: 20260701000002_fix_settings_audit_church_id.sql
-- The settings audit trigger inserted into settings_audit_log WITHOUT
-- church_id, which became NOT NULL in the multi-tenancy migration.
-- Result: EVERY update to system_settings / church_info / notification_config
-- failed with a not-null violation — all "Guardar Cambios" buttons in the
-- Configuración page were broken.
--
-- Fourth instance of this pattern (notifications, user_preferences,
-- handle_new_user, now the audit log). All three audited tables carry
-- church_id, so the trigger takes it from the affected row.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_church uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_church := OLD.church_id;
        INSERT INTO public.settings_audit_log (church_id, table_name, action, changed_by, old_values, new_values)
        VALUES (v_church, TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_church := NEW.church_id;
        INSERT INTO public.settings_audit_log (church_id, table_name, action, changed_by, old_values, new_values)
        VALUES (v_church, TG_TABLE_NAME, TG_OP, auth.uid(), NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSE
        v_church := NEW.church_id;
        INSERT INTO public.settings_audit_log (church_id, table_name, action, changed_by, old_values, new_values)
        VALUES (v_church, TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    END IF;
END;
$function$;
