-- Make super admin VISIBLE in all queries but PROTECTED from modification.
--
-- Strategy:
--   - SELECT policies keep using can_access_user() → super admin is visible
--   - UPDATE/DELETE policies use can_modify_user() → super admin is protected
--     (only super admins can modify the super admin account)

-- Helper: check if current user is super admin (already exists but idempotent)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT COALESCE(is_super_admin, false) INTO result
  FROM public.users WHERE id = auth.uid();
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if target user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT COALESCE(is_super_admin, false) INTO result
  FROM public.users WHERE id = target_user_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_access_user (for SELECT): super admin is VISIBLE to pastors/staff
-- Super admin can see everyone; others see based on role hierarchy
CREATE OR REPLACE FUNCTION public.can_access_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Super admin can see everyone
  SELECT COALESCE(is_super_admin, false) INTO is_admin
  FROM public.users WHERE id = auth.uid();
  IF is_admin THEN RETURN TRUE; END IF;

  SELECT role INTO current_user_role FROM public.users WHERE id = auth.uid();
  IF current_user_role IS NULL THEN RETURN FALSE; END IF;

  SELECT role INTO target_user_role FROM public.users WHERE id = target_user_id;
  IF auth.uid() = target_user_id THEN RETURN TRUE; END IF;
  IF current_user_role = 'pastor' THEN RETURN TRUE; END IF;
  IF current_user_role = 'staff' AND target_user_role != 'pastor' THEN RETURN TRUE; END IF;
  IF current_user_role = 'supervisor' AND target_user_role IN ('supervisor', 'server') THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_modify_user (for UPDATE/DELETE): super admin is PROTECTED
-- Only super admins can modify the super admin account
CREATE OR REPLACE FUNCTION public.can_modify_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_is_super_admin BOOLEAN;
BEGIN
  -- Super admins can modify anyone
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Nobody else can modify the system super admin
  SELECT COALESCE(is_super_admin, false) INTO target_is_super_admin
  FROM public.users WHERE id = target_user_id;
  IF target_is_super_admin THEN
    RETURN FALSE;
  END IF;

  -- Fall back to regular access check
  RETURN public.can_access_user(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE/DELETE policies on users table → use can_modify_user()
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update accessible records" ON users;
CREATE POLICY "Users can update accessible records" ON users
  FOR UPDATE USING (
    public.can_modify_user(id)
  );

DROP POLICY IF EXISTS "Higher roles can delete subordinates" ON users;
CREATE POLICY "Higher roles can delete subordinates" ON users
  FOR DELETE USING (
    public.can_modify_user(id) AND role <> 'pastor'::user_role AND auth.uid() <> id
  );

-- SELECT policy stays with can_access_user (super admin is VISIBLE)
DROP POLICY IF EXISTS "Users can view accessible records" ON users;
CREATE POLICY "Users can view accessible records" ON users
  FOR SELECT USING (
    public.is_super_admin() OR can_access_user(id)
  );
