-- =============================================================================
-- Migration: 20260624000300_phase2b_tenant_schema_group_b.sql
-- Phase 2b — Tenant Schema Group B: add church_id to remaining tenant tables.
--
-- Tables in this migration (27 tables):
--   Events:       events, event_registrations
--   Music:        music_members, music_events, music_assignments, music_songs,
--                 music_event_songs, music_unavailability, music_telegram_files,
--                 music_instruments
--   Reports/audit: reports, report_generations, notifications, audit_logs,
--                  access_denied_logs, settings_audit_log
--   User tables:  user_profiles, user_preferences, user_permissions
--   Other tenant: live_streams, discipleship_reports, discipleship_alerts,
--                 discipleship_goals, goal_assignments, goal_manual_progress,
--                 cell_multiplication_tracking, module_user_roles
--
-- SKIP (already done in Phase 2a):
--   users, user_invitations, zones, discipleship_groups,
--   discipleship_group_members, discipleship_levels, discipleship_hierarchy,
--   discipleship_attendance
--
-- SKIP (global/shared — no church_id ever):
--   permissions, role_permissions  (static RBAC, shared across all churches)
--
-- Per-table safe online sequence:
--   a. ADD COLUMN church_id uuid (nullable first — zero downtime)
--   b. UPDATE backfill WHERE church_id IS NULL  (Sion seed)
--   c. ALTER COLUMN church_id SET NOT NULL
--   d. ADD CONSTRAINT FK REFERENCES churches(id)  (idempotent DO block)
--   e. Fix unique constraints where needed  (idempotent DO block)
--   f. CREATE INDEX IF NOT EXISTS on church_id
--
-- Unique constraint changes:
--   music_members:        UNIQUE(user_id)                             → UNIQUE(church_id, user_id)
--   music_events:         UNIQUE(event_date, event_type)              → UNIQUE(church_id, event_date, event_type)
--   music_songs:          UNIQUE(name_normalized) [named constraint]  → UNIQUE(church_id, name_normalized)
--   music_telegram_files: UNIQUE(file_unique_id)                      → UNIQUE(church_id, file_unique_id)
--   music_instruments:    expression index lower(name)                → expression index (church_id, lower(name))
--   user_profiles:        UNIQUE(user_id, module_name)                → UNIQUE(church_id, user_id, module_name)
--   user_preferences:     UNIQUE(user_id)                             → UNIQUE(church_id, user_id)
--   user_permissions:     UNIQUE(user_id, permission_name, resource, action)
--                                                                     → UNIQUE(church_id, user_id, permission_name, resource, action)
--   module_user_roles:    UNIQUE(user_id, module_key)                 → UNIQUE(church_id, user_id, module_key)
--
-- Unique constraints PRESERVED as-is (semantically correct within their scope):
--   event_registrations:  UNIQUE(event_id, user_id)       — per-event is still meaningful
--   music_assignments:    UNIQUE(event_id, member_id)     — per-event/member
--   music_event_songs:    UNIQUE(event_id, song_id)       — per-event/song
--   goal_assignments:     UNIQUE(goal_id, assigned_to, parent_assignment_id)
--   goal_manual_progress: UNIQUE(assignment_id, report_id)
--
-- Storage RLS isolation (task 2b.5):
--   Actual Supabase Storage RLS policies must be created via the Supabase dashboard
--   or storage API — SQL DDL on storage.objects is not supported via migration files
--   in this stack. The isolation design is:
--     - Go upload handler prefixes all object paths with "{church_id}/" before
--       writing to the "church-assets" bucket (implemented in Phase 3c).
--     - Dashboard policy (authenticated path):
--         USING ((storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'church_id'))
--     - Go backend path (jetro_app role via GUC):
--         USING ((storage.foldername(name))[1] = current_setting('app.current_church_id', true))
--   These policies must be applied MANUALLY after Phase 4 RLS cutover.
--
-- Prerequisite: Phase 2a must be applied first (churches + users.church_id exist).
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
      'Phase 2b prerequisite failed: churches table or Sion seed row missing. '
      'Run 20260624000001_create_churches.sql and phase 0/1/2a migrations first.';
  END IF;
END $$;

-- =============================================================================
-- 1. events
--    No unique constraints to change (event identity is per-id).
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.events
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.events
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_church_id_fkey'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_church_id
  ON public.events (church_id);

