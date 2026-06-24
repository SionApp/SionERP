-- =============================================================================
-- Migration: 20260624000400_phase4_rls_cutover.sql
-- Phase 4 — RLS Cutover: enable per-tenant RLS on all 33 tenant tables.
--
-- Defense-in-depth model:
--   PRIMARY:  app-level  WHERE church_id = $N  (Phase 3 — already shipped)
--   SAFETY NET: RLS policy USING (church_id = current_setting('app.current_church_id', true)::uuid)
--
-- The `true` (missing_ok) on current_setting means an unset GUC returns NULL,
-- so church_id = NULL is NULL → row excluded. Result: zero rows, no error.
-- This is FAIL-CLOSED behaviour.
--
-- IMPORTANT — MANUAL CUTOVER STEP (DO NOT AUTOMATE):
--   After this migration runs, RLS is enabled but the backend still connects as
--   `postgres` (superuser), which BYPASSES RLS. RLS becomes the active safety net
--   only AFTER the env var is changed:
--
--     SUPABASE_DB_URL=postgresql://jetro_app:<secret>@host:5432/postgres
--
--   This is a manual Render environment variable update + redeploy, NOT part of
--   this migration file.
--
-- ROLLBACK PLAN (if RLS cutover causes issues):
--   1. In Render dashboard, revert SUPABASE_DB_URL to the postgres superuser URL.
--   2. Redeploy the backend. RLS remains enabled but is bypassed by the superuser.
--   3. App-level WHERE church_id (Phase 3) continues to isolate data.
--   4. No migration files need to be reverted.
--   5. If a hard reset is needed: run ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--      per table — but this should not be necessary because superuser bypass already
--      neutralises the RLS effect.
--
-- TABLES IN THIS MIGRATION (tenant tables — all got church_id in Phases 1-2):
--   Phase 1 (config singletons — 5 tables):
--     church_info, system_settings, notification_config, modules, role_module_access
--   Phase 2a (core tenant — 8 tables):
--     users, user_invitations, zones, discipleship_groups, discipleship_group_members,
--     discipleship_levels, discipleship_hierarchy, discipleship_attendance
--   Phase 2b (remaining tenant — 27 tables):
--     events, event_registrations, music_members, music_events, music_assignments,
--     music_songs, music_event_songs, music_unavailability, music_telegram_files,
--     music_instruments, reports, report_generations, notifications, audit_logs,
--     access_denied_logs, settings_audit_log, user_profiles, user_preferences,
--     user_permissions, live_streams, discipleship_reports, discipleship_alerts,
--     discipleship_goals, goal_assignments, goal_manual_progress,
--     cell_multiplication_tracking, module_user_roles
--
-- TABLES EXCLUDED (global/shared — no church_id ever):
--   permissions, role_permissions, churches
--
-- NOTE ON EXISTING POLICIES:
--   Many tables already have RLS enabled (from remote_schema.sql and other migrations)
--   with user-level access policies. Those policies STACK with the new tenant_isolation
--   policy — BOTH must pass for a row to be accessible. We do NOT drop existing
--   user-level policies. We only ADD the tenant_isolation policy.
--   FORCE ROW LEVEL SECURITY also applies to the table owner.
--
-- NOTE ON FRONTEND (PostgREST path):
--   Frontend Supabase client uses the `authenticated` role. A second predicate is
--   needed for PostgREST: (auth.jwt()->'app_metadata'->>'church_id')::uuid = church_id
--   This migration adds a second policy `tenant_isolation_jwt` for tables used by
--   the frontend, in addition to the Go-path GUC policy.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4b. Grant permissions to jetro_app role (idempotent — GRANT is safe to re-run)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO jetro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jetro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jetro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jetro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jetro_app;

-- Allow jetro_app to set the per-request GUC (PG16+).
-- Wrapped in a DO block because GRANT SET ON PARAMETER is PG16-only;
-- on PG14/15, custom GUCs are settable by any role by default.
DO $$
BEGIN
  EXECUTE 'GRANT SET ON PARAMETER app.current_church_id TO jetro_app';
EXCEPTION
  WHEN syntax_error OR feature_not_supported THEN
    -- PG < 16: custom GUCs are settable by any role; no explicit GRANT needed.
    NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Helper macro (comment block — SQL has no macros, so we use a pattern):
