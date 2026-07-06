-- =============================================================================
-- Migration: 20260624000200_phase2a_tenant_schema_group_a.sql
-- Phase 2a — Tenant Schema Group A: add church_id to 8 core tenant tables.
--
-- Tables in this migration:
--   1. users                  — also replaces UNIQUE(email) → UNIQUE(church_id, email)
--   2. user_invitations       — also replaces UNIQUE(email) → UNIQUE(church_id, email)
--   3. zones                  — also replaces UNIQUE(name)  → UNIQUE(church_id, name)
--   4. discipleship_groups    — add church_id + index
--   5. discipleship_group_members — add church_id + index
--   6. discipleship_levels    — globally-seeded rows backfilled to Sion; per-church going forward
--   7. discipleship_hierarchy — also replaces UNIQUE(user_id) → UNIQUE(church_id, user_id)
--   8. discipleship_attendance — add church_id + index
--
-- Per-table safe online sequence:
--   a. ADD COLUMN church_id uuid (nullable first)
--   b. UPDATE backfill WHERE church_id IS NULL
--   c. ALTER COLUMN church_id SET NOT NULL
--   d. ADD CONSTRAINT FK REFERENCES churches(id) (idempotent DO block)
--   e. DROP old unique constraint / ADD new composite unique (idempotent DO block)
--   f. CREATE INDEX IF NOT EXISTS on church_id
--
-- Also:
--   - Backfill auth.users.raw_app_meta_data with church_id for existing users
--
-- Prerequisite: churches table must exist with Sion seed row
--   '00000000-0000-0000-0000-00000000515e'
--
-- Constraint names discovered from existing migrations:
--   users.email             → users_correo_key (remote_schema.sql:930)
--                             + functional index users_email_lower_key (20260507000003)
--   user_invitations.email  → user_invitations_email_key (remote_schema.sql:890)
--   zones.name              → zones_name_key (auto-named from inline UNIQUE)
--   discipleship_hierarchy.user_id → discipleship_hierarchy_user_id_key (remote_schema.sql:845)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Prerequisite guard: churches table + Sion seed row must exist.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.churches WHERE id = '00000000-0000-0000-0000-00000000515e'
  ) THEN
    RAISE EXCEPTION
      'Phase 2a prerequisite failed: churches table or Sion seed row missing. '
      'Run 20260624000001_create_churches.sql first.';
  END IF;
END $$;

-- =============================================================================
-- 1. users
--
-- Existing email constraints to replace:
--   users_correo_key          — UNIQUE(email) from remote_schema.sql
--   users_email_lower_key     — functional UNIQUE INDEX on LOWER(email) from
--                               20260507000003_users_email_unique.sql
-- New: UNIQUE(church_id, email) — per-church uniqueness
-- =============================================================================

-- 1a. Add church_id column (nullable first).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 1b. Backfill all existing rows to the Sion church.
UPDATE public.users
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 1c. Enforce NOT NULL now that all rows are backfilled.
ALTER TABLE public.users
  ALTER COLUMN church_id SET NOT NULL;

-- 1d. FK to churches table (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_church_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 1e. Replace single-email unique constraints with composite (church_id, email).
DO $$
BEGIN
  -- Drop the old global unique constraint on email (users_correo_key).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_correo_key'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_correo_key;
  END IF;

  -- Drop the functional unique index on LOWER(email) (users_email_lower_key).
  -- This must be dropped as an index, not a constraint.
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND indexname = 'users_email_lower_key'
  ) THEN
    DROP INDEX IF EXISTS public.users_email_lower_key;
  END IF;

  -- Add composite unique: per church, email must be unique.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_church_id_email_key'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_church_id_email_key
      UNIQUE (church_id, email);
  END IF;
END $$;

-- 1f. Index on church_id for fast per-tenant lookups.
CREATE INDEX IF NOT EXISTS idx_users_church_id
  ON public.users (church_id);

-- =============================================================================
-- 2. user_invitations
--
-- Existing constraint to replace:
--   user_invitations_email_key — UNIQUE(email) from remote_schema.sql
-- New: UNIQUE(church_id, email) — per-church uniqueness
-- =============================================================================

-- 2a. Add church_id column (nullable first).
ALTER TABLE public.user_invitations
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 2b. Backfill.
UPDATE public.user_invitations
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 2c. NOT NULL.
ALTER TABLE public.user_invitations
  ALTER COLUMN church_id SET NOT NULL;

-- 2d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_invitations_church_id_fkey'
      AND conrelid = 'public.user_invitations'::regclass
  ) THEN
    ALTER TABLE public.user_invitations
      ADD CONSTRAINT user_invitations_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 2e. Replace single-email unique with composite (church_id, email).
