-- Phase 0: Repair discipleship_goals schema
-- Add missing columns, fix CHECK constraints, update stale data

BEGIN;

-- 1. Add missing columns referenced by handler
ALTER TABLE discipleship_goals
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS measurement_type TEXT NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id),
  ADD COLUMN IF NOT EXISTS extension_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_deadline DATE,
  ADD COLUMN IF NOT EXISTS extension_reason TEXT,
  ADD COLUMN IF NOT EXISTS extended_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS extended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS closed_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Data migration BEFORE constraint recreation
UPDATE discipleship_goals
  SET goal_type = 'growth'
  WHERE goal_type NOT IN ('growth','attendance','conversions','baptisms','new_groups','multiplications','spiritual_health');

UPDATE discipleship_goals
  SET status = 'active'
  WHERE status NOT IN ('active','completed','overdue','cancelled','pending_review','failed','closed_incomplete');

-- 3. Recreate CHECK constraints
ALTER TABLE discipleship_goals DROP CONSTRAINT IF EXISTS discipleship_goals_goal_type_check;
ALTER TABLE discipleship_goals ADD CONSTRAINT discipleship_goals_goal_type_check
  CHECK (goal_type IN ('growth','attendance','conversions','baptisms','new_groups','multiplications','spiritual_health'));

ALTER TABLE discipleship_goals DROP CONSTRAINT IF EXISTS discipleship_goals_status_check;
ALTER TABLE discipleship_goals ADD CONSTRAINT discipleship_goals_status_check
  CHECK (status IN ('active','completed','overdue','cancelled','pending_review','failed','closed_incomplete'));

ALTER TABLE discipleship_goals DROP CONSTRAINT IF EXISTS discipleship_goals_measurement_type_check;
ALTER TABLE discipleship_goals ADD CONSTRAINT discipleship_goals_measurement_type_check
  CHECK (measurement_type IN ('automatic','manual'));

COMMIT;
