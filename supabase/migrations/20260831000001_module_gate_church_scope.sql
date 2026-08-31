-- =============================================================================
-- Migration: 20260831000001_module_gate_church_scope.sql
-- Education module — Phase 1 (PR1): church-scoped module gate backfill +
-- education catalog row + education_* schema.
--
-- Context: `middleware.RequireModule` used `SELECT is_installed FROM modules
-- WHERE key = $1`, unscoped, even though `modules`' primary key is
-- (church_id, key) since 20260624000100_phase1_config_singletons.sql. That
-- query returns an arbitrary church's row (whichever Postgres picks), either
-- wrongly granting or wrongly denying access depending on row order. The Go
-- fix lives in apps/backend-go/middleware/module_check.go (this migration
-- only prepares the data so the fixed query has a row to find).
--
-- 1. Backfill: every church gets one `modules` row per known key
--    (ON CONFLICT DO NOTHING — never touches an existing is_installed value).
--    This single statement ALSO seeds the `education` catalog row for every
--    church (not previously present anywhere), always is_installed=false —
--    education is opt-in, not auto-installed, same as zones/events/reports/music.
-- 2. `education_curricula`, `education_lessons`, `education_assignments`,
--    `education_lesson_progress` — full schema now (PR2a/PR3a add the
--    handlers/routes that use them; PR1 only lands the tables so the
--    church-scoped gate and tenant-purge machinery are complete together).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill missing (church_id, key) rows, is_installed=false.
-- ---------------------------------------------------------------------------
INSERT INTO public.modules (church_id, key, name, description, is_installed)
SELECT c.id, m.key, m.name, m.description, false
FROM public.churches c
CROSS JOIN (VALUES
  ('base','Sistema Base','Funcionalidades principales'),
  ('discipleship','Discipulado','Gestión de grupos, jerarquías y reportes'),
  ('zones','Zonas','Gestión de zonas geográficas'),
  ('events','Eventos','Gestión de eventos'),
  ('reports','Reportes','Reportes y analítica'),
  ('music','Música','Equipo de alabanza y repertorio'),
  ('education','Educación','Pénsum, lecciones y progreso')
) AS m(key, name, description)
ON CONFLICT (church_id, key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. education_curricula
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_curricula (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   uuid NOT NULL REFERENCES public.churches(id),
  name        text NOT NULL,
  description text,
  cadence     text NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly','quarterly')),
  status      text NOT NULL DEFAULT 'draft'  CHECK (status IN ('draft','published','archived')),
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_curricula_name UNIQUE (church_id, name)
);

ALTER TABLE public.education_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_curricula FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_curricula;
  CREATE POLICY tenant_isolation ON public.education_curricula
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_curricula TO jetro_app;

-- ---------------------------------------------------------------------------
-- 3. education_lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       uuid NOT NULL REFERENCES public.churches(id),
  curriculum_id   uuid NOT NULL REFERENCES public.education_curricula(id) ON DELETE CASCADE,
  order_index     int  NOT NULL CHECK (order_index > 0),
  title           text NOT NULL,
  content         text,
  attachment_path text,
  attachment_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_lessons_order UNIQUE (curriculum_id, order_index)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT ck_education_lessons_body CHECK (
    NULLIF(btrim(coalesce(content,'')),'') IS NOT NULL
    OR NULLIF(btrim(coalesce(attachment_path,'')),'') IS NOT NULL),
  CONSTRAINT ck_education_lessons_attachment CHECK (
    (attachment_path IS NULL) = (attachment_name IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_education_lessons_curriculum
  ON public.education_lessons (curriculum_id, order_index);

ALTER TABLE public.education_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lessons FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_lessons;
  CREATE POLICY tenant_isolation ON public.education_lessons
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_lessons TO jetro_app;

-- ---------------------------------------------------------------------------
-- 4. education_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid NOT NULL REFERENCES public.churches(id),
  curriculum_id uuid NOT NULL REFERENCES public.education_curricula(id) ON DELETE CASCADE,
  assigned_to   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source_module text CHECK (source_module IN ('discipleship')),
  source_ref_id uuid,
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_assignments UNIQUE (church_id, curriculum_id, assigned_to),
  CONSTRAINT ck_education_assignments_source CHECK (
    (source_module IS NULL) = (source_ref_id IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_education_assignments_user
  ON public.education_assignments (church_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_education_assignments_source
  ON public.education_assignments (church_id, source_module, source_ref_id)
  WHERE source_module IS NOT NULL;

ALTER TABLE public.education_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_assignments FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_assignments;
  CREATE POLICY tenant_isolation ON public.education_assignments
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_assignments TO jetro_app;

-- ---------------------------------------------------------------------------
-- 5. education_lesson_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_lesson_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid NOT NULL REFERENCES public.churches(id),
  assignment_id uuid NOT NULL REFERENCES public.education_assignments(id) ON DELETE CASCADE,
  lesson_id     uuid NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_education_lesson_progress UNIQUE (assignment_id, lesson_id)
);

ALTER TABLE public.education_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_progress FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.education_lesson_progress;
  CREATE POLICY tenant_isolation ON public.education_lesson_progress
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_lesson_progress TO jetro_app;