-- =============================================================================
-- 2. event_registrations
--    Existing UNIQUE(event_id, user_id) is preserved — a user can only register
--    once per event, and cross-church duplication is impossible because event_id
--    already implicitly scopes to a church (events.church_id is set above).
-- =============================================================================

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.event_registrations
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.event_registrations
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_registrations_church_id_fkey'
      AND conrelid = 'public.event_registrations'::regclass
  ) THEN
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT event_registrations_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_registrations_church_id
  ON public.event_registrations (church_id);

-- =============================================================================
-- 3. music_members
--    Old: UNIQUE(user_id)  — constraint name: music_members_user_id_unique
--    New: UNIQUE(church_id, user_id) — a user can be a music member once per church
-- =============================================================================

ALTER TABLE public.music_members
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_members
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_members
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_members_church_id_fkey'
      AND conrelid = 'public.music_members'::regclass
  ) THEN
    ALTER TABLE public.music_members
      ADD CONSTRAINT music_members_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old global unique on user_id.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_members_user_id_unique'
      AND conrelid = 'public.music_members'::regclass
  ) THEN
    ALTER TABLE public.music_members DROP CONSTRAINT music_members_user_id_unique;
  END IF;

  -- Add composite unique: one music_member row per user per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_members_church_id_user_id_key'
      AND conrelid = 'public.music_members'::regclass
  ) THEN
    ALTER TABLE public.music_members
      ADD CONSTRAINT music_members_church_id_user_id_key
      UNIQUE (church_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_members_church_id
  ON public.music_members (church_id);

-- =============================================================================
-- 4. music_events
--    Old: UNIQUE(event_date, event_type)  — constraint: music_events_date_type_unique
--    New: UNIQUE(church_id, event_date, event_type) — per church, one event of each
--         type per date (a church can't have two Sunday services on the same day)
-- =============================================================================

ALTER TABLE public.music_events
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_events
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_events
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_events_church_id_fkey'
      AND conrelid = 'public.music_events'::regclass
  ) THEN
    ALTER TABLE public.music_events
      ADD CONSTRAINT music_events_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old global unique on (event_date, event_type).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_events_date_type_unique'
      AND conrelid = 'public.music_events'::regclass
  ) THEN
    ALTER TABLE public.music_events DROP CONSTRAINT music_events_date_type_unique;
  END IF;

  -- Add composite unique: per church, date+type is unique.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_events_church_id_date_type_key'
      AND conrelid = 'public.music_events'::regclass
  ) THEN
    ALTER TABLE public.music_events
      ADD CONSTRAINT music_events_church_id_date_type_key
      UNIQUE (church_id, event_date, event_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_events_church_id
  ON public.music_events (church_id);

-- =============================================================================
-- 5. music_assignments
--    Existing UNIQUE(event_id, member_id) preserved — semantically correct
--    because music_events already has church_id set above.
-- =============================================================================

ALTER TABLE public.music_assignments
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_assignments
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_assignments
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_assignments_church_id_fkey'
      AND conrelid = 'public.music_assignments'::regclass
  ) THEN
    ALTER TABLE public.music_assignments
      ADD CONSTRAINT music_assignments_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_assignments_church_id
  ON public.music_assignments (church_id);

-- =============================================================================
-- 6. music_songs
--    Old: UNIQUE(name_normalized)  — constraint: music_songs_name_normalized_unique
--    New: UNIQUE(church_id, name_normalized) — song catalog is per church
-- =============================================================================

ALTER TABLE public.music_songs
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_songs
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_songs
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_songs_church_id_fkey'
      AND conrelid = 'public.music_songs'::regclass
  ) THEN
    ALTER TABLE public.music_songs
      ADD CONSTRAINT music_songs_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old global unique on name_normalized.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_songs_name_normalized_unique'
      AND conrelid = 'public.music_songs'::regclass
  ) THEN
    ALTER TABLE public.music_songs DROP CONSTRAINT music_songs_name_normalized_unique;
  END IF;

  -- Add composite unique: song name is unique per church catalog.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_songs_church_id_name_normalized_key'
      AND conrelid = 'public.music_songs'::regclass
  ) THEN
    ALTER TABLE public.music_songs
      ADD CONSTRAINT music_songs_church_id_name_normalized_key
      UNIQUE (church_id, name_normalized);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_songs_church_id
  ON public.music_songs (church_id);

-- =============================================================================
-- 7. music_event_songs
--    Existing UNIQUE(event_id, song_id) preserved — per-event scoping is
--    sufficient since music_events.church_id ensures cross-church isolation.
-- =============================================================================

