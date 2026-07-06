-- Crear tabla discipleship_goals
CREATE TABLE IF NOT EXISTS discipleship_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('growth', 'attendance', 'conversions', 'baptisms', 'new_groups', 'multiplications', 'spiritual_health')),
  title TEXT NOT NULL,
  description TEXT,
  target_metric TEXT NOT NULL,
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  current_value INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled', 'pending_review')),
  priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  
  -- A quién compete
  created_by UUID REFERENCES users(id) NOT NULL,
  supervisor_id UUID REFERENCES users(id),
  zone_id UUID REFERENCES zones(id),
  
  -- Para prórrogas
  extension_count INT DEFAULT 0,
  original_deadline DATE,
  extension_reason TEXT,
  extended_by UUID REFERENCES users(id),
  extended_at TIMESTAMPTZ,
  
  -- Para auditoría de cierre incompleto
  closed_incomplete BOOLEAN DEFAULT FALSE,
  closed_percentage DECIMAL(5,2),
  closure_reason TEXT,
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  
  -- Alertas automáticas
  notified_at TIMESTAMPTZ,
  alert_sent BOOLEAN DEFAULT FALSE,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goals_status ON discipleship_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_zone ON discipleship_goals(zone_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON discipleship_goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goals_creator ON discipleship_goals(created_by);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_goals_updated_at
BEFORE UPDATE ON discipleship_goals
FOR EACH ROW EXECUTE FUNCTION update_goals_updated_at();
