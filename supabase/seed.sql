-- ============================================================
-- SionERP - Seed
-- ============================================================
-- Datos mínimos necesarios para que el sistema funcione.
-- NO incluye usuarios, zonas ni datos de discipulado.
-- La carga real de datos se hace con: node scripts/seed-iglesia.mjs
--
-- Flujo limpio de setup:
--   supabase db reset --no-seed && node scripts/seed-iglesia.mjs
-- ============================================================

-- ========================
-- MODULES
-- ========================
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
  ('base',         'Sistema Base',  'Funcionalidades principales: Usuarios, Configuración', true, NOW()),
  ('discipleship', 'Discipulado',   'Gestión de grupos, jerarquías y reportes',             true, NOW()),
  ('zones',        'Zonas',         'Gestión de zonas territoriales',                        true, NOW()),
  ('events',       'Eventos',       'Gestión de eventos de la iglesia',                      false, NULL),
  ('reports',      'Informes',      'Informes y estadísticas avanzadas',                     false, NULL)
ON CONFLICT (key) DO NOTHING;