ALTER TABLE public.music_event_songs
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_event_songs
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_event_songs
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_event_songs_church_id_fkey'
      AND conrelid = 'public.music_event_songs'::regclass
  ) THEN
    ALTER TABLE public.music_event_songs
      ADD CONSTRAINT music_event_songs_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_event_songs_church_id
  ON public.music_event_songs (church_id);

-- =============================================================================
-- 8. music_unavailability
--    No unique constraints to change.
-- =============================================================================

ALTER TABLE public.music_unavailability
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_unavailability
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_unavailability
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_unavailability_church_id_fkey'
      AND conrelid = 'public.music_unavailability'::regclass
  ) THEN
    ALTER TABLE public.music_unavailability
      ADD CONSTRAINT music_unavailability_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_unavailability_church_id
  ON public.music_unavailability (church_id);

-- =============================================================================
-- 9. music_telegram_files
--    Old: UNIQUE(file_unique_id)  — constraint auto-named (inline UNIQUE)
--         PostgreSQL auto-names inline UNIQUE as music_telegram_files_file_unique_id_key
--    New: UNIQUE(church_id, file_unique_id) — dedup within church Telegram channel
-- =============================================================================

ALTER TABLE public.music_telegram_files
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_telegram_files
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_telegram_files
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_telegram_files_church_id_fkey'
      AND conrelid = 'public.music_telegram_files'::regclass
  ) THEN
    ALTER TABLE public.music_telegram_files
      ADD CONSTRAINT music_telegram_files_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old global unique on file_unique_id (auto-named by PostgreSQL).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_telegram_files_file_unique_id_key'
      AND conrelid = 'public.music_telegram_files'::regclass
  ) THEN
    ALTER TABLE public.music_telegram_files DROP CONSTRAINT music_telegram_files_file_unique_id_key;
  END IF;

  -- Add composite unique: Telegram file_unique_id is dedup key per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_telegram_files_church_id_file_unique_id_key'
      AND conrelid = 'public.music_telegram_files'::regclass
  ) THEN
    ALTER TABLE public.music_telegram_files
      ADD CONSTRAINT music_telegram_files_church_id_file_unique_id_key
      UNIQUE (church_id, file_unique_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_music_telegram_files_church_id
  ON public.music_telegram_files (church_id);

-- =============================================================================
-- 10. music_instruments
--     Old: expression unique index idx_music_instruments_name on lower(name)
--     New: expression unique index on (church_id, lower(name)) — instrument
--          catalog is per church; two churches can have an instrument named "Bajo"
-- =============================================================================

ALTER TABLE public.music_instruments
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.music_instruments
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.music_instruments
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'music_instruments_church_id_fkey'
      AND conrelid = 'public.music_instruments'::regclass
  ) THEN
    ALTER TABLE public.music_instruments
      ADD CONSTRAINT music_instruments_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

-- Drop the old global expression index and replace with per-church one.
-- Expression unique indexes cannot be managed via ADD/DROP CONSTRAINT —
-- they must be created as indexes directly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'music_instruments'
      AND indexname = 'idx_music_instruments_name'
  ) THEN
    DROP INDEX IF EXISTS public.idx_music_instruments_name;
  END IF;
END $$;

-- Recreate as composite expression index (church_id, lower(name)).
CREATE UNIQUE INDEX IF NOT EXISTS idx_music_instruments_church_id_name
  ON public.music_instruments (church_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_music_instruments_church_id
  ON public.music_instruments (church_id);

-- =============================================================================
-- 11. reports
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.reports
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.reports
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_church_id_fkey'
      AND conrelid = 'public.reports'::regclass
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_church_id
  ON public.reports (church_id);

-- =============================================================================
-- 12. report_generations
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.report_generations
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.report_generations
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.report_generations
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'report_generations_church_id_fkey'
      AND conrelid = 'public.report_generations'::regclass
  ) THEN
    ALTER TABLE public.report_generations
      ADD CONSTRAINT report_generations_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_report_generations_church_id
  ON public.report_generations (church_id);

-- =============================================================================
-- 13. notifications
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.notifications
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_church_id_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_church_id
  ON public.notifications (church_id);

-- =============================================================================
-- 14. audit_logs
--     No unique constraints (PK only). Audit log is per-tenant for compliance.
-- =============================================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.audit_logs
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.audit_logs
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_logs_church_id_fkey'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_church_id
  ON public.audit_logs (church_id);

