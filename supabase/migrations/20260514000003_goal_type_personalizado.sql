-- Add 'personalizado' goal_type for custom/free-form goals
-- These goals are always manual (no automatic data source)

ALTER TABLE discipleship_goals
  DROP CONSTRAINT IF EXISTS discipleship_goals_goal_type_check;

ALTER TABLE discipleship_goals
  ADD CONSTRAINT discipleship_goals_goal_type_check
    CHECK (goal_type IN (
      'growth', 'attendance', 'conversions', 'baptisms',
      'new_groups', 'multiplications', 'spiritual_health',
      'personalizado'
    ));
