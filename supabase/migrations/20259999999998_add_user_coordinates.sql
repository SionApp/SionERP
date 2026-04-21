-- Agregar coordenadas geográficas a la tabla users para el mapa
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Índices para optimizar consultas por ubicación
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.users.latitude IS 'Latitud de la ubicación del usuario para el mapa de zonas';
COMMENT ON COLUMN public.users.longitude IS 'Longitud de la ubicación del usuario para el mapa de zonas';
