-- =============================================================================
-- Migration: 20260902000001_education_content_model.sql
-- Education module — design-handoff expansion, PR-A (schema foundation).
--
-- Three moves:
--   1. New tables: education_course_modules, education_lesson_steps,
--      education_lesson_reflections — content becomes step/block data instead
--      of a single `text` column on education_lessons.
--   2. education_curricula gains catalog metadata (track/level/hours/teacher/
--      cover/objectives/requirements) and a 4th status value ('review').
--      `cadence` is dropped — the only deletion in the plan (spec:
--      "Cadence is descriptive", superseded by track+level+hours).
--   3. education_lesson_progress gains a started/completed lifecycle:
--      `completed_at` is relaxed to nullable (row presence now means
--      STARTED, not completed — spec education-assignments DELTA), plus a
--      server-persisted step pointer (`current_step_id`/`visited_step_ids`,
--      NOT an int ordinal — design decision A2/A3, since an ordinal cannot
--      survive a lesson-step reorder).
--
-- `content`/`attachment_path`/`attachment_name` are backfilled into a step-1
-- row BEFORE being dropped — lossless for every lesson that had a body (every
-- pre-migration lesson, since the dropped `ck_education_lessons_body`
-- required at least one of the two to be non-empty).
--
-- Never edit 20260831000001_module_gate_church_scope.sql — this migration is
-- strictly additive/backfilling on top of it.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. education_course_modules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_course_modules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid NOT NULL REFERENCES public.churches(id),
  curriculum_id uuid NOT NULL REFERENCES public.education_curricula(id) ON DELETE CASCADE,
  order_index   int  NOT NULL CHECK (order_index > 0),
  title         text NOT NULL,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_course_modules_order UNIQUE (curriculum_id, order_index)
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_education_course_modules_curriculum
  ON public.education_course_modules (curriculum_id, order_index);

