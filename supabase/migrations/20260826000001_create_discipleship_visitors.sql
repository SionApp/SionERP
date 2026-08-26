-- =============================================================================
-- Migration: 20260826000001_create_discipleship_visitors.sql
-- Ficha real de visitante (issue #40): hasta ahora "visitantes" solo era un
-- contador agregado (report_data->>'attendance_friends') sin ninguna ficha ni
-- seguimiento. Esta tabla registra cada visitante individual, quién lo invitó,
-- y su estado de seguimiento hasta que se convierte en miembro (o no).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discipleship_visitors (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         uuid        NOT NULL REFERENCES public.churches(id),
  group_id          uuid        REFERENCES public.discipleship_groups(id),
  first_name        text        NOT NULL,
  last_name         text        NOT NULL DEFAULT '',
  phone             text,
  invited_by        uuid        REFERENCES public.users(id),
  first_visit_date  date        NOT NULL DEFAULT CURRENT_DATE,
  status            text        NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'following_up', 'converted', 'inactive')),
  converted_user_id uuid        REFERENCES public.users(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_discipleship_visitors_group
  ON public.discipleship_visitors (church_id, group_id);

CREATE INDEX IF NOT EXISTS idx_discipleship_visitors_status
  ON public.discipleship_visitors (church_id, status);

-- ---------------------------------------------------------------------------
-- updated_at trigger (mismo helper que ya usan el resto de las tablas)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_discipleship_visitors_updated_at ON public.discipleship_visitors;
CREATE TRIGGER update_discipleship_visitors_updated_at
  BEFORE UPDATE ON public.discipleship_visitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.discipleship_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipleship_visitors FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.discipleship_visitors;
  CREATE POLICY tenant_isolation ON public.discipleship_visitors
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleship_visitors TO jetro_app;
