-- =============================================================================
-- Migration: 20260701000001_registration_gate.sql
-- Enforce system_settings.allow_registrations for PUBLIC self-signups.
--
-- The public /register page calls supabase.auth.signUp() directly (it never
-- touches the Go API), so the only real gate is the handle_new_user trigger.
--
-- Distinguisher: admin/backend-created users always carry
-- raw_app_meta_data->>'church_id' (app_metadata is only settable server-side
-- via the service role). Public self-signups can only set user_metadata.
-- => Gate applies ONLY when app_metadata.church_id is absent.
--
-- IMPORTANT: the RAISE must live OUTSIDE the catch-all exception block that
-- protects the users INSERT — otherwise it would be swallowed and the auth
-- user would still be created.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_church uuid;
    v_allow  boolean;
BEGIN
    v_church := COALESCE(
        (NEW.raw_app_meta_data->>'church_id')::uuid,
        (NEW.raw_user_meta_data->>'church_id')::uuid,
        '00000000-0000-0000-0000-00000000515e'
    );

    -- Gate de auto-registro: solo para signups públicos (sin app_metadata.church_id).
    -- Usuarios creados por el backend/admin pasan siempre.
    IF NEW.raw_app_meta_data->>'church_id' IS NULL THEN
        SELECT allow_registrations INTO v_allow
        FROM public.system_settings WHERE church_id = v_church LIMIT 1;
        IF v_allow IS FALSE THEN
            RAISE EXCEPTION 'registrations_disabled';
        END IF;
    END IF;

    BEGIN
        INSERT INTO public.users (
            id, email, id_number, first_name, last_name, phone, address,
            role, church_id, is_active, created_at, updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.email, ''),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'id_number', ''), 'TEMP-' || SUBSTRING(NEW.id::text, 1, 8)),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Usuario'),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'address', ''), ''),
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'server')::public.user_role,
            v_church,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email      = EXCLUDED.email,
            id_number  = COALESCE(NULLIF(EXCLUDED.id_number, ''), public.users.id_number),
            first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
            last_name  = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.users.last_name),
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$function$;
