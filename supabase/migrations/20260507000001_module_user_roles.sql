-- ─────────────────────────────────────────────────────────────────────────────
-- module_user_roles
--
-- Tabla genérica que almacena el rol/nivel de un usuario dentro de cada módulo
-- del sistema, INDEPENDIENTE del rol ERP (users.role).
--
-- Propósito:
--   - El rol ERP (pastor, staff, server…) controla acceso al sistema base.
--   - El rol de módulo controla qué puede hacer el usuario DENTRO de ese módulo.
--   - Mañana: módulo de Eventos, Músicos, Transporte → usan la misma tabla.
--
-- Relación con tablas de datos de módulo:
--   - discipleship_hierarchy → datos de discipulado (supervisor, zona, territorio)
--   - module_user_roles       → nivel de acceso del usuario en ese módulo
--   Cuando se asigna jerarquía en discipulado, se hace double-write a ambas tablas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS module_user_roles (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key  VARCHAR(50) NOT NULL,  -- 'discipleship', 'events', 'musicians', etc.
  role_level  INT         NOT NULL CHECK (role_level >= 0),
  role_name   VARCHAR(100),          -- nombre legible: 'Coordinador', 'Líder', etc.
  assigned_by UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_module_user_roles_user_module UNIQUE (user_id, module_key)
);

-- Índices para lookups frecuentes en el middleware
CREATE INDEX IF NOT EXISTS idx_module_user_roles_user_module
  ON module_user_roles (user_id, module_key);

CREATE INDEX IF NOT EXISTS idx_module_user_roles_module_level
  ON module_user_roles (module_key, role_level);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migración de datos existentes: discipleship_hierarchy → module_user_roles
-- ─────────────────────────────────────────────────────────────────────────────

-- Niveles de discipulado (deben coincidir con DiscipleshipLevel* en CONST.go):
--   1 = Líder, 2 = Sup. Auxiliar, 3 = Sup. General, 4 = Coordinador, 5 = Pastoral

INSERT INTO module_user_roles (user_id, module_key, role_level, role_name)
SELECT
  h.user_id,
  'discipleship',
  h.hierarchy_level,
  CASE h.hierarchy_level
    WHEN 1 THEN 'Líder'
    WHEN 2 THEN 'Supervisor Auxiliar'
    WHEN 3 THEN 'Supervisor General'
    WHEN 4 THEN 'Coordinador'
    WHEN 5 THEN 'Pastoral'
    ELSE 'Nivel ' || h.hierarchy_level
  END
FROM discipleship_hierarchy h
WHERE h.user_id IS NOT NULL
ON CONFLICT (user_id, module_key) DO UPDATE
  SET role_level  = EXCLUDED.role_level,
      role_name   = EXCLUDED.role_name,
      updated_at  = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: mantiene updated_at sincronizado automáticamente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_module_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_module_user_roles_updated_at
  BEFORE UPDATE ON module_user_roles
  FOR EACH ROW EXECUTE FUNCTION update_module_user_roles_updated_at();
