-- Add 'events' and 'reports' modules
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
('events', 'Eventos', 'Gestión de calendario, eventos y registros', FALSE, NULL),
('reports', 'Reportes Avanzados', 'Generación de reportes detallados y estadísticas', FALSE, NULL)
ON CONFLICT (key) DO NOTHING