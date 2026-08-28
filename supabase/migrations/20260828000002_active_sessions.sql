-- =============================================================================
-- Migration: 20260828000002_active_sessions.sql
-- Sesión única activa + vencimiento por inactividad + kill cross-device en vivo.
--
-- Modelo: UNA fila por usuario (PK = user_id). Al loguearse en un dispositivo,
-- el backend hace UPSERT pisando session_id. El dispositivo viejo, suscrito por
-- Realtime a su propia fila, ve que session_id ya no coincide con el suyo y se
-- desloguea solo — sin polling. El backend además rechaza (SessionGuard) todo
-- request cuyo X-Session-Id no coincida, como backstop del cliente.
--
-- Inactividad: last_seen_at lo bumpea SessionGuard en cada request (throttle).
-- El cliente tiene además un timer de 30 min sobre eventos reales de usuario
-- (ese es el enforcer preciso). El server rechaza si last_seen quedó > 35 min
-- atrás — margen sobre los 30 del cliente para no cortar en carreras.
--
-- IMPORTANTE — Realtime del cliente NO pasa por TenantTx: se conecta directo con
-- el JWT. Por eso la policy de lectura para Realtime se basa en auth.uid() (que
-- SIEMPRE está en el token), no en current_setting('app.current_church_id') ni
-- en app_metadata.church_id (que todavía no está backfilleado en todos los JWT).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id      uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  church_id    uuid        NOT NULL REFERENCES public.churches(id),
  session_id   text        NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Backend (TenantTx, cuando aplique): aislamiento por iglesia.
  DROP POLICY IF EXISTS tenant_isolation ON public.active_sessions;
  CREATE POLICY tenant_isolation ON public.active_sessions
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);

  -- Realtime del cliente: cada usuario SOLO ve/escucha su propia fila.
  DROP POLICY IF EXISTS "own_session_realtime" ON public.active_sessions;
  CREATE POLICY "own_session_realtime" ON public.active_sessions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO jetro_app;

-- Agregar a la publicación de Realtime (idempotente).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'active_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Realtime "crítico": la propia fila del usuario en `users`.
-- Cuando un admin le cambia el rol, los módulos o lo suspende (is_active),
-- el cliente ve el UPDATE al instante y refresca permisos / se desloguea, sin
-- recargar la página. Policy por auth.uid() = id (bulletproof, no depende del
-- backfill de church_id en el JWT). Es aditiva: solo permite verte a vos mismo,
-- fila que el usuario ya podía leer por la app.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  DROP POLICY IF EXISTS "own_user_realtime" ON public.users;
  CREATE POLICY "own_user_realtime" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;
