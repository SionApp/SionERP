-- =============================================================================
-- Migration: 20260903000001_education_quiz_down.sql
-- DOWN migration for 20260903000001_education_quiz.sql (PR-F).
--
-- Reversibility: drops all 5 quiz tables. No data outside them is touched
-- (design "Migration/Rollout": "DOWN drops the 5 quiz tables. No data outside
-- them is touched."). Nothing from this branch has reached `main`, so this is
-- a pure schema rollback, not a production-data-loss concern.
-- =============================================================================

DROP TABLE IF EXISTS public.education_quiz_answers;
DROP TABLE IF EXISTS public.education_quiz_attempts;
DROP TABLE IF EXISTS public.education_quiz_options;
DROP TABLE IF EXISTS public.education_quiz_questions;
DROP TABLE IF EXISTS public.education_quizzes;
