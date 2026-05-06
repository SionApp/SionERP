-- Fix handle_new_user trigger to properly set auth_id and handle email conflicts
-- The old trigger did not set auth_id and failed silently when a user already existed
-- in public.users with the same email (data-only users awaiting auth access).
-- This caused login failures: middleware couldn't find the user by auth_id or id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    auth_id,
    email,
    first_name,
    last_name,
    id_number,
    phone,
    address,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'id_number', ''), 'TEMP-' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'address', ''), ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'server')::public.user_role,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    role    = CASE
                WHEN EXCLUDED.role IS NOT NULL THEN EXCLUDED.role
                ELSE public.users.role
              END,
    updated_at = NOW();

  -- If the INSERT conflicted on email (user already existed with a different id),
  -- link their auth_id so the middleware can find them on next login.
  UPDATE public.users
    SET auth_id    = NEW.id,
        updated_at = NOW()
  WHERE email    = COALESCE(NEW.email, '')
    AND id       <> NEW.id
    AND auth_id  IS NULL;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Syncs auth.users → public.users on signup. Sets auth_id on both new inserts and
   pre-existing data-only users (email match). Safe to re-run; uses ON CONFLICT (id).';