DO $$
BEGIN
  -- Drop old global unique on email.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_invitations_email_key'
      AND conrelid = 'public.user_invitations'::regclass
  ) THEN
    ALTER TABLE public.user_invitations DROP CONSTRAINT user_invitations_email_key;
  END IF;

  -- Add composite unique.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_invitations_church_id_email_key'
      AND conrelid = 'public.user_invitations'::regclass
  ) THEN
    ALTER TABLE public.user_invitations
      ADD CONSTRAINT user_invitations_church_id_email_key
      UNIQUE (church_id, email);
  END IF;
END $$;

-- 2f. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_user_invitations_church_id
  ON public.user_invitations (church_id);

-- =============================================================================
-- 3. zones
--
-- Existing constraint to replace:
--   zones_name_key — UNIQUE(name) auto-named from inline UNIQUE in CREATE TABLE
--                    (20251206032901_create_zone_discipleship.sql)
-- New: UNIQUE(church_id, name) — zone names are unique per church, not globally
-- =============================================================================

-- 3a. Add church_id column (nullable first).
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 3b. Backfill.
UPDATE public.zones
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 3c. NOT NULL.
ALTER TABLE public.zones
  ALTER COLUMN church_id SET NOT NULL;

-- 3d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'zones_church_id_fkey'
      AND conrelid = 'public.zones'::regclass
  ) THEN
    ALTER TABLE public.zones
      ADD CONSTRAINT zones_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 3e. Replace global UNIQUE(name) with composite UNIQUE(church_id, name).
DO $$
BEGIN
  -- Drop old global unique on name (auto-named zones_name_key by PostgreSQL).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'zones_name_key'
      AND conrelid = 'public.zones'::regclass
  ) THEN
    ALTER TABLE public.zones DROP CONSTRAINT zones_name_key;
  END IF;

  -- Add composite unique: zone name unique per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'zones_church_id_name_key'
      AND conrelid = 'public.zones'::regclass
  ) THEN
    ALTER TABLE public.zones
      ADD CONSTRAINT zones_church_id_name_key
      UNIQUE (church_id, name);
  END IF;
END $$;

-- 3f. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_zones_church_id
  ON public.zones (church_id);

-- =============================================================================
-- 4. discipleship_groups
-- =============================================================================

-- 4a. Add church_id column (nullable first).
ALTER TABLE public.discipleship_groups
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 4b. Backfill.
UPDATE public.discipleship_groups
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 4c. NOT NULL.
ALTER TABLE public.discipleship_groups
  ALTER COLUMN church_id SET NOT NULL;

-- 4d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_groups_church_id_fkey'
      AND conrelid = 'public.discipleship_groups'::regclass
  ) THEN
    ALTER TABLE public.discipleship_groups
      ADD CONSTRAINT discipleship_groups_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 4e. No unique constraint changes for discipleship_groups — no single-column
--     unique that needs broadening. The existing PK(id) is sufficient.

-- 4f. Index on church_id for per-tenant group lookups.
CREATE INDEX IF NOT EXISTS idx_discipleship_groups_church_id
  ON public.discipleship_groups (church_id);

-- =============================================================================
-- 5. discipleship_group_members
--
-- Existing inline UNIQUE: (group_id, user_id) — remains valid; a user can only
-- be in a given group once. This is still correct per-group, so no change.
-- We add church_id for isolation but do NOT change the existing unique.
-- =============================================================================

-- 5a. Add church_id column (nullable first).
ALTER TABLE public.discipleship_group_members
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 5b. Backfill.
UPDATE public.discipleship_group_members
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 5c. NOT NULL.
ALTER TABLE public.discipleship_group_members
  ALTER COLUMN church_id SET NOT NULL;

-- 5d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_group_members_church_id_fkey'
      AND conrelid = 'public.discipleship_group_members'::regclass
  ) THEN
    ALTER TABLE public.discipleship_group_members
      ADD CONSTRAINT discipleship_group_members_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 5e. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_discipleship_group_members_church_id
  ON public.discipleship_group_members (church_id);

-- =============================================================================
-- 6. discipleship_levels
--
-- Currently seeded with 5 globally-fixed UUID rows in 001_create_discipleship_levels.sql.
-- Per design: these rows get backfilled to Sion church. Going forward, new churches
-- receive their own rows via provision_church() (Phase 5). The fixed UUIDs remain
-- as the Sion church's level IDs — no data loss, no foreign key breakage.
-- =============================================================================

-- 6a. Add church_id column (nullable first).
ALTER TABLE public.discipleship_levels
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 6b. Backfill all existing rows (the 5 globally-seeded Sion levels) to Sion church.
UPDATE public.discipleship_levels
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 6c. NOT NULL.
ALTER TABLE public.discipleship_levels
  ALTER COLUMN church_id SET NOT NULL;

-- 6d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_levels_church_id_fkey'
      AND conrelid = 'public.discipleship_levels'::regclass
  ) THEN
    ALTER TABLE public.discipleship_levels
      ADD CONSTRAINT discipleship_levels_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 6e. Add composite unique (church_id, order_index) so level ordering is
