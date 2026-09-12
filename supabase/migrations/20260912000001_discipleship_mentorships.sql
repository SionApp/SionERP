-- =============================================================================
-- Migration: 20260912000001_discipleship_mentorships.sql
-- Discipleship Disciple-Maker — Slice 2.
--
-- Adds discipleship_mentorships: a mentor↔mentee link scoped to a single cell
-- group. A discipler (mentor) can have several active mentees at once (no 1:1
-- cardinality), but a mentee can only have ONE active mentor at a time
-- (uq_mentorship_active_mentee). Ending a mentorship sets status='ended' and
-- ended_at — rows are never deleted (audit trail, product decision #579).
--
-- This table is the sole signal journeyStageSQL needs to derive the
-- "disciple_maker" stage (design G3/G5, obs #581): an EXISTS on
-- (mentor_user_id, status='active') added to that query in the same PR — see
-- handlers/discipleship_journey.go.
--
-- One-way dependency: pure Discipulado. Zero Education tables touched.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- discipleship_mentorships
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.discipleship_mentorships (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      uuid        NOT NULL REFERENCES public.churches(id),
  group_id       uuid        NOT NULL REFERENCES public.discipleship_groups(id) ON DELETE CASCADE,
  mentor_user_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentee_user_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_mentor_ne_mentee CHECK (mentor_user_id <> mentee_user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Product decision #579 / spec R2: one active mentor per mentee. A mentor may
-- have several active mentees — only the mentee side is uniquely constrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentorship_active_mentee
  ON public.discipleship_mentorships (church_id, mentee_user_id)
  WHERE status = 'active';

-- journeyStageSQL's EXISTS lookup (mentor_user_id, status='active') — the hot
-- path for stage derivation, run once per journey row.
CREATE INDEX IF NOT EXISTS idx_mentorship_mentor_active
  ON public.discipleship_mentorships (church_id, mentor_user_id)
  WHERE status = 'active';

-- Group-scoped listing (GET /discipleship/groups/:id/mentorships).
CREATE INDEX IF NOT EXISTS idx_mentorship_group
  ON public.discipleship_mentorships (church_id, group_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuse the shared helper already used by every other
-- tenant-scoped table).
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_discipleship_mentorships_updated_at ON public.discipleship_mentorships;
CREATE TRIGGER update_discipleship_mentorships_updated_at
  BEFORE UPDATE ON public.discipleship_mentorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.discipleship_mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_mentorships FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_mentorships;
  CREATE POLICY tenant_isolation ON public.discipleship_mentorships
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleship_mentorships TO jetro_app;
