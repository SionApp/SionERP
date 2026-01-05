-- Add 'admin' role to user_role enum
-- This allows users to have the 'admin' role for system administration tasks

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- Note: After running this migration, you'll need to manually assign the admin role
-- to at least one user. Example:
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@example.com';
