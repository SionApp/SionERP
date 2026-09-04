-- =============================================================================
-- Migration: 20260904000001_education_lesson_bookmarks_down.sql
-- DOWN migration for 20260904000001_education_lesson_bookmarks.sql.
--
-- Reversibility: drops the one new table. No data outside it is touched —
-- same "pure schema rollback, no production-data-loss concern" framing as
-- 20260903000001_education_quiz_down.sql (nothing from this branch has
-- reached `main`).
-- =============================================================================

DROP TABLE IF EXISTS public.education_lesson_bookmarks;
