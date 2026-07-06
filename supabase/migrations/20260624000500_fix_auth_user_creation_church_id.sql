-- =============================================================================
-- Migration: 20260624000500_fix_auth_user_creation_church_id.sql
--
-- After Phase 1 + Phase 2a multi-tenancy migrations added church_id NOT NULL
-- to all tenant tables, user creation via auth/admin/users was broken because:
--
--   1. handle_new_user() trigger did not include church_id, phone, or address
--      in its INSERT into public.users.
--   2. create_user_preferences() used ON CONFLICT (user_id) but the unique
--      constraint was changed to (church_id, user_id).
--
-- Fix:
--   a. Set DEFAULT church_id on all tables where it's NOT NULL (so any future
--      code path that omits church_id gets a safe default to the Sion church).
--   b. Update handle_new_user() to include church_id, phone, and address.
--   c. Update create_user_preferences() to include church_id and use
--      the correct composite unique constraint.
--
-- Idempotent: each ALTER is wrapped in a DO block that checks column existence.
-- Safe to apply even if Phase 1–4 have not run yet (no-ops gracefully).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- a. Set DEFAULT church_id on all tables where it's NOT NULL.
--    The canonical Sion church UUID is 00000000-0000-0000-0000-00000000515e.
--    Each block checks column existence first so this migration is safe
--    regardless of whether Phase 1–4 have run yet.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='church_info'        AND column_name='church_id') THEN
    ALTER TABLE public.church_info        ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings'     AND column_name='church_id') THEN
    ALTER TABLE public.system_settings     ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_config' AND column_name='church_id') THEN
    ALTER TABLE public.notification_config ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='modules'             AND column_name='church_id') THEN
    ALTER TABLE public.modules             ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='role_module_access'  AND column_name='church_id') THEN
    ALTER TABLE public.role_module_access  ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users'              AND column_name='church_id') THEN
    ALTER TABLE public.users               ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_invitations'   AND column_name='church_id') THEN
    ALTER TABLE public.user_invitations    ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones'              AND column_name='church_id') THEN
    ALTER TABLE public.zones               ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleship_groups'        AND column_name='church_id') THEN
    ALTER TABLE public.discipleship_groups        ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleship_group_members' AND column_name='church_id') THEN
    ALTER TABLE public.discipleship_group_members ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleship_levels'        AND column_name='church_id') THEN
    ALTER TABLE public.discipleship_levels        ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleship_hierarchy'     AND column_name='church_id') THEN
    ALTER TABLE public.discipleship_hierarchy     ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleship_attendance'    AND column_name='church_id') THEN
    ALTER TABLE public.discipleship_attendance    ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_preferences' AND column_name='church_id') THEN
    ALTER TABLE public.user_preferences ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles'    AND column_name='church_id') THEN
    ALTER TABLE public.user_profiles    ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_permissions' AND column_name='church_id') THEN
    ALTER TABLE public.user_permissions ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- b. Update handle_new_user() to include church_id, phone, and address.
--    This is always safe — CREATE OR REPLACE works regardless of schema state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        id_number,
        first_name,
        last_name,
        phone,
        address,
        role,
        church_id,
        is_active,
        created_at,
        updated_at
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
        COALESCE(
            (NEW.raw_app_meta_data->>'church_id')::uuid,
            (NEW.raw_user_meta_data->>'church_id')::uuid,
            '00000000-0000-0000-0000-00000000515e'
        ),
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
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- c. Update create_user_preferences() to include church_id and use the
--    composite unique constraint (church_id, user_id).
--    Always safe — CREATE OR REPLACE works regardless of schema state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, church_id)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_app_meta_data->>'church_id')::uuid,
      (NEW.raw_user_meta_data->>'church_id')::uuid,
      '00000000-0000-0000-0000-00000000515e'
    )
  )
  ON CONFLICT (church_id, user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'create_user_preferences error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
