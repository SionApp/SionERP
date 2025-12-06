-- Remove the overly permissive role_user policy that allows unrestricted access
DROP POLICY IF EXISTS "role_user" ON public.users;

-- Ensure we have proper policies for secure access
-- The existing policies should handle all legitimate use cases:
-- 1. "Servicio puede insertar usuarios" - allows registration
-- 2. "Usuarios pueden actualizar su propia información" - users can update their own data
-- 3. "Usuarios pueden ver su propia información" - users can view their own data

-- Add a comment to document the security fix
COMMENT ON TABLE public.users IS 'User table with secure RLS policies - only authenticated users can access their own data';