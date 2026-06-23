-- =============================================================================
-- Migration: 20260624000100_phase1_config_singletons.sql
-- Phase 1 — Config Singletons: add church_id to 5 config/module tables.
--
-- Tables affected:
--   church_info        (was singleton: CONSTRAINT single_row_church)
--   system_settings    (was singleton: CONSTRAINT single_row_system)
--   notification_config(was singleton: CONSTRAINT single_row_notif)
--   modules            (PK was (key); becomes (church_id, key))
--   role_module_access (UNIQUE was (role, module_key); becomes (church_id, role, module_key))
--
-- Strategy per table (safe online sequence):
--   1. Drop singleton CHECK constraint (church_info, system_settings, notification_config only)
--   2. ADD COLUMN church_id uuid (nullable first — no NOT NULL migration pain)
--   3. UPDATE ... SET church_id = Sion UUID WHERE church_id IS NULL  (backfill)
--   4. ALTER COLUMN church_id SET NOT NULL
--   5. ADD CONSTRAINT ... FOREIGN KEY REFERENCES churches(id)
--   6. CREATE INDEX on church_id
--   7. Add / replace composite UNIQUE constraints where applicable
--
-- Prerequisite: Migration 20260624000001_create_churches.sql must have run
-- (churches table exists and Sion seed row '00000000-0000-0000-0000-00000000515e' is present).
--
-- Also drops the leftover staging tables users_new and users_old (task 1.2).
-- No application-code changes in this phase (Phase 3 handles handler scoping).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Convenience constant: canonical Sion church UUID (referenced in 5 backfills)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Sanity-check: churches table and Sion seed row must exist before we run.
  IF NOT EXISTS (
    SELECT 1 FROM churches WHERE id = '00000000-0000-0000-0000-00000000515e'
  ) THEN
    RAISE EXCEPTION
      'Phase 1 prerequisite failed: churches table or Sion seed row missing. '
      'Run 20260624000001_create_churches.sql first.';
  END IF;
END $$;

-- =============================================================================
-- 1. church_info
-- =============================================================================

-- 1a. Drop singleton CHECK constraint (enforced that only one row could exist).
--     IF EXISTS guard makes this idempotent.
ALTER TABLE public.church_info
  DROP CONSTRAINT IF EXISTS single_row_church;

-- 1b. Add church_id column (nullable to avoid NOT NULL pain on existing rows).
ALTER TABLE public.church_info
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 1c. Backfill existing singleton row to Sion church.
UPDATE public.church_info
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 1d. Enforce NOT NULL now that all rows are backfilled.
ALTER TABLE public.church_info
  ALTER COLUMN church_id SET NOT NULL;

-- 1e. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'church_info_church_id_fkey'
      AND conrelid = 'public.church_info'::regclass
  ) THEN
    ALTER TABLE public.church_info
      ADD CONSTRAINT church_info_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES churches(id);
  END IF;
END $$;

-- 1f. Index on church_id for fast per-tenant lookups.
CREATE INDEX IF NOT EXISTS idx_church_info_church_id
  ON public.church_info (church_id);

-- =============================================================================
-- 2. system_settings
-- =============================================================================

-- 2a. Drop singleton CHECK constraint.
ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS single_row_system;

-- 2b. Add church_id (nullable first).
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 2c. Backfill.
UPDATE public.system_settings
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 2d. NOT NULL.
ALTER TABLE public.system_settings
  ALTER COLUMN church_id SET NOT NULL;

-- 2e. FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_settings_church_id_fkey'
      AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES churches(id);
  END IF;
END $$;

-- 2f. Index.
CREATE INDEX IF NOT EXISTS idx_system_settings_church_id
  ON public.system_settings (church_id);

-- =============================================================================
-- 3. notification_config
-- =============================================================================

-- 3a. Drop singleton CHECK constraint.
ALTER TABLE public.notification_config
  DROP CONSTRAINT IF EXISTS single_row_notif;

-- 3b. Add church_id (nullable first).
ALTER TABLE public.notification_config
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 3c. Backfill.
UPDATE public.notification_config
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 3d. NOT NULL.
ALTER TABLE public.notification_config
  ALTER COLUMN church_id SET NOT NULL;

-- 3e. FK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_config_church_id_fkey'
      AND conrelid = 'public.notification_config'::regclass
  ) THEN
    ALTER TABLE public.notification_config
      ADD CONSTRAINT notification_config_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES churches(id);
  END IF;
END $$;

-- 3f. Index.
CREATE INDEX IF NOT EXISTS idx_notification_config_church_id
  ON public.notification_config (church_id);

-- =============================================================================
-- 4. modules
--
-- Original: PRIMARY KEY (key varchar(50)) — globally unique module key.
-- After:    PRIMARY KEY becomes (church_id, key) so each church has its own
--           set of installed modules. The old single-column PK must be dropped
--           first (a PK cannot coexist with a different PK on the same table).
-- =============================================================================

