-- Fix handle_new_user trigger to work with magic link user creation
-- This ensures users created via magic links can be properly synced to public.users

-- 1. First, update the RLS policy to allow trigger-based inserts
-- The trigger runs with SECURITY DEFINER, but we need to allow the insert
DROP POLICY IF EXISTS "Users can only register themselves" ON public.users;
DROP POLICY IF EXISTS "Allow user registration and service role operations" ON public.users;

-- Create a policy that allows:
-- 1. Users to register themselves (auth.uid() = id)
-- 2. Service role operations (for triggers and admin operations)
-- 3. Inserts when auth.uid() is NULL (happens with SECURITY DEFINER functions and service role)
-- Note: The handle_new_user() function uses SECURITY DEFINER, so it runs with elevated privileges
-- but still needs to pass RLS policies. This policy allows service_role and NULL auth context.
CREATE POLICY "Allow user registration and service role operations"
ON public.users 
FOR INSERT 
WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'service_role' OR
  auth.uid() IS NULL  -- Allows SECURITY DEFINER functions to insert
);

-- 2. Update the handle_new_user function to handle all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Try to insert the user into public.users
  -- Use COALESCE to provide safe defaults for all fields
  INSERT INTO public.users (
    id, 
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
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Sin Apellido'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'id_number', ''), 
      'TEMP-' || SUBSTRING(NEW.id::text, 1, 8)
    ),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'address', ''), ''),
    COALESCE(
      NULLIF((NEW.raw_user_meta_data->>'role')::text, ''),
      'server'
    ),
    true,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    updated_at = NOW();
  
  -- Update invitation status to 'accepted' if there's a pending invitation for this email
  -- This is a simple, efficient update that only affects matching rows
  -- The WHERE clause ensures it only updates pending invitations for this email
  UPDATE public.user_invitations
  SET status = 'accepted',
      updated_at = NOW()
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    -- This allows the magic link to be generated even if there's an issue with public.users
    RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow the auth.users insert to succeed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function to sync auth.users with public.users. Handles errors gracefully to prevent blocking user creation via magic links. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON POLICY "Allow user registration and service role operations" ON public.users IS
'Allows users to register themselves OR service role operations (like trigger-based inserts from handle_new_user).';

