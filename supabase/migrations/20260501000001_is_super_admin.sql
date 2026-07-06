-- Add is_super_admin column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Helper function: check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT COALESCE(is_super_admin, false) INTO result
  FROM public.users
  WHERE id = auth.uid();
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update can_access_user() to allow super_admin full access
CREATE OR REPLACE FUNCTION public.can_access_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Super admin can access everything
  SELECT COALESCE(is_super_admin, false) INTO is_admin
  FROM public.users
  WHERE id = auth.uid();

  IF is_admin THEN
    RETURN TRUE;
  END IF;

  -- Get current user role
  SELECT role INTO current_user_role FROM public.users WHERE id = auth.uid();

  -- If no current user role found, deny access
  IF current_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get target user role
  SELECT role INTO target_user_role FROM public.users WHERE id = target_user_id;

  -- User can always access their own data
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Pastor can access all
  IF current_user_role = 'pastor' THEN
    RETURN TRUE;
  END IF;

  -- Staff can access non-pastor users
  IF current_user_role = 'staff' AND target_user_role != 'pastor' THEN
    RETURN TRUE;
  END IF;

  -- Supervisor can access supervisor and server users
  IF current_user_role = 'supervisor' AND target_user_role IN ('supervisor', 'server') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies on users table to include super_admin bypass
DROP POLICY IF EXISTS "Users can view accessible records" ON users;
CREATE POLICY "Users can view accessible records" ON users
  FOR SELECT USING (
    public.is_super_admin() OR can_access_user(id)
  );

DROP POLICY IF EXISTS "Users can update accessible records" ON users;
CREATE POLICY "Users can update accessible records" ON users
  FOR UPDATE USING (
    public.is_super_admin() OR can_access_user(id)
  );

DROP POLICY IF EXISTS "Higher roles can delete subordinates" ON users;
CREATE POLICY "Higher roles can delete subordinates" ON users
  FOR DELETE USING (
    public.is_super_admin() OR (role <> 'pastor'::user_role AND can_access_user(id) AND auth.uid() <> id)
  );
