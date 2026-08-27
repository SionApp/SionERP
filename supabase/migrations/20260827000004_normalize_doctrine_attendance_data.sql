-- =============================================================================
-- Migration: 20260827000004_normalize_doctrine_attendance_data.sql
-- Bug real de datos encontrado verificando lazy-loading (nada que ver con
-- eso, apareció al navegar a Zonas): doctrine_attendance pasó de boolean a
-- número entero en esta misma sesión (ver commit de "Reporte de doctrina"),
-- y todos los queries que lo leen se actualizaron a `(...)::int`. Pero los
-- reportes HISTÓRICOS ya guardados siguen teniendo 'true'/'false' (boolean)
-- en el JSON — `(report_data->>'doctrine_attendance')::int` sobre esas filas
-- rompe con "invalid input syntax for type integer: true", tumbando
-- cualquier query que las toque (confirmado: GET /zones, que calcula salud
-- de zona agregando reportes de todos los grupos, sin importar la fecha).
--
-- Normaliza los datos existentes en vez de hacer 11 queries defensivas en Go:
-- true → 1 (asistió, headcount de 1 como piso razonable), false → 0.
-- =============================================================================

UPDATE public.discipleship_reports
SET report_data = jsonb_set(report_data, '{doctrine_attendance}', '1'::jsonb)
WHERE report_data->>'doctrine_attendance' = 'true';

UPDATE public.discipleship_reports
SET report_data = jsonb_set(report_data, '{doctrine_attendance}', '0'::jsonb)
WHERE report_data->>'doctrine_attendance' = 'false';
