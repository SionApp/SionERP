-- Migration: 20260624000002_create_jetro_app_role.sql
-- Phase 0 — Non-superuser DB role for RLS enforcement (NOBYPASSRLS).
--
-- Self-hosted Supabase (VPS): create a real LOGIN role with a password.
-- The password MUST be set via psql before deploying:
--   ALTER ROLE jetro_app PASSWORD '<your-secret>';
-- or inject it from a CI/CD secret before running this migration.
--
-- DO NOT enable RLS yet — that is Phase 4. This migration is scaffolding only.
--
-- NOTE: Supabase Cloud fallback — if CREATE ROLE is blocked by the platform,
-- use SET LOCAL ROLE jetro_app instead (see design #292 Q1 fallback path).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jetro_app') THEN
        -- TODO(phase 4): set a real password via CI secret before production cutover
        CREATE ROLE jetro_app LOGIN NOINHERIT NOBYPASSRLS;
    END IF;
END;
$$;

-- Schema usage
GRANT USAGE ON SCHEMA public TO jetro_app;

-- Table DML on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jetro_app;

-- Sequence usage (for serial / bigserial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jetro_app;

-- Default privileges so future tables created in this schema are also covered
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jetro_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO jetro_app;

-- Allow jetro_app to set the tenant GUC.
-- On PG < 15 custom GUCs are settable by any role by default, so this is a no-op there.
-- On PG 16+ it is required.
-- Wrapped in a DO block so it silently skips if not supported.
DO $$
BEGIN
    EXECUTE 'GRANT SET ON PARAMETER app.current_church_id TO jetro_app';
EXCEPTION
    WHEN syntax_error OR feature_not_supported THEN
        -- PG version does not support GRANT SET ON PARAMETER — skip
        NULL;
END;
$$;

-- Allow postgres superuser to SET LOCAL ROLE jetro_app (belt-and-suspenders fallback)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        GRANT jetro_app TO postgres;
    END IF;
END;
$$;
