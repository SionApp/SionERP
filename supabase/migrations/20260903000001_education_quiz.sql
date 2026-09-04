-- =============================================================================
-- Migration: 20260903000001_education_quiz.sql
-- Education module — design-handoff expansion, PR-F (quiz backend).
--
-- Highest-risk slice: the 5 tables below back the answer-leak boundary
-- enforced in Go by separate runner/author DTO families
-- (models/education_quiz_runner.go vs models/education_quiz.go).
--
-- Design supersession (carried from sdd/education-module/design, decision
-- A5/A6): education_quiz_attempts.option_order jsonb is the AUTHORITATIVE
-- display-order column. The runner SQL (handlers/education_quiz_runner.go)
-- MUST NOT select education_quiz_options.order_index at all — this closes a
-- real side channel where an author who lists the correct answer first would
-- otherwise leak it via row order. option_order stores
-- {questionId: [optionId, ...]} and is written once per attempt (identity
-- permutation when shuffle_options = false, a real shuffle otherwise).
--
-- uq_education_quiz_options_correct is a PARTIAL UNIQUE INDEX enforcing
-- "exactly one correct option per question" AT THE DATABASE LEVEL — backs up
-- the same invariant UpsertOptions enforces in application code (clear all,
-- then set exactly one true, inside one transaction).
--
-- Never edit 20260831000001_module_gate_church_scope.sql or
-- 20260902000001_education_content_model.sql — this migration is strictly
-- additive on top of both.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. education_quizzes — one row per lesson (1:1, uq_education_quizzes_lesson)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_quizzes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          uuid NOT NULL REFERENCES public.churches(id),
  lesson_id          uuid NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  pass_score         int  NOT NULL DEFAULT 60,
  time_limit_minutes int,
  shuffle_options    boolean NOT NULL DEFAULT true,
  allow_retry        boolean NOT NULL DEFAULT false,
  show_result        boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_quizzes_lesson UNIQUE (lesson_id),
  CONSTRAINT ck_education_quizzes_pass_score CHECK (pass_score BETWEEN 0 AND 100),
  CONSTRAINT ck_education_quizzes_time_limit CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0)
);

ALTER TABLE public.education_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quizzes FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_quizzes;
  CREATE POLICY tenant_isolation ON public.education_quizzes
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_quizzes TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. education_quiz_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid NOT NULL REFERENCES public.churches(id),
  quiz_id       uuid NOT NULL REFERENCES public.education_quizzes(id) ON DELETE CASCADE,
  order_index   int  NOT NULL CHECK (order_index > 0),
  type          text NOT NULL,
  prompt        text NOT NULL,
  points        int  NOT NULL DEFAULT 10 CHECK (points > 0),
  feedback_ok   text,
  feedback_bad  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_quiz_questions_order UNIQUE (quiz_id, order_index)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT ck_education_quiz_questions_type CHECK (type IN ('multiple','true_false','short'))
);
CREATE INDEX IF NOT EXISTS idx_education_quiz_questions_quiz
  ON public.education_quiz_questions (quiz_id, order_index);

ALTER TABLE public.education_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_questions FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_quiz_questions;
  CREATE POLICY tenant_isolation ON public.education_quiz_questions
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_quiz_questions TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. education_quiz_options
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_quiz_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid NOT NULL REFERENCES public.churches(id),
  question_id uuid NOT NULL REFERENCES public.education_quiz_questions(id) ON DELETE CASCADE,
  order_index int  NOT NULL CHECK (order_index > 0),
  text        text NOT NULL,
  is_correct  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_quiz_options_order UNIQUE (question_id, order_index)
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_education_quiz_options_question
  ON public.education_quiz_options (question_id, order_index);
-- Exactly one correct option per question (multiple / true_false). `short`
-- questions never get options at all (app-level invariant, UpsertOptions).
CREATE UNIQUE INDEX IF NOT EXISTS uq_education_quiz_options_correct
  ON public.education_quiz_options (question_id) WHERE is_correct;

ALTER TABLE public.education_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_options FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_quiz_options;
  CREATE POLICY tenant_isolation ON public.education_quiz_options
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_quiz_options TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. education_quiz_attempts — option_order is authoritative for display
--    order (design decision A5/A6, see header comment).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_quiz_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      uuid NOT NULL REFERENCES public.churches(id),
  quiz_id        uuid NOT NULL REFERENCES public.education_quizzes(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_id  uuid REFERENCES public.education_assignments(id) ON DELETE SET NULL,
  attempt_number int  NOT NULL CHECK (attempt_number > 0),
  option_order   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {questionId: [optionId,...]}
  started_at     timestamptz NOT NULL DEFAULT now(),
  submitted_at   timestamptz,
  auto_score     int,
  max_score      int  NOT NULL CHECK (max_score >= 0),
  passed         boolean,
  review_pending boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_quiz_attempts UNIQUE (quiz_id, user_id, attempt_number),
  CONSTRAINT ck_education_quiz_attempts_option_order CHECK (jsonb_typeof(option_order) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_education_quiz_attempts_user
  ON public.education_quiz_attempts (church_id, user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_education_quiz_attempts_review
  ON public.education_quiz_attempts (church_id) WHERE review_pending;

ALTER TABLE public.education_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_attempts FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_quiz_attempts;
  CREATE POLICY tenant_isolation ON public.education_quiz_attempts
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_quiz_attempts TO jetro_app;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. education_quiz_answers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.education_quiz_answers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          uuid NOT NULL REFERENCES public.churches(id),
  attempt_id         uuid NOT NULL REFERENCES public.education_quiz_attempts(id) ON DELETE CASCADE,
  question_id        uuid NOT NULL REFERENCES public.education_quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.education_quiz_options(id) ON DELETE SET NULL,
  text_answer        text,
  is_correct         boolean,
  awarded_points     int,
  reviewed_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  review_note        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_quiz_answers UNIQUE (attempt_id, question_id),
  CONSTRAINT ck_education_quiz_answers_payload CHECK (
    (selected_option_id IS NOT NULL) <> (text_answer IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_education_quiz_answers_attempt
  ON public.education_quiz_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_education_quiz_answers_pending
  ON public.education_quiz_answers (church_id, question_id) WHERE is_correct IS NULL;

ALTER TABLE public.education_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_answers FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_quiz_answers;
  CREATE POLICY tenant_isolation ON public.education_quiz_answers
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_quiz_answers TO jetro_app;
