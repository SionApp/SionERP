-- ─────────────────────────────────────────────────────────────────────────
-- Fix: discipleship_reports.supervisor_id huérfano
-- ─────────────────────────────────────────────────────────────────────────
-- Bug real, no específico de una demo: CreateReport() completa
-- supervisor_id leyendo discipleship_hierarchy en el momento del envío, pero
-- cualquier reporte insertado por fuera de ese endpoint (bulk seed, importes,
-- migraciones manuales) se queda con supervisor_id = NULL — y GetReports()
-- filtra la cola de "pendientes de revisar" por supervisor_id = yo, así que
-- esos reportes nunca le llegan a nadie. Verificado en local: 928 de 929
-- reportes de una sola iglesia estaban en este estado.
--
-- Esta migración de datos es segura de re-correr (solo toca filas con
-- supervisor_id IS NULL) y aplica a TODAS las iglesias del sistema, no solo
-- a la que estés demoing — es la misma fuente de verdad
-- (discipleship_hierarchy) que ya usa el código real.
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/prod-fix-orphaned-report-supervisors.sql
--
-- Antes de correr contra producción: hacé un SELECT COUNT(*) del WHERE de
-- abajo para ver cuántas filas va a tocar, y confirmá que tenés un backup
-- reciente (Supabase hace backups automáticos, pero medí el impacto primero).

BEGIN;

-- Preview — cuántas filas se van a actualizar (no cambia nada todavía)
SELECT COUNT(*) AS reportes_a_corregir
FROM discipleship_reports r
JOIN discipleship_hierarchy h
  ON r.reporter_id = h.user_id AND r.church_id = h.church_id
WHERE r.supervisor_id IS NULL
  AND h.supervisor_id IS NOT NULL;

UPDATE discipleship_reports r
SET supervisor_id = h.supervisor_id
FROM discipleship_hierarchy h
WHERE r.reporter_id = h.user_id
  AND r.church_id = h.church_id
  AND r.supervisor_id IS NULL
  AND h.supervisor_id IS NOT NULL;

COMMIT;

-- Nota: esto NO toca el status de los reportes (quedan como estaban:
-- draft/submitted/approved/needs_attention). A diferencia del seed local, en
-- producción los reportes 'submitted' son revisiones reales pendientes de un
-- humano — no se aprueban en bloque acá.
