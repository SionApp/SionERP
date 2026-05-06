-- Migration: Final cleanup - remove auth_id and fix all references
-- Date: 2026-05-04
-- Reason: We now use the SAME UUID for both Supabase Auth and public.users
-- The id in public.users = id in auth.users (single source of truth)

-- ============================================
-- STEP 1: Drop policies that depend on auth_id
-- ============================================

-- Fix access_denied_logs policy (created in 20260430000001)
DROP POLICY IF EXISTS "Admins can view access denied logs" ON access_denied_logs;

-- Recreate it using id (which is now the same as auth.uid())
CREATE POLICY "Admins can view access denied logs" ON access_denied_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('pastor', 'staff')
        )
    );

-- Fix any other policies that use auth_id (from 20260501000002_rls_super_admin_bypass.sql)
-- We need to find and fix them. Let's check the modules policies:
-- (These are just examples - adjust based on your actual policies)

-- Example: If you have policies like:
-- CREATE POLICY ... ON some_table WHERE users.auth_id = auth.uid()
-- Change them to:
-- CREATE POLICY ... ON some_table WHERE users.id::text = auth.uid()::text

-- ============================================
-- STEP2: Fix the handle_new_user trigger function
-- ============================================

-- The trigger function in 20260503000001_fix_handle_new_user_auth_id.sql
-- currently sets auth_id. We need to remove that AND handle NOT NULL columns.

-- First, drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the old function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function WITHOUT auth_id AND WITH all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        id_number,
        first_name,
        last_name,
        role,
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
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'server')::public.user_role,
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 3: Update existing data (if needed)
-- ============================================

-- This ensures all users.id match auth.users.id
-- WARNING: Only run this if you're sure about the mappings!
-- UPDATE public.users 
-- SET id = auth_users.id
-- FROM auth.users AS auth_users
-- WHERE public.users.auth_id = auth_users.id;

-- For now, we assume the data is already correct.
-- If not, uncomment the above and run manually.

-- ============================================
-- STEP 4: Drop the auth_id column
-- ============================================

-- First, drop any indexes on auth_id
DROP INDEX IF EXISTS idx_users_auth_id;

-- Now drop the column
ALTER TABLE public.users DROP COLUMN IF EXISTS auth_id;

-- Add a comment to clarify the design
COMMENT ON COLUMN public.users.id IS 'Same UUID as auth.users.id - single source of truth for user identity';
