-- Add 'member' role to user_role enum
-- Pre-existing gap: ROLE_LABELS/ROLE_OPTIONS reference 'member' across the app,
-- but the enum never included it (same shape as the earlier admin-role migration).

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'member';
