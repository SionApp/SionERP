-- Arreglar las funciones security definer con search_path correcto
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;