-- =============================================================================
-- Migration: 20260904000001_education_lesson_bookmarks.sql
-- Education module — personal lesson bookmarks (small, self-contained
-- follow-up to the 11-slice design-handoff chain).
--
-- Design-handoff gap this closes: README.md line 247 names a "Guardar"
-- (bookmark_border) pill in the lesson viewer header with ZERO behavioral
-- spec beyond the icon/label. PR-E's own header comment (`hooks/use-lesson-
-- font-size.ts`) had assumed bookmark would end up client-local localStorage
-- "like font size" — that assumption is EXPLICITLY SUPERSEDED here per a
-- direct user decision: a bookmark must be visible from a small "Lecciones
-- guardadas" list on StudentHome, which requires server persistence (a
-- localStorage value cannot survive a different device/browser). Entirely
-- independent of education_lesson_progress / education_assignments
-- (completion/progress tracking) — this is a personal "come back to this
-- later" list, not a progress signal.
--
-- Table shape/RLS/GRANT conventions copied verbatim from
-- 20260902000001_education_content_model.sql (tenant_isolation policy shape,
-- FORCE ROW LEVEL SECURITY, GRANT list). Self-only access (a student only
-- ever sees/manages their OWN bookmarks) is enforced at the Go handler layer
-- via an explicit `user_id = caller` predicate on every query — the SAME
-- convention `education_lesson_reflections` already established in that same
-- migration (this codebase has no `app.current_user_id` session variable to
-- express a per-user RLS policy; only `app.current_church_id` exists).
--
-- Idempotent bookmark/unbookmark by construction: the UNIQUE constraint below
-- plus `ON CONFLICT DO NOTHING` in the Go INSERT (never an app-level
-- pre-check) makes a duplicate bookmark attempt a no-op at the DB level.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.education_lesson_bookmarks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  uuid NOT NULL REFERENCES public.churches(id),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_lesson_bookmarks UNIQUE (church_id, user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_education_lesson_bookmarks_user
  ON public.education_lesson_bookmarks (church_id, user_id, created_at DESC);

ALTER TABLE public.education_lesson_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_bookmarks FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_lesson_bookmarks;
  CREATE POLICY tenant_isolation ON public.education_lesson_bookmarks
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, DELETE ON public.education_lesson_bookmarks TO jetro_app;