ALTER TABLE public.education_course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_course_modules FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_course_modules;
  CREATE POLICY tenant_isolation ON public.education_course_modules
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_course_modules TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. education_lesson_steps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_lesson_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid NOT NULL REFERENCES public.churches(id),
  lesson_id   uuid NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  order_index int  NOT NULL CHECK (order_index > 0),
  label       text NOT NULL,
  blocks      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_lesson_steps_order UNIQUE (lesson_id, order_index)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT ck_education_lesson_steps_blocks CHECK (jsonb_typeof(blocks) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_education_lesson_steps_lesson
  ON public.education_lesson_steps (lesson_id, order_index);

ALTER TABLE public.education_lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_steps FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_lesson_steps;
  CREATE POLICY tenant_isolation ON public.education_lesson_steps
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_lesson_steps TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. education_lesson_reflections
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_lesson_reflections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  uuid NOT NULL REFERENCES public.churches(id),
  lesson_id  uuid NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  block_id   text NOT NULL,          -- lives inside steps.blocks jsonb; Go validates
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_lesson_reflections UNIQUE (lesson_id, block_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_education_lesson_reflections_user
  ON public.education_lesson_reflections (church_id, user_id);

ALTER TABLE public.education_lesson_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_reflections FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_lesson_reflections;
  CREATE POLICY tenant_isolation ON public.education_lesson_reflections
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_lesson_reflections TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. education_curricula — catalog metadata + review status
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.education_curricula
  ADD COLUMN IF NOT EXISTS track           text,
  ADD COLUMN IF NOT EXISTS level           text,
  ADD COLUMN IF NOT EXISTS hours           numeric(4,1),
  ADD COLUMN IF NOT EXISTS teacher_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_path      text,
  ADD COLUMN IF NOT EXISTS objectives      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements    text;

ALTER TABLE public.education_curricula
  ADD CONSTRAINT ck_education_curricula_track CHECK (
    track IS NULL OR track IN ('discipulado','servicio','liderazgo','familia','formacion')),
  ADD CONSTRAINT ck_education_curricula_level CHECK (level IS NULL OR level IN ('I','II','III')),
  ADD CONSTRAINT ck_education_curricula_hours CHECK (hours IS NULL OR hours >= 0),
  ADD CONSTRAINT ck_education_curricula_objectives CHECK (jsonb_typeof(objectives) = 'array');

-- Drop BOTH the Postgres-generated inline name and the ck_ name before
-- adding, so a peer DB created under either name converges (design part2,
-- Open Questions — manually verified in PR-A: the live 20260831000001 inline
-- CHECK generates `education_curricula_status_check`).
ALTER TABLE public.education_curricula DROP CONSTRAINT IF EXISTS education_curricula_status_check;
ALTER TABLE public.education_curricula DROP CONSTRAINT IF EXISTS ck_education_curricula_status;
ALTER TABLE public.education_curricula
  ADD CONSTRAINT ck_education_curricula_status
  CHECK (status IN ('draft','review','published','archived'));

ALTER TABLE public.education_curricula DROP CONSTRAINT IF EXISTS education_curricula_cadence_check;
ALTER TABLE public.education_curricula DROP COLUMN IF EXISTS cadence;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. education_lessons — modules, duration, content→steps backfill, then drop
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.education_lessons
  ADD COLUMN IF NOT EXISTS module_id uuid
    REFERENCES public.education_course_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes int;
ALTER TABLE public.education_lessons
  ADD CONSTRAINT ck_education_lessons_duration
  CHECK (duration_minutes IS NULL OR duration_minutes > 0);
CREATE INDEX IF NOT EXISTS idx_education_lessons_module
  ON public.education_lessons (module_id) WHERE module_id IS NOT NULL;

-- Backfill step 1 from the legacy columns BEFORE dropping them.
INSERT INTO public.education_lesson_steps (church_id, lesson_id, order_index, label, blocks)
SELECT l.church_id, l.id, 1, 'Contenido',
       (COALESCE(
          CASE WHEN NULLIF(btrim(COALESCE(l.content,'')),'') IS NOT NULL
               THEN jsonb_build_array(jsonb_build_object(
                      'id', gen_random_uuid()::text,
                      'type','paragraph',
                      'data', jsonb_build_object('doc', jsonb_build_object(
                        'type','doc','content', jsonb_build_array(jsonb_build_object(
                          'type','paragraph','content', jsonb_build_array(jsonb_build_object(
                            'type','text','text', l.content))))))))
               ELSE '[]'::jsonb END, '[]'::jsonb)
        ||
        COALESCE(
          CASE WHEN NULLIF(btrim(COALESCE(l.attachment_path,'')),'') IS NOT NULL
               THEN jsonb_build_array(jsonb_build_object(
                      'id', gen_random_uuid()::text,
                      'type','pdf',
                      'data', jsonb_build_object(
                        'path', l.attachment_path,
                        'name', COALESCE(l.attachment_name,'Adjunto'),
                        'sizeBytes', 0)))
               ELSE '[]'::jsonb END, '[]'::jsonb))
FROM public.education_lessons l
WHERE (NULLIF(btrim(COALESCE(l.content,'')),'') IS NOT NULL
       OR NULLIF(btrim(COALESCE(l.attachment_path,'')),'') IS NOT NULL)
  -- Idempotency guard via NOT EXISTS rather than ON CONFLICT: the target
  -- uniqueness constraint (uq_education_lesson_steps_order) is intentionally
  -- DEFERRABLE INITIALLY DEFERRED (needed later for atomic step reorders),
  -- and Postgres does not allow a deferrable constraint as an ON CONFLICT
  -- arbiter ("ON CONFLICT does not support deferrable unique constraints...
  -- as arbiters"). NOT EXISTS sidesteps that entirely and is safe to re-run.
  AND NOT EXISTS (
    SELECT 1 FROM public.education_lesson_steps s
    WHERE s.lesson_id = l.id AND s.order_index = 1
  );

ALTER TABLE public.education_lessons DROP CONSTRAINT IF EXISTS ck_education_lessons_body;
ALTER TABLE public.education_lessons DROP CONSTRAINT IF EXISTS ck_education_lessons_attachment;
ALTER TABLE public.education_lessons
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS attachment_path,
  DROP COLUMN IF EXISTS attachment_name;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. education_lesson_progress — started/completed lifecycle
-- ─────────────────────────────────────────────────────────────────────────────
-- completed_at ALREADY EXISTS (timestamptz NOT NULL DEFAULT now()); it is
-- relaxed, not added. Verified against 20260831000001 lines 145-152.
ALTER TABLE public.education_lesson_progress
  ALTER COLUMN completed_at DROP NOT NULL,
  ALTER COLUMN completed_at DROP DEFAULT;
ALTER TABLE public.education_lesson_progress
  ADD COLUMN IF NOT EXISTS current_step_id   uuid
    REFERENCES public.education_lesson_steps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visited_step_ids  uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS started_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_education_lesson_progress_activity
  ON public.education_lesson_progress (church_id, updated_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. storage: course covers on the PUBLIC church-assets bucket
-- ─────────────────────────────────────────────────────────────────────────────
-- Extends 20260826000002's whitelist (which itself extended 20260701000003's).
-- All three policies rewritten in full (INSERT/UPDATE keep logos|banners|
-- events; DELETE also keeps avatars). Landed here even though the cover-
-- upload UI does not ship until PR-H — shipping the UI first would produce a
-- silent RLS failure on upload rather than a visible error (design's
-- "Ordering constraint that must not be reordered").
DROP POLICY IF EXISTS "Auth users upload branding" ON storage.objects;
CREATE POLICY "Auth users upload branding" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%'
       OR name LIKE 'education/%')
  AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users update branding" ON storage.objects;
CREATE POLICY "Auth users update branding" ON storage.objects FOR UPDATE
USING (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%'
       OR name LIKE 'education/%')
  AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users delete branding" ON storage.objects;
CREATE POLICY "Auth users delete branding" ON storage.objects FOR DELETE
USING (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'avatars/%'
       OR name LIKE 'events/%' OR name LIKE 'education/%')
  AND auth.uid() IS NOT NULL);
