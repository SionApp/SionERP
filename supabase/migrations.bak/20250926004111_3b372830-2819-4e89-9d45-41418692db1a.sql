-- Agregar campos de trazabilidad avanzada para discipleship_metrics
ALTER TABLE discipleship_metrics 
ADD COLUMN week_number INTEGER,
ADD COLUMN month_year TEXT,
ADD COLUMN conversions INTEGER DEFAULT 0,
ADD COLUMN baptisms INTEGER DEFAULT 0,
ADD COLUMN first_time_visitors INTEGER DEFAULT 0,
ADD COLUMN cells_multiplied INTEGER DEFAULT 0,
ADD COLUMN leaders_trained INTEGER DEFAULT 0,
ADD COLUMN offering_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN special_events INTEGER DEFAULT 0;

-- Agregar índices para consultas de analytics
CREATE INDEX idx_discipleship_metrics_week_date ON discipleship_metrics(week_date);
CREATE INDEX idx_discipleship_metrics_group_id_date ON discipleship_metrics(group_id, week_date);
CREATE INDEX idx_discipleship_metrics_month_year ON discipleship_metrics(month_year);

-- Crear tabla para metas de discipulado
CREATE TABLE discipleship_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('annual', 'quarterly', 'monthly')),
  target_metric TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  deadline DATE NOT NULL,
  zone_name TEXT,
  supervisor_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para discipleship_goals
ALTER TABLE discipleship_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para discipleship_goals
CREATE POLICY "Users can view accessible goals" 
ON discipleship_goals 
FOR SELECT 
USING (
  supervisor_id IS NULL OR 
  can_access_user(supervisor_id) OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

CREATE POLICY "Pastor and staff can manage goals" 
ON discipleship_goals 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

-- Crear tabla para alertas de discipulado
CREATE TABLE discipleship_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'warning', 'info', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_group_id UUID,
  related_user_id UUID,
  zone_name TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para discipleship_alerts
ALTER TABLE discipleship_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para discipleship_alerts
CREATE POLICY "Users can view their alerts" 
ON discipleship_alerts 
FOR SELECT 
USING (
  related_user_id = auth.uid() OR
  can_access_user(related_user_id) OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

CREATE POLICY "Pastor and staff can manage alerts" 
ON discipleship_alerts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

-- Crear tabla para tracking de multiplicación de células
CREATE TABLE cell_multiplication_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_group_id UUID NOT NULL,
  new_group_id UUID,
  multiplication_date DATE NOT NULL,
  new_leader_id UUID,
  parent_leader_id UUID NOT NULL,
  initial_members INTEGER DEFAULT 0,
  multiplication_type TEXT DEFAULT 'standard' CHECK (multiplication_type IN ('standard', 'planned', 'emergency')),
  success_status TEXT DEFAULT 'planned' CHECK (success_status IN ('planned', 'successful', 'struggling', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para cell_multiplication_tracking
ALTER TABLE cell_multiplication_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas para cell_multiplication_tracking
CREATE POLICY "Users can view accessible multiplication records" 
ON cell_multiplication_tracking 
FOR SELECT 
USING (
  can_access_user(parent_leader_id) OR 
  can_access_user(new_leader_id) OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

CREATE POLICY "Pastor and staff can manage multiplication tracking" 
ON cell_multiplication_tracking 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('pastor', 'staff')
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_discipleship_goals_updated_at
  BEFORE UPDATE ON discipleship_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discipleship_alerts_updated_at
  BEFORE UPDATE ON discipleship_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cell_multiplication_tracking_updated_at
  BEFORE UPDATE ON cell_multiplication_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular estadísticas de discipulado
CREATE OR REPLACE FUNCTION calculate_discipleship_stats(
  zone_filter TEXT DEFAULT NULL,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_groups INTEGER;
  total_members INTEGER;
  total_attendance INTEGER;
  growth_rate DECIMAL;
  active_leaders INTEGER;
  multiplication_count INTEGER;
  average_spiritual_temp DECIMAL;
BEGIN
  -- Filtros de fecha por defecto
  IF date_from IS NULL THEN
    date_from := CURRENT_DATE - INTERVAL '30 days';
  END IF;
  
  IF date_to IS NULL THEN
    date_to := CURRENT_DATE;
  END IF;

  -- Total de grupos activos
  SELECT COUNT(*) INTO total_groups
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Total de miembros
  SELECT COALESCE(SUM(member_count), 0) INTO total_members
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Promedio de asistencia reciente
  SELECT COALESCE(AVG(attendance), 0) INTO total_attendance
  FROM discipleship_metrics dm
  JOIN discipleship_groups dg ON dm.group_id = dg.id
  WHERE dm.week_date BETWEEN date_from AND date_to
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Cálculo de tasa de crecimiento (últimos 30 vs 60 días)
  WITH recent_stats AS (
    SELECT AVG(attendance) as recent_avg
    FROM discipleship_metrics dm
    JOIN discipleship_groups dg ON dm.group_id = dg.id
    WHERE dm.week_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (zone_filter IS NULL OR dg.zone_name = zone_filter)
  ),
  previous_stats AS (
    SELECT AVG(attendance) as previous_avg
    FROM discipleship_metrics dm
    JOIN discipleship_groups dg ON dm.group_id = dg.id
    WHERE dm.week_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
      AND (zone_filter IS NULL OR dg.zone_name = zone_filter)
  )
  SELECT 
    CASE 
      WHEN p.previous_avg > 0 THEN 
        ROUND(((r.recent_avg - p.previous_avg) / p.previous_avg * 100)::DECIMAL, 2)
      ELSE 0 
    END INTO growth_rate
  FROM recent_stats r, previous_stats p;

  -- Líderes activos únicos
  SELECT COUNT(DISTINCT leader_id) INTO active_leaders
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Multiplicaciones en el período
  SELECT COUNT(*) INTO multiplication_count
  FROM cell_multiplication_tracking cmt
  JOIN discipleship_groups dg ON cmt.parent_group_id = dg.id
  WHERE cmt.multiplication_date BETWEEN date_from AND date_to
    AND cmt.success_status IN ('successful', 'planned')
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Temperatura espiritual promedio
  SELECT COALESCE(AVG(spiritual_temperature), 0) INTO average_spiritual_temp
  FROM discipleship_metrics dm
  JOIN discipleship_groups dg ON dm.group_id = dg.id
  WHERE dm.week_date BETWEEN date_from AND date_to
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Construir resultado JSON
  result := json_build_object(
    'total_groups', total_groups,
    'total_members', total_members,
    'average_attendance', ROUND(total_attendance, 0),
    'growth_rate', COALESCE(growth_rate, 0),
    'active_leaders', active_leaders,
    'multiplications', multiplication_count,
    'spiritual_health', ROUND(average_spiritual_temp, 1),
    'date_range', json_build_object(
      'from', date_from,
      'to', date_to
    )
  );

  RETURN result;
END;
$$;