-- 4a. Add church_id column (nullable first; id column stays as surrogate for
--     the interim period while we shuffle constraints).
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 4b. Backfill all existing rows to Sion church.
UPDATE public.modules
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 4c. NOT NULL.
ALTER TABLE public.modules
  ALTER COLUMN church_id SET NOT NULL;

-- 4d. Replace the existing single-column PRIMARY KEY (key) with a composite
--     primary key (church_id, key).
--     We need to add a surrogate id column first so existing FK references
--     (if any) don't break — but modules has no child FKs in this project,
--     so we can drop and recreate the PK directly.
DO $$
BEGIN
  -- Drop old PK (named 'modules_pkey' by PostgreSQL convention) if it exists.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'modules_pkey'
      AND conrelid = 'public.modules'::regclass
  ) THEN
    ALTER TABLE public.modules DROP CONSTRAINT modules_pkey;
  END IF;

  -- Add new composite PK.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'modules_pkey'
      AND conrelid = 'public.modules'::regclass
  ) THEN
    ALTER TABLE public.modules
      ADD CONSTRAINT modules_pkey PRIMARY KEY (church_id, key);
  END IF;
END $$;

-- 4e. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'modules_church_id_fkey'
      AND conrelid = 'public.modules'::regclass
  ) THEN
    ALTER TABLE public.modules
      ADD CONSTRAINT modules_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES churches(id);
  END IF;
END $$;

-- 4f. Index on church_id for per-tenant module lookups.
CREATE INDEX IF NOT EXISTS idx_modules_church_id
  ON public.modules (church_id);

-- =============================================================================
-- 5. role_module_access
--
-- Original: UNIQUE (role, module_key) — one setting per role+module globally.
-- After:    UNIQUE (church_id, role, module_key) — per church.
-- =============================================================================

-- 5a. Add church_id (nullable first).
ALTER TABLE public.role_module_access
  ADD COLUMN IF NOT EXISTS church_id uuid;

-- 5b. Backfill all existing rows to Sion church.
UPDATE public.role_module_access
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

-- 5c. NOT NULL.
ALTER TABLE public.role_module_access
  ALTER COLUMN church_id SET NOT NULL;

-- 5d. Drop old single-scope UNIQUE and add composite UNIQUE.
DO $$
BEGIN
  -- Drop old UNIQUE (role, module_key) — PostgreSQL auto-names it
  -- 'role_module_access_role_module_key_key'.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'role_module_access_role_module_key_key'
      AND conrelid = 'public.role_module_access'::regclass
  ) THEN
    ALTER TABLE public.role_module_access
      DROP CONSTRAINT role_module_access_role_module_key_key;
  END IF;

  -- Add composite UNIQUE (church_id, role, module_key).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'role_module_access_church_role_module_key'
      AND conrelid = 'public.role_module_access'::regclass
  ) THEN
    ALTER TABLE public.role_module_access
      ADD CONSTRAINT role_module_access_church_role_module_key
      UNIQUE (church_id, role, module_key);
  END IF;
END $$;

-- 5e. FK to churches table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'role_module_access_church_id_fkey'
      AND conrelid = 'public.role_module_access'::regclass
  ) THEN
    ALTER TABLE public.role_module_access
      ADD CONSTRAINT role_module_access_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES churches(id);
  END IF;
END $$;

-- 5f. Index on church_id.
CREATE INDEX IF NOT EXISTS idx_role_module_access_church_id
  ON public.role_module_access (church_id);

-- =============================================================================
-- 6. Drop leftover staging tables users_new and users_old (task 1.2)
--
-- These were created in the original remote_schema snapshot and are no longer
-- used. They have no FK dependents (verified via pg_constraint scan).
-- IF EXISTS guards make this idempotent.
-- =============================================================================

DROP TABLE IF EXISTS public.users_old;
DROP TABLE IF EXISTS public.users_new;

-- =============================================================================
-- 7. Post-migration assertions (run inside a DO block so the migration fails
--    loudly if data integrity was violated rather than silently passing).
-- =============================================================================
DO $$
DECLARE
  v_null_count integer;
BEGIN
  -- church_info: no unbackfilled rows
  SELECT COUNT(*) INTO v_null_count FROM public.church_info WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'church_info has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- system_settings: no unbackfilled rows
  SELECT COUNT(*) INTO v_null_count FROM public.system_settings WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'system_settings has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- notification_config: no unbackfilled rows
  SELECT COUNT(*) INTO v_null_count FROM public.notification_config WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'notification_config has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- modules: no unbackfilled rows
  SELECT COUNT(*) INTO v_null_count FROM public.modules WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'modules has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- role_module_access: no unbackfilled rows
  SELECT COUNT(*) INTO v_null_count FROM public.role_module_access WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'role_module_access has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  RAISE NOTICE 'Phase 1 assertion check passed: all 5 config tables have church_id NOT NULL.';
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
