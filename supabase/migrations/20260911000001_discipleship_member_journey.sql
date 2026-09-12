-- =============================================================================
-- Migration: 20260911000001_discipleship_member_journey.sql
-- Discipleship Member Journey — Slice 1 (backbone).
--
-- Adds the church-level "conversion path" curriculum pointer and the journey
-- anchor table (one row per converted/manually-entered member). Stage
-- (new_convert / disciple / disciple_maker) is DERIVED at read time from this
-- anchor plus education_assignments — never stored (design D2). Activity
-- (active/inactive) IS stored and leader-marked, orthogonal to stage.
--
-- One-way dependency: Discipleship reads Education; Education gains zero
-- knowledge of Discipleship. The only touch to an Education table is the
-- additive partial unique index below (G1) — safe because nothing writes
-- source_module='discipleship' into education_assignments today.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. discipleship_settings — one nullable curriculum pointer per church
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discipleship_settings (
  church_id                     uuid        PRIMARY KEY REFERENCES public.churches(id),
  conversion_path_curriculum_id uuid        REFERENCES public.education_curricula(id) ON DELETE SET NULL,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. discipleship_journey — the anchor. Exactly one row per (church, user).
--
-- origin records which door created the anchor ('conversion' vs 'manual');
-- converted_at is set only by the conversion door (NULL for manual entries).
-- activity_status/activity_changed_at are the orthogonal, leader-marked axis
-- (product decision r2: marked by the leader, NOT derived from attendance —
-- discipleship_attendance is keyed by group_id, so a manually-anchored convert
-- with no group would read as permanently inactive under a derived model).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discipleship_journey (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id            uuid        NOT NULL REFERENCES public.churches(id),
  user_id              uuid        NOT NULL REFERENCES public.users(id),
  origin               text        NOT NULL CHECK (origin IN ('conversion', 'manual')),
  activity_status      text        NOT NULL DEFAULT 'active'
                       CHECK (activity_status IN ('active', 'inactive')),
  activity_changed_at  timestamptz NOT NULL DEFAULT now(),
  converted_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_discipleship_journey_user UNIQUE (church_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Leader-facing activity filters (e.g. "who went inactive").
CREATE INDEX IF NOT EXISTS idx_discipleship_journey_activity
  ON public.discipleship_journey (church_id, activity_status);

-- Per-church anchor listing (Slice 2 rollups/reporting; batch reads by
-- user_ids are already served by the uq_discipleship_journey_user index).
CREATE INDEX IF NOT EXISTS idx_discipleship_journey_church
  ON public.discipleship_journey (church_id);

-- Conversion-date reporting (partial: converted_at is NULL for manual-door
-- anchors, so only conversion-origin rows are indexed).
CREATE INDEX IF NOT EXISTS idx_discipleship_journey_converted_at
  ON public.discipleship_journey (church_id, converted_at)
  WHERE converted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- G1 — one tagged path assignment per journey, enforced structurally.
--
-- Additive index on an EDUCATION table — the single, justified exception to
-- "no Education schema touched" (design G1). Prevents a second
-- education_assignments row tagged to the same journey (e.g. re-converted
-- under a swapped curriculum pointer), which would make journeyStageSQL
-- return two rows for one member. Safe to create today: nothing writes
-- source_module='discipleship' yet, so it cannot conflict with existing data.
-- If a future slice wants a multi-course path per journey, that slice must
-- drop this index explicitly.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_education_assignments_journey_ref
  ON public.education_assignments (church_id, source_ref_id)
  WHERE source_module = 'discipleship';

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse the shared helper already used by every other
-- tenant-scoped table).
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_discipleship_settings_updated_at ON public.discipleship_settings;
CREATE TRIGGER update_discipleship_settings_updated_at
  BEFORE UPDATE ON public.discipleship_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_discipleship_journey_updated_at ON public.discipleship_journey;
CREATE TRIGGER update_discipleship_journey_updated_at
  BEFORE UPDATE ON public.discipleship_journey
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.discipleship_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_settings FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_settings;
  CREATE POLICY tenant_isolation ON public.discipleship_settings
    USING (
      church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
      church_id = current_setting('app.current_church_id', true)::uuid
    );
END $$;

ALTER TABLE public.discipleship_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_journey FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_journey;
  CREATE POLICY tenant_isolation ON public.discipleship_journey
    USING (
      church_id = current_setting('app.current_church_id', true)::uuid
    )
    WITH CHECK (
      church_id = current_setting('app.current_church_id', true)::uuid
    );
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleship_settings TO jetro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleship_journey TO jetro_app;
