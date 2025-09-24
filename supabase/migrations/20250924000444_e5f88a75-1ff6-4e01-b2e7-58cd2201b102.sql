-- Primero, eliminamos las políticas que causan recursión
DROP POLICY IF EXISTS "Users can view their own info or higher roles can view all" ON public.users;
DROP POLICY IF EXISTS "Users can update their own info or higher roles can update subo" ON public.users;
DROP POLICY IF EXISTS "Higher roles can delete subordinates (except pastor can't be de" ON public.users;

-- Crear funciones security definer para evitar recursión
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

-- Recrear políticas usando las funciones security definer
CREATE POLICY "Users can view accessible records"
ON public.users
FOR SELECT
USING (public.can_access_user(id));

CREATE POLICY "Users can update accessible records"
ON public.users
FOR UPDATE
USING (public.can_access_user(id));

CREATE POLICY "Higher roles can delete subordinates"
ON public.users
FOR DELETE
USING (
  role != 'pastor' AND 
  public.can_access_user(id) AND 
  auth.uid() != id  -- Can't delete yourself
);

-- Política para insertar usuarios (solo para registro público)
CREATE POLICY "Allow public user registration"
ON public.users
FOR INSERT
WITH CHECK (true);  -- Permitir registro público, validación en aplicación