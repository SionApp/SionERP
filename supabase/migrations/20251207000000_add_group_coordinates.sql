-- Agregar campos de coordenadas a grupos para geolocalización
-- Esta migración agrega latitude y longitude a discipleship_groups

-- Agregar columnas de coordenadas
ALTER TABLE public.discipleship_groups 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS meeting_address TEXT; -- Dirección completa para geocodificación

-- Crear índice para búsquedas espaciales
CREATE INDEX IF NOT EXISTS idx_groups_location ON public.discipleship_groups(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.discipleship_groups.latitude IS 'Latitud del lugar de reunión del grupo';
COMMENT ON COLUMN public.discipleship_groups.longitude IS 'Longitud del lugar de reunión del grupo';
COMMENT ON COLUMN public.discipleship_groups.meeting_address IS 'Dirección completa del lugar de reunión para geocodificación';