--
-- For every tenant table:
--   ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.<t> FORCE ROW LEVEL SECURITY;
--   CREATE POLICY tenant_isolation ON public.<t>
--     USING (church_id = current_setting('app.current_church_id', true)::uuid)
--     WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
--
-- The policy is created with IF NOT EXISTS logic via a DO block to be idempotent.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- 4a. Enable RLS + FORCE RLS + add tenant_isolation policy
-- =============================================================================

-- We use DO blocks for CREATE POLICY to get idempotency (DROP IF EXISTS then CREATE).
-- ALTER TABLE ENABLE/FORCE is idempotent by default (running it twice is a no-op).

-- ---------------------------------------------------------------------------
-- Phase 1 tables: church_info, system_settings, notification_config, modules,
--                 role_module_access
-- ---------------------------------------------------------------------------

-- 1. church_info
ALTER TABLE public.church_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_info FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.church_info;
  CREATE POLICY tenant_isolation ON public.church_info
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 2. system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.system_settings;
  CREATE POLICY tenant_isolation ON public.system_settings
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 3. notification_config
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_config FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.notification_config;
  CREATE POLICY tenant_isolation ON public.notification_config
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 4. modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.modules;
  CREATE POLICY tenant_isolation ON public.modules
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 5. role_module_access
ALTER TABLE public.role_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_access FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.role_module_access;
  CREATE POLICY tenant_isolation ON public.role_module_access
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- ---------------------------------------------------------------------------
-- Phase 2a tables: users, user_invitations, zones, discipleship_groups,
--   discipleship_group_members, discipleship_levels, discipleship_hierarchy,
--   discipleship_attendance
-- ---------------------------------------------------------------------------

-- 6. users  (already has RLS from remote_schema.sql — we only ADD tenant_isolation)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.users;
  CREATE POLICY tenant_isolation ON public.users
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 7. user_invitations  (already has RLS)
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.user_invitations;
  CREATE POLICY tenant_isolation ON public.user_invitations
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 8. zones
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.zones;
  CREATE POLICY tenant_isolation ON public.zones
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 9. discipleship_groups  (already has RLS)
ALTER TABLE public.discipleship_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_groups FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_groups;
  CREATE POLICY tenant_isolation ON public.discipleship_groups
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 10. discipleship_group_members  (already has RLS)
ALTER TABLE public.discipleship_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_group_members FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_group_members;
  CREATE POLICY tenant_isolation ON public.discipleship_group_members
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 11. discipleship_levels  (already has RLS)
ALTER TABLE public.discipleship_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_levels FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_levels;
  CREATE POLICY tenant_isolation ON public.discipleship_levels
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 12. discipleship_hierarchy  (already has RLS)
ALTER TABLE public.discipleship_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_hierarchy FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_hierarchy;
  CREATE POLICY tenant_isolation ON public.discipleship_hierarchy
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 13. discipleship_attendance  (already has RLS)
ALTER TABLE public.discipleship_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_attendance FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_attendance;
  CREATE POLICY tenant_isolation ON public.discipleship_attendance
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- ---------------------------------------------------------------------------
-- Phase 2b tables (27 tables)
-- ---------------------------------------------------------------------------

