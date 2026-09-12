-- =============================================================================
-- Migration: 20260902000001_education_content_model_down.sql
-- DOWN migration for 20260902000001_education_content_model.sql (PR-A).
--
-- Reversibility: content/attachment_* are reconstructed from the step-1
-- blocks the UP migration wrote — exact for every lesson that had a body
-- pre-migration (the paragraph/pdf shapes the UP backfill wrote are the exact
-- inverse of what this file reads back). A lesson created AFTER the UP
-- migration that has no step-1 paragraph/pdf block (e.g. an empty draft, or a
-- lesson authored with a heading-only step) gets a placeholder so the
-- restored ck_education_lessons_body constraint can still be satisfied.
--
-- `cadence` is NOT restored — deliberate. This branch has never reached
-- `main`, so `education_lessons.content` here holds only local dev rows;
-- reintroducing a dropped column with a fabricated default would misrepresent
-- data that never existed under the new schema (design "Migration/Rollout").
-- =============================================================================

-- ── storage: revert church-assets whitelist to the pre-education state ──────
DROP POLICY IF EXISTS "Auth users upload branding" ON storage.objects;
CREATE POLICY "Auth users upload branding" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users update branding" ON storage.objects;
CREATE POLICY "Auth users update branding" ON storage.objects FOR UPDATE
USING (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users delete branding" ON storage.objects;
CREATE POLICY "Auth users delete branding" ON storage.objects FOR DELETE
USING (bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'avatars/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL);

-- ── education_lesson_progress: revert lifecycle columns ─────────────────────
ALTER TABLE public.education_lesson_progress
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS visited_step_ids,
  DROP COLUMN IF EXISTS current_step_id;

-- Rows left with completed_at NULL (started-but-not-completed under the new
-- semantics) cannot be represented under the old NOT NULL contract — collapse
-- to now() rather than lose the row.
UPDATE public.education_lesson_progress SET completed_at = now() WHERE completed_at IS NULL;
ALTER TABLE public.education_lesson_progress
  ALTER COLUMN completed_at SET DEFAULT now(),
  ALTER COLUMN completed_at SET NOT NULL;

-- ── education_lessons: restore content/attachment_* from step 1 ─────────────
ALTER TABLE public.education_lessons
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

UPDATE public.education_lessons l
SET content = step1.paragraph_text
FROM (
  SELECT s.lesson_id,
         string_agg(elem->'data'->'doc'->'content'->0->'content'->0->>'text', E'\n')
           AS paragraph_text
  FROM public.education_lesson_steps s,
       LATERAL jsonb_array_elements(s.blocks) elem
  WHERE s.order_index = 1 AND elem->>'type' = 'paragraph'
  GROUP BY s.lesson_id
) step1
WHERE l.id = step1.lesson_id;

UPDATE public.education_lessons l
SET attachment_path = pdf1.path, attachment_name = pdf1.name
FROM (
  SELECT s.lesson_id,
         elem->'data'->>'path' AS path,
         elem->'data'->>'name' AS name
  FROM public.education_lesson_steps s,
       LATERAL jsonb_array_elements(s.blocks) elem
  WHERE s.order_index = 1 AND elem->>'type' = 'pdf'
) pdf1
WHERE l.id = pdf1.lesson_id;

-- Placeholder for lessons with no recoverable step-1 body (created after the
-- UP migration, under the new content model) so the restored NOT-NULL-ish
-- body constraint below does not reject them outright.
UPDATE public.education_lessons
SET content = '(contenido no disponible tras revertir la migración)'
WHERE content IS NULL AND attachment_path IS NULL;

ALTER TABLE public.education_lessons
  ADD CONSTRAINT ck_education_lessons_body CHECK (
    NULLIF(btrim(coalesce(content,'')),'') IS NOT NULL
    OR NULLIF(btrim(coalesce(attachment_path,'')),'') IS NOT NULL),
  ADD CONSTRAINT ck_education_lessons_attachment CHECK (
    (attachment_path IS NULL) = (attachment_name IS NULL));

DROP INDEX IF EXISTS idx_education_lessons_module;
ALTER TABLE public.education_lessons
  DROP CONSTRAINT IF EXISTS ck_education_lessons_duration;
ALTER TABLE public.education_lessons
  DROP COLUMN IF EXISTS duration_minutes,
  DROP COLUMN IF EXISTS module_id;

-- ── education_curricula: revert status + drop catalog metadata ──────────────
ALTER TABLE public.education_curricula DROP CONSTRAINT IF EXISTS ck_education_curricula_status;
UPDATE public.education_curricula SET status = 'draft' WHERE status = 'review';
ALTER TABLE public.education_curricula
  ADD CONSTRAINT education_curricula_status_check
  CHECK (status IN ('draft','published','archived'));

ALTER TABLE public.education_curricula
  DROP CONSTRAINT IF EXISTS ck_education_curricula_track,
  DROP CONSTRAINT IF EXISTS ck_education_curricula_level,
  DROP CONSTRAINT IF EXISTS ck_education_curricula_hours,
  DROP CONSTRAINT IF EXISTS ck_education_curricula_objectives;

ALTER TABLE public.education_curricula
  DROP COLUMN IF EXISTS track,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS hours,
  DROP COLUMN IF EXISTS teacher_user_id,
  DROP COLUMN IF EXISTS cover_path,
  DROP COLUMN IF EXISTS objectives,
  DROP COLUMN IF EXISTS requirements;

-- cadence intentionally NOT restored — see header comment.

-- ── drop the 3 new tables ────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.education_lesson_reflections;
DROP TABLE IF EXISTS public.education_lesson_steps;
DROP TABLE IF EXISTS public.education_course_modules;