-- =============================================================================
-- 15. access_denied_logs
--     No unique constraints (PK only). Per-tenant security audit log.
-- =============================================================================

ALTER TABLE public.access_denied_logs
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.access_denied_logs
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.access_denied_logs
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'access_denied_logs_church_id_fkey'
      AND conrelid = 'public.access_denied_logs'::regclass
  ) THEN
    ALTER TABLE public.access_denied_logs
      ADD CONSTRAINT access_denied_logs_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_access_denied_logs_church_id
  ON public.access_denied_logs (church_id);

-- =============================================================================
-- 16. settings_audit_log
--     No unique constraints (PK only). Per-tenant settings audit trail.
-- =============================================================================

ALTER TABLE public.settings_audit_log
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.settings_audit_log
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.settings_audit_log
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'settings_audit_log_church_id_fkey'
      AND conrelid = 'public.settings_audit_log'::regclass
  ) THEN
    ALTER TABLE public.settings_audit_log
      ADD CONSTRAINT settings_audit_log_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settings_audit_log_church_id
  ON public.settings_audit_log (church_id);

-- =============================================================================
-- 17. user_profiles
--     Old: UNIQUE(user_id, module_name)  — constraint: user_profiles_user_id_module_name_key
--     New: UNIQUE(church_id, user_id, module_name) — profile is per user per module per church
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.user_profiles
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_church_id_fkey'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old unique on (user_id, module_name).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_user_id_module_name_key'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_module_name_key;
  END IF;

  -- Add composite unique.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_church_id_user_id_module_name_key'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_church_id_user_id_module_name_key
      UNIQUE (church_id, user_id, module_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_church_id
  ON public.user_profiles (church_id);

-- =============================================================================
-- 18. user_preferences
--     Old: UNIQUE(user_id)  — auto-named user_preferences_user_id_key
--          (declared via inline UNIQUE in settings_module migration)
--     New: UNIQUE(church_id, user_id) — a user can have preferences per church
-- =============================================================================

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.user_preferences
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.user_preferences
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_church_id_fkey'
      AND conrelid = 'public.user_preferences'::regclass
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old global unique on user_id.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_user_id_key'
      AND conrelid = 'public.user_preferences'::regclass
  ) THEN
    ALTER TABLE public.user_preferences DROP CONSTRAINT user_preferences_user_id_key;
  END IF;

  -- Add composite unique: one preferences row per user per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_church_id_user_id_key'
      AND conrelid = 'public.user_preferences'::regclass
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_church_id_user_id_key
      UNIQUE (church_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_preferences_church_id
  ON public.user_preferences (church_id);

-- =============================================================================
-- 19. user_permissions
--     Old: UNIQUE(user_id, permission_name, resource, action)
--          constraint: user_permissions_user_id_permission_name_resource_action_key
--     New: UNIQUE(church_id, user_id, permission_name, resource, action)
-- =============================================================================

ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.user_permissions
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.user_permissions
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_permissions_church_id_fkey'
      AND conrelid = 'public.user_permissions'::regclass
  ) THEN
    ALTER TABLE public.user_permissions
      ADD CONSTRAINT user_permissions_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old unique without church_id.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_permissions_user_id_permission_name_resource_action_key'
      AND conrelid = 'public.user_permissions'::regclass
  ) THEN
    ALTER TABLE public.user_permissions
      DROP CONSTRAINT user_permissions_user_id_permission_name_resource_action_key;
  END IF;

  -- Add composite unique with church_id.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_permissions_church_id_user_id_perm_res_act_key'
      AND conrelid = 'public.user_permissions'::regclass
  ) THEN
    ALTER TABLE public.user_permissions
      ADD CONSTRAINT user_permissions_church_id_user_id_perm_res_act_key
      UNIQUE (church_id, user_id, permission_name, resource, action);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_permissions_church_id
  ON public.user_permissions (church_id);

-- =============================================================================
-- 20. live_streams
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.live_streams
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.live_streams
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'live_streams_church_id_fkey'
      AND conrelid = 'public.live_streams'::regclass
  ) THEN
    ALTER TABLE public.live_streams
      ADD CONSTRAINT live_streams_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_streams_church_id
  ON public.live_streams (church_id);

-- =============================================================================
-- 21. discipleship_reports
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.discipleship_reports
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.discipleship_reports
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.discipleship_reports
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_reports_church_id_fkey'
      AND conrelid = 'public.discipleship_reports'::regclass
  ) THEN
    ALTER TABLE public.discipleship_reports
      ADD CONSTRAINT discipleship_reports_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discipleship_reports_church_id
  ON public.discipleship_reports (church_id);

