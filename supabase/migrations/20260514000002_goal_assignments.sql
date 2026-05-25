-- Phase 1: Create goal_assignments and goal_manual_progress tables

CREATE TABLE IF NOT EXISTS goal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES discipleship_goals(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_level INT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN target_value = 0 THEN 0
    ELSE ROUND((current_value / target_value) * 100, 2) END
  ) STORED,
  parent_assignment_id UUID REFERENCES goal_assignments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','completed','overdue','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, assigned_to, parent_assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_assignments_goal ON goal_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_assignments_assigned_to ON goal_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_goal_assignments_parent ON goal_assignments(parent_assignment_id);

CREATE TRIGGER update_goal_assignments_updated_at
  BEFORE UPDATE ON goal_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS goal_manual_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES goal_assignments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  report_id UUID REFERENCES discipleship_reports(id) ON DELETE SET NULL,
  value_reported NUMERIC NOT NULL,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_manual_progress_assignment ON goal_manual_progress(assignment_id);
