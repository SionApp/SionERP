-- Realtime "pantalla actual" para la agenda de alabanza (MusicPage).
--
-- Varias personas del equipo de alabanza miran/editan el cronograma a la vez:
-- cuando el director crea o mueve un culto, el resto lo ve al instante en vez de
-- tener que recargar. Realtime actúa como "ping: algo cambió" y useRealtimeTable
-- invalida la query ['music-events'] → TanStack Query re-fetchea por el backend
-- Go (con su TenantTx). No se confía en el payload para pintar.
--
-- Mismo patrón que discipleship_reports_realtime: el Realtime del cliente NO
-- pasa por TenantTx, así que la policy SELECT se basa en el church_id del JWT
-- (app_metadata). Degrada con gracia: si un JWT viejo aún no tiene church_id,
-- la suscripción no entrega filas y la pantalla sigue funcionando por fetch.

-- 1) Agregar la tabla a la publicación de Realtime (idempotente).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'music_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.music_events;
  END IF;
END $$;

-- 2) Policy SELECT scopeada por iglesia (JWT) para Realtime del cliente.
DROP POLICY IF EXISTS "music_events_realtime_church" ON public.music_events;
CREATE POLICY "music_events_realtime_church"
ON public.music_events
FOR SELECT TO authenticated
USING (church_id = (auth.jwt() -> 'app_metadata' ->> 'church_id')::uuid);
