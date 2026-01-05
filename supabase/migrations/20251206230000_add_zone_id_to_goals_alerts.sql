-- Agregar zone_id a discipleship_goals, discipleship_alerts y discipleship_hierarchy
-- Esta migración agrega las columnas zone_id que faltaban en la migración inicial

-- Agregar zone_id a discipleship_goals
ALTER TABLE public.discipleship_goals 
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- Agregar zone_id a discipleship_alerts
ALTER TABLE public.discipleship_alerts 
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- Agregar zone_id a discipleship_hierarchy
ALTER TABLE public.discipleship_hierarchy 
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- Migrar datos existentes de zone_name a zone_id en discipleship_goals
UPDATE discipleship_goals g 
SET zone_id = z.id
FROM zones z 
WHERE g.zone_name = z.name 
  AND g.zone_name IS NOT NULL
  AND g.zone_id IS NULL;

-- Migrar datos existentes de zone_name a zone_id en discipleship_alerts
UPDATE discipleship_alerts a 
SET zone_id = z.id
FROM zones z 
WHERE a.zone_name = z.name 
  AND a.zone_name IS NOT NULL
  AND a.zone_id IS NULL;

-- Migrar datos existentes de zone_name a zone_id en discipleship_hierarchy
UPDATE discipleship_hierarchy h 
SET zone_id = z.id
FROM zones z 
WHERE h.zone_name = z.name 
  AND h.zone_name IS NOT NULL
  AND h.zone_id IS NULL;

