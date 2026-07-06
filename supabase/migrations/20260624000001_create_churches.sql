-- Migration: 20260624000001_create_churches.sql
-- Phase 0 — Multi-tenancy foundation: churches table + Iglesia Sion seed row.
-- Canonical "Iglesia Sion" UUID: 00000000-0000-0000-0000-00000000515e
-- No FK from other tables yet (that happens in Phases 1-2).

CREATE TABLE IF NOT EXISTS churches (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    slug       text        UNIQUE,          -- subdomain slug, nullable until Phase 4 routing
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the canonical single-tenant church so existing data can be backfilled
-- in later phases. UUID is fixed so migrations can reference it by value.
INSERT INTO churches (id, name, slug, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-00000000515e',
    'Iglesia Sion',
    'sion',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;
