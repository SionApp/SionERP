-- Crear tabla zones
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  boundaries JSONB, -- GeoJSON para polígonos del mapa
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),
  is_active BOOLEAN DEFAULT true,
  -- Estadísticas denormalizadas
  total_groups INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  avg_attendance DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar zone_id a tablas existentes
ALTER TABLE public.users ADD COLUMN zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.discipleship_groups ADD COLUMN zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.discipleship_reports ADD COLUMN zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos los autenticados pueden ver zonas"
ON public.zones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Pastor y staff pueden gestionar zonas"
ON public.zones FOR ALL
USING (EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid() 
  AND role IN ('pastor', 'staff')
));

-- Trigger para updated_at
CREATE TRIGGER update_zones_updated_at
BEFORE UPDATE ON public.zones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar estadísticas de zona
CREATE OR REPLACE FUNCTION update_zone_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE zones SET
    total_groups = (SELECT COUNT(*) FROM discipleship_groups WHERE zone_id = NEW.zone_id AND status = 'active'),
    total_members = (SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE zone_id = NEW.zone_id),
    updated_at = NOW()
  WHERE id = NEW.zone_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar stats al modificar grupos
CREATE TRIGGER update_zone_stats_on_group_change
AFTER INSERT OR UPDATE OR DELETE ON public.discipleship_groups
FOR EACH ROW
EXECUTE FUNCTION update_zone_stats();

-- Insertar zonas iniciales
INSERT INTO zones (name, description, color, center_lat, center_lng, boundaries) VALUES
('Zona Norte', 'Sectores del norte de la ciudad', '#3b82f6', 10.2580, -67.5910, 
 '{"type":"Polygon","coordinates":[[[-67.62,10.28],[-67.58,10.28],[-67.58,10.24],[-67.62,10.24],[-67.62,10.28]]]}'),
('Zona Sur', 'Sectores del sur de la ciudad', '#ef4444', 10.2050, -67.5870,
 '{"type":"Polygon","coordinates":[[[-67.62,10.22],[-67.58,10.22],[-67.58,10.18],[-67.62,10.18],[-67.62,10.22]]]}'),
('Zona Este', 'Sectores del este de la ciudad', '#10b981', 10.2300, -67.5700,
 '{"type":"Polygon","coordinates":[[[-67.60,10.26],[-67.56,10.26],[-67.56,10.20],[-67.60,10.20],[-67.60,10.26]]]}'),
('Zona Oeste', 'Sectores del oeste de la ciudad', '#f59e0b', 10.2300, -67.6200,
 '{"type":"Polygon","coordinates":[[[-67.64,10.26],[-67.60,10.26],[-67.60,10.20],[-67.64,10.20],[-67.64,10.26]]]}');

-- Migrar datos existentes de zone_name a zone_id
UPDATE users u SET zone_id = z.id
FROM zones z WHERE u.zone_name = z.name AND u.zone_name IS NOT NULL;

UPDATE discipleship_groups g SET zone_id = z.id
FROM zones z WHERE g.zone_name = z.name AND g.zone_name IS NOT NULL;
