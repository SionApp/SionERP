-- Step 1: Drop policies that reference the role column
DROP POLICY IF EXISTS "Permitir CRUD a administradores" ON public.permissions;
DROP POLICY IF EXISTS "Permitir CRUD a administradores" ON public.role_permissions;

-- Step 2: Update existing data to valid enum values  
UPDATE public.users SET role = 'pastor' WHERE role = 'admin';
UPDATE public.users SET role = 'server' WHERE role = 'usuario';

-- Step 3: Drop default constraint temporarily
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

-- Step 4: Create user_role enum (English)
CREATE TYPE public.user_role AS ENUM ('pastor', 'staff', 'supervisor', 'server');

-- Step 5: Update role column to use enum
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING role::user_role;

-- Step 6: Set new default
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'server';

-- Step 7: Recreate policies with English role names
CREATE POLICY "Allow CRUD to pastors and staff" 
ON public.permissions 
FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));

CREATE POLICY "Allow CRUD to pastors and staff" 
ON public.role_permissions 
FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));