-- =============================================================================
-- 22. discipleship_alerts
--     No unique constraints to change.
-- =============================================================================

ALTER TABLE public.discipleship_alerts
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.discipleship_alerts
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.discipleship_alerts
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_alerts_church_id_fkey'
      AND conrelid = 'public.discipleship_alerts'::regclass
  ) THEN
    ALTER TABLE public.discipleship_alerts
      ADD CONSTRAINT discipleship_alerts_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discipleship_alerts_church_id
  ON public.discipleship_alerts (church_id);

-- =============================================================================
-- 23. discipleship_goals
--     No unique constraints to change (repaired in 20260514000001_goals_repair.sql).
-- =============================================================================

ALTER TABLE public.discipleship_goals
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.discipleship_goals
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.discipleship_goals
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discipleship_goals_church_id_fkey'
      AND conrelid = 'public.discipleship_goals'::regclass
  ) THEN
    ALTER TABLE public.discipleship_goals
      ADD CONSTRAINT discipleship_goals_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discipleship_goals_church_id
  ON public.discipleship_goals (church_id);

-- =============================================================================
-- 24. goal_assignments
--     Existing UNIQUE(goal_id, assigned_to, parent_assignment_id) preserved —
--     scoped to the goal (which already has church_id).
-- =============================================================================

ALTER TABLE public.goal_assignments
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.goal_assignments
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.goal_assignments
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goal_assignments_church_id_fkey'
      AND conrelid = 'public.goal_assignments'::regclass
  ) THEN
    ALTER TABLE public.goal_assignments
      ADD CONSTRAINT goal_assignments_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goal_assignments_church_id
  ON public.goal_assignments (church_id);

-- =============================================================================
-- 25. goal_manual_progress
--     Existing UNIQUE(assignment_id, report_id) preserved — scoped to
--     assignment (which already has church_id set above).
-- =============================================================================

ALTER TABLE public.goal_manual_progress
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.goal_manual_progress
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.goal_manual_progress
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goal_manual_progress_church_id_fkey'
      AND conrelid = 'public.goal_manual_progress'::regclass
  ) THEN
    ALTER TABLE public.goal_manual_progress
      ADD CONSTRAINT goal_manual_progress_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goal_manual_progress_church_id
  ON public.goal_manual_progress (church_id);

-- =============================================================================
-- 26. cell_multiplication_tracking
--     No unique constraints to change (PK only).
-- =============================================================================

ALTER TABLE public.cell_multiplication_tracking
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.cell_multiplication_tracking
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.cell_multiplication_tracking
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cell_multiplication_tracking_church_id_fkey'
      AND conrelid = 'public.cell_multiplication_tracking'::regclass
  ) THEN
    ALTER TABLE public.cell_multiplication_tracking
      ADD CONSTRAINT cell_multiplication_tracking_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cell_multiplication_tracking_church_id
  ON public.cell_multiplication_tracking (church_id);

-- =============================================================================
-- 27. module_user_roles
--     Old: UNIQUE(user_id, module_key)  — constraint: uq_module_user_roles_user_module
--     New: UNIQUE(church_id, user_id, module_key) — role assignments are per church
-- =============================================================================

ALTER TABLE public.module_user_roles
  ADD COLUMN IF NOT EXISTS church_id uuid;

UPDATE public.module_user_roles
SET church_id = '00000000-0000-0000-0000-00000000515e'
WHERE church_id IS NULL;