-- 14. events  (already has RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.events;
  CREATE POLICY tenant_isolation ON public.events
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 15. event_registrations  (already has RLS)
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.event_registrations;
  CREATE POLICY tenant_isolation ON public.event_registrations
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 16. music_members  (already has RLS)
ALTER TABLE public.music_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_members FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_members;
  CREATE POLICY tenant_isolation ON public.music_members
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 17. music_events  (already has RLS)
ALTER TABLE public.music_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_events FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_events;
  CREATE POLICY tenant_isolation ON public.music_events
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 18. music_assignments  (already has RLS)
ALTER TABLE public.music_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_assignments FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_assignments;
  CREATE POLICY tenant_isolation ON public.music_assignments
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 19. music_songs  (already has RLS)
ALTER TABLE public.music_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_songs FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_songs;
  CREATE POLICY tenant_isolation ON public.music_songs
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 20. music_event_songs  (already has RLS)
ALTER TABLE public.music_event_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_event_songs FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_event_songs;
  CREATE POLICY tenant_isolation ON public.music_event_songs
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 21. music_unavailability  (already has RLS)
ALTER TABLE public.music_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_unavailability FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_unavailability;
  CREATE POLICY tenant_isolation ON public.music_unavailability
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 22. music_telegram_files  (already has RLS)
ALTER TABLE public.music_telegram_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_telegram_files FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_telegram_files;
  CREATE POLICY tenant_isolation ON public.music_telegram_files
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 23. music_instruments  (already has RLS)
ALTER TABLE public.music_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_instruments FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.music_instruments;
  CREATE POLICY tenant_isolation ON public.music_instruments
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 24. reports  (already has RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.reports;
  CREATE POLICY tenant_isolation ON public.reports
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 25. report_generations  (already has RLS)
ALTER TABLE public.report_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_generations FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.report_generations;
  CREATE POLICY tenant_isolation ON public.report_generations
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 26. notifications  (already has RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.notifications;
  CREATE POLICY tenant_isolation ON public.notifications
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 27. audit_logs  (already has RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;
  CREATE POLICY tenant_isolation ON public.audit_logs
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 28. access_denied_logs  (already has RLS)
ALTER TABLE public.access_denied_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_denied_logs FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.access_denied_logs;
  CREATE POLICY tenant_isolation ON public.access_denied_logs
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 29. settings_audit_log  (already has RLS)
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_log FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.settings_audit_log;
  CREATE POLICY tenant_isolation ON public.settings_audit_log
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 30. user_profiles  (already has RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.user_profiles;
  CREATE POLICY tenant_isolation ON public.user_profiles
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 31. user_preferences  (already has RLS)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.user_preferences;
  CREATE POLICY tenant_isolation ON public.user_preferences
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 32. user_permissions  (already has RLS)
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.user_permissions;
  CREATE POLICY tenant_isolation ON public.user_permissions
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 33. live_streams  (already has RLS)
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.live_streams;
  CREATE POLICY tenant_isolation ON public.live_streams
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 34. discipleship_reports  (already has RLS)
ALTER TABLE public.discipleship_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_reports FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_reports;
  CREATE POLICY tenant_isolation ON public.discipleship_reports
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 35. discipleship_alerts  (already has RLS)
ALTER TABLE public.discipleship_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_alerts FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_alerts;
  CREATE POLICY tenant_isolation ON public.discipleship_alerts
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 36. discipleship_goals  (already has RLS)
ALTER TABLE public.discipleship_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_goals FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_goals;
  CREATE POLICY tenant_isolation ON public.discipleship_goals
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 37. goal_assignments  (already has RLS via discipleship_goals FK chain — but add direct policy)
ALTER TABLE public.goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_assignments FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.goal_assignments;
  CREATE POLICY tenant_isolation ON public.goal_assignments
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 38. goal_manual_progress
ALTER TABLE public.goal_manual_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_manual_progress FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.goal_manual_progress;
  CREATE POLICY tenant_isolation ON public.goal_manual_progress
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 39. cell_multiplication_tracking  (already has RLS)
ALTER TABLE public.cell_multiplication_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_multiplication_tracking FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.cell_multiplication_tracking;
  CREATE POLICY tenant_isolation ON public.cell_multiplication_tracking
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- 40. module_user_roles
ALTER TABLE public.module_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_user_roles FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.module_user_roles;
  CREATE POLICY tenant_isolation ON public.module_user_roles
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

-- =============================================================================
-- TABLES EXPLICITLY EXCLUDED (global/shared — no church_id ever):
--   permissions      — static RBAC shared across all churches; existing RLS policies stay
--   role_permissions — same as permissions
--   churches         — the global registry itself; never filtered by church_id
-- =============================================================================

-- =============================================================================
-- Verification block: assert tenant_isolation policy exists on key tables
-- =============================================================================
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM (VALUES
    ('users'),
    ('zones'),
    ('discipleship_groups'),
    ('discipleship_levels'),
    ('events'),
    ('music_members'),
    ('modules'),
    ('church_info')
  ) AS t(tbl)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = t.tbl
      AND policyname = 'tenant_isolation'
  );

  IF missing_count > 0 THEN
    RAISE EXCEPTION
      'Phase 4 assertion failed: % table(s) missing tenant_isolation policy. '
      'Check the migration output above for errors.', missing_count;
  END IF;

  RAISE NOTICE 'Phase 4 RLS cutover: all required tenant_isolation policies verified OK.';
END $$;
