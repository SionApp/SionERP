-- =============================================================================
-- Migration: 20260724060000_drop_stale_permissive_rls_policies.sql
--
-- Hallazgo (2026-07-24, mientras se armaba el acceso federado de BonDev):
-- varias tablas tenant tienen una policy PERMISIVA vieja, de la era
-- single-tenant (creada ANTES de que existiera church_id/tenant_isolation
-- en esa tabla), que nunca se borró cuando Phase 1-4 agregó tenant_isolation.
-- Postgres combina policies permisivas con OR — así que "USING (true)" en
-- SELECT/UPDATE anula tenant_isolation por completo para ese comando,
-- sin importar qué rol de conexión se use (jetro_app incluido).
--
-- Confirmado con una auditoría real contra pg_policies (no sólo grep de
-- migraciones): 16 policies en 15 tablas, todas con el mismo patrón.
--
-- EXCEPCIÓN a propósito: NO se toca "Live streams are viewable by
-- everyone" (live_streams) — a diferencia de las demás, esa lee como una
-- decisión real (un link de transmisión en vivo pensado para compartirse
-- sin login, no un descuido). Se deja igual.
--
-- Verificado: cada tabla acá tiene tenant_isolation ya creada (Phase 1/2b/4),
-- así que borrar la policy vieja no deja la tabla sin RLS — sólo saca el
-- agujero, tenant_isolation queda como única autoridad.
-- =============================================================================

-- Config/singletons (Phase 1)
DROP POLICY IF EXISTS "All can read church_info" ON public.church_info;
DROP POLICY IF EXISTS "All can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public read access to modules" ON public.modules;
-- Esta además no tenía NINGÚN chequeo de rol (ni de tenant) — peor que las
-- de sólo-lectura, permitía UPDATE de cualquier fila desde cualquier origen.
DROP POLICY IF EXISTS "Allow admin update access to modules" ON public.modules;

-- Tenant schema group A (Phase 2a)
DROP POLICY IF EXISTS "Todos los autenticados pueden ver zonas" ON public.zones;
DROP POLICY IF EXISTS "Everyone can read levels" ON public.discipleship_levels;

-- Config per-role (2026-05-27)
DROP POLICY IF EXISTS "role_module_access_read" ON public.role_module_access;

-- Events (2026-06-16)
DROP POLICY IF EXISTS "Authenticated read events" ON public.events;
DROP POLICY IF EXISTS "Authenticated read registrations" ON public.event_registrations;

-- Music (2026-06-12 / 06-15)
DROP POLICY IF EXISTS "Authenticated read music_members" ON public.music_members;
DROP POLICY IF EXISTS "Authenticated read music_events" ON public.music_events;
DROP POLICY IF EXISTS "Authenticated read music_assignments" ON public.music_assignments;
DROP POLICY IF EXISTS "Authenticated read music_songs" ON public.music_songs;
DROP POLICY IF EXISTS "Authenticated read music_event_songs" ON public.music_event_songs;
DROP POLICY IF EXISTS "Authenticated read music_unavailability" ON public.music_unavailability;
DROP POLICY IF EXISTS "Authenticated read music_telegram_files" ON public.music_telegram_files;
DROP POLICY IF EXISTS "Authenticated read music_instruments" ON public.music_instruments;