ALTER TABLE public.module_user_roles
  ALTER COLUMN church_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'module_user_roles_church_id_fkey'
      AND conrelid = 'public.module_user_roles'::regclass
  ) THEN
    ALTER TABLE public.module_user_roles
      ADD CONSTRAINT module_user_roles_church_id_fkey
      FOREIGN KEY (church_id) REFERENCES public.churches(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Drop old unique on (user_id, module_key).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_module_user_roles_user_module'
      AND conrelid = 'public.module_user_roles'::regclass
  ) THEN
    ALTER TABLE public.module_user_roles DROP CONSTRAINT uq_module_user_roles_user_module;
  END IF;

  -- Add composite unique: one role entry per user per module per church.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'module_user_roles_church_id_user_id_module_key'
      AND conrelid = 'public.module_user_roles'::regclass
  ) THEN
    ALTER TABLE public.module_user_roles
      ADD CONSTRAINT module_user_roles_church_id_user_id_module_key
      UNIQUE (church_id, user_id, module_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_module_user_roles_church_id
  ON public.module_user_roles (church_id);

-- =============================================================================
-- Post-migration assertions
--
-- Fails loudly if any Group B table still has NULL church_id rows.
-- =============================================================================
DO $$
DECLARE
  v_null_count integer;
BEGIN
  -- 1. events
  SELECT COUNT(*) INTO v_null_count FROM public.events WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'events has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 2. event_registrations
  SELECT COUNT(*) INTO v_null_count FROM public.event_registrations WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'event_registrations has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 3. music_members
  SELECT COUNT(*) INTO v_null_count FROM public.music_members WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_members has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 4. music_events
  SELECT COUNT(*) INTO v_null_count FROM public.music_events WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_events has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 5. music_assignments
  SELECT COUNT(*) INTO v_null_count FROM public.music_assignments WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_assignments has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 6. music_songs
  SELECT COUNT(*) INTO v_null_count FROM public.music_songs WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_songs has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 7. music_event_songs
  SELECT COUNT(*) INTO v_null_count FROM public.music_event_songs WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_event_songs has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 8. music_unavailability
  SELECT COUNT(*) INTO v_null_count FROM public.music_unavailability WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_unavailability has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 9. music_telegram_files
  SELECT COUNT(*) INTO v_null_count FROM public.music_telegram_files WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_telegram_files has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 10. music_instruments
  SELECT COUNT(*) INTO v_null_count FROM public.music_instruments WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'music_instruments has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 11. reports
  SELECT COUNT(*) INTO v_null_count FROM public.reports WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'reports has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 12. report_generations
  SELECT COUNT(*) INTO v_null_count FROM public.report_generations WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'report_generations has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 13. notifications
  SELECT COUNT(*) INTO v_null_count FROM public.notifications WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'notifications has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 14. audit_logs
  SELECT COUNT(*) INTO v_null_count FROM public.audit_logs WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'audit_logs has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 15. access_denied_logs
  SELECT COUNT(*) INTO v_null_count FROM public.access_denied_logs WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'access_denied_logs has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 16. settings_audit_log
  SELECT COUNT(*) INTO v_null_count FROM public.settings_audit_log WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'settings_audit_log has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 17. user_profiles
  SELECT COUNT(*) INTO v_null_count FROM public.user_profiles WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'user_profiles has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 18. user_preferences
  SELECT COUNT(*) INTO v_null_count FROM public.user_preferences WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'user_preferences has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 19. user_permissions
  SELECT COUNT(*) INTO v_null_count FROM public.user_permissions WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'user_permissions has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 20. live_streams
  SELECT COUNT(*) INTO v_null_count FROM public.live_streams WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'live_streams has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 21. discipleship_reports
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_reports WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_reports has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 22. discipleship_alerts
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_alerts WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_alerts has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 23. discipleship_goals
  SELECT COUNT(*) INTO v_null_count FROM public.discipleship_goals WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'discipleship_goals has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 24. goal_assignments
  SELECT COUNT(*) INTO v_null_count FROM public.goal_assignments WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'goal_assignments has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 25. goal_manual_progress
  SELECT COUNT(*) INTO v_null_count FROM public.goal_manual_progress WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'goal_manual_progress has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 26. cell_multiplication_tracking
  SELECT COUNT(*) INTO v_null_count FROM public.cell_multiplication_tracking WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'cell_multiplication_tracking has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  -- 27. module_user_roles
  SELECT COUNT(*) INTO v_null_count FROM public.module_user_roles WHERE church_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'module_user_roles has % rows with NULL church_id after backfill', v_null_count;
  END IF;

  RAISE NOTICE
    'Phase 2b assertion check passed: all 27 Group B tenant tables have church_id NOT NULL.';
END $$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- =============================================================================
-- Fix: log_user_changes() trigger must include church_id in audit_logs INSERT
-- Added after Phase 2b assertion fix — the trigger was inserting into audit_logs
-- without church_id which now has NOT NULL constraint.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_user_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, changed_by, church_id)
    VALUES ('users', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(), OLD.church_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, changed_by, church_id)
    VALUES ('users', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NEW.church_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by, church_id)
    VALUES ('users', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(), NEW.church_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.log_user_changes() IS 'Logs user changes to audit_logs table including church_id for tenant isolation.';
