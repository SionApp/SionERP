-- Add auth_id column to separate Supabase Auth ID from business user ID
-- This allows users to exist in public.users (data only) and later be granted auth access
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Set auth_id = id for users where they already match (normal case)
UPDATE users SET auth_id = id::uuid WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Users created as data-only (no auth) will have NULL auth_id until granted access
