-- =============================================================================
-- Migration: 20260830000001_notification_queue_branding.sql
-- Templates de correo con marca real (propuesta aprobada por el usuario,
-- ver artifact de diseño). Hasta ahora todo lo que salía por
-- notification_queue (issue #52) se mandaba como texto plano envuelto en un
-- <p> — sin logo, sin color de iglesia, sin botón. Estas 3 columnas
-- nullable son lo mínimo para que el worker pueda renderizar el mismo shell
-- de marca (banda con logo/monograma + nombre de iglesia) con una variante
-- visual por tipo de aviso, sin inventar una tabla de "tipos de email" que
-- nadie pidió — subject/body siguen siendo el contenido real.
-- =============================================================================

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'info'
    CHECK (tone IN ('info', 'success', 'warning')),
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS action_label text;

COMMENT ON COLUMN public.notification_queue.tone IS
  'Variante visual del correo: info (correo masivo, plano), success (reporte listo, tag verde), warning (escalamiento, aviso con acento rojo).';
COMMENT ON COLUMN public.notification_queue.action_url IS
  'Link del botón de acción del correo (ej: /dashboard/reports). NULL = sin botón.';
COMMENT ON COLUMN public.notification_queue.action_label IS
  'Texto del botón (ej: "Ver reporte"). Ignorado si action_url es NULL.';