--     unique per church (each church has exactly one level at each position).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_levels_church_id_order_idx_key'
      AND conrelid = 'public.discipleship_levels'::regclass
  ) THEN
    ALTER TABLE public.discipleship_levels
      ADD CONSTRAINT discipleship_levels_church_id_order_idx_key
      UNIQUE (church_id, order_index);
  END IF;
END $$;

-- 6f. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_discipleship_levels_church_id
  ON public.discipleship_levels (church_id);

-- =============================================================================
-- 7. discipleship_hierarchy
--
-- Existing constraint to replace:
--   discipleship_hierarchy_user_id_key — UNIQUE(user_id) from remote_schema.sql:845
--   (a user can only appear once in the global hierarchy)
-- New: UNIQUE(church_id, user_id) — a user can appear once per church hierarchy
-- =============================================================================

-- 7a. Add church_id column (nullable first).
ALTER TABLE public.discipleship_hierarchy
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 7b. Backfill.
UPDATE public.discipleship_hierarchy
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 7c. NOT NULL.
ALTER TABLE public.discipleship_hierarchy
  ALTER COLUMN church_id SET NOT NULL;

-- 7d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_hierarchy_church_id_fkey'
      AND conrelid = 'public.discipleship_hierarchy'::regclass
  ) THEN
    ALTER TABLE public.discipleship_hierarchy
      ADD CONSTRAINT discipleship_hierarchy_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 7e. Replace UNIQUE(user_id) with UNIQUE(church_id, user_id).
DO $$
BEGIN
  -- Drop old global unique on user_id.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_hierarchy_user_id_key'
      AND conrelid = 'public.discipleship_hierarchy'::regclass
  ) THEN
    ALTER TABLE public.discipleship_hierarchy
      DROP CONSTRAINT discipleship_hierarchy_user_id_key;
  END IF;

  -- Add composite unique: one hierarchy entry per user per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_hierarchy_church_id_user_id_key'
      AND conrelid = 'public.discipleship_hierarchy'::regclass
  ) THEN
    ALTER TABLE public.discipleship_hierarchy
      ADD CONSTRAINT discipleship_hierarchy_church_id_user_id_key
      UNIQUE (church_id, user_id);
  END IF;
END $$;

-- 7f. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_discipleship_hierarchy_church_id
  ON public.discipleship_hierarchy (church_id);

-- =============================================================================
-- 8. discipleship_attendance
--
-- Existing inline UNIQUE: (group_id, user_id, meeting_date) — remains valid;
-- a user can only have one attendance record per group per meeting date.
-- The existing unique is still correct within a group, so no change needed.
-- =============================================================================

-- 8a. Add church_id column (nullable first).
ALTER TABLE public.discipleship_attendance
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 8b. Backfill.
UPDATE public.discipleship_attendance
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 8c. NOT NULL.
ALTER TABLE public.discipleship_attendance
  ALTER COLUMN church_id SET NOT NULL;

-- 8d. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_attendance_church_id_fkey'
      AND conrelid = 'public.discipleship_attendance'::regclass
  ) THEN
    ALTER TABLE public.discipleship_attendance
      ADD CONSTRAINT discipleship_attendance_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- 8e. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_discipleship_attendance_church_id
  ON public.discipleship_attendance (church_id);

-- =============================================================================
-- 9. Backfill auth.users.raw_app_meta_data with church_id for all existing users
--
-- Existing users' JWTs lack the church_id claim until their token refreshes.
-- The Go middleware already falls back to users.church_id for missing claims
-- (Phase 0, task 0.6), but backfilling here closes the gap for users who
-- refresh their token before Phase 3 is deployed.
--
-- The WHERE clause makes this idempotent: only updates rows where church_id
-- is not already present in app_metadata.
-- =============================================================================
UPDATE auth.users au
SET raw_app_meta_data =
  COALESCE(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('church_id', '00000000-0000-0000-0000-00000000515e')
WHERE au.id IN (SELECT id FROM public.users)
  AND (au.raw_app_meta_data->>'church_id') IS NULL;

-- =============================================================================
-- 10. Post-migration assertions
--
-- Run inside a DO block so the migration fails loudly if any table still has
-- NULL church_id rows after the backfill steps above.
-- =============================================================================
DO $$
DECLARE
  v_null_count integer;
BEGIN
  -- 1. users
  SELECT COUNT(*) INTO v_null_count FROM public.users WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'users has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 2. user_invitations
  SELECT COUNT(*) INTO v_null_count FROM public.user_invitations WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'user_invitations has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 3. zones
  SELECT COUNT(*) INTO v_null_count FROM public.zones WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'zones has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 4. discipleship_groups
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_groups WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_groups has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 5. discipleship_group_members
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_group_members WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_group_members has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 6. discipleship_levels
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_levels WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_levels has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 7. discipleship_hierarchy
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_hierarchy WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_hierarchy has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 8. discipleship_attendance
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_attendance WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_attendance has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  RAISE NOTICE
    'Phase 2a assertion check passed: all 8 tenant tables have church_id NOT NULL.';
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
