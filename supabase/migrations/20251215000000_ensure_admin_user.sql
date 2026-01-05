-- Ensure that boanegro4@yopmail.com has admin role if the user exists
-- This migration is optional and ensures the special admin user has the correct role

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'boanegro4@yopmail.com' 
  AND role != 'admin'
  AND EXISTS (SELECT 1 FROM public.users WHERE email = 'boanegro4@yopmail.com');

-- Note: This user will have admin access even if role is 'pastor' due to special email check in backend
-- But setting role to 'admin' ensures consistency and allows the user to have both admin and pastor permissions


