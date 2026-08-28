-- =============================================================================
-- Migration: 20260827000009_public_visitor_registration.sql
-- Issue #72: eventos publicados visibles en sion-website (el sitio público de
-- la iglesia, repo aparte) + registro de visitantes desde ahí (alguien sin
-- cuenta que se anota a un evento o "se registra" en el sitio).
--
-- is_visitor: fila real en `users`, SIN cuenta de auth todavía — no puede
-- loguearse. Existe para dejar constancia de que la persona interactuó
-- (aportó, se inscribió) aunque nunca "haga vida" en el sistema. Un
-- staff/pastor la "valida" más tarde (ver CreateUserDirect en
-- handlers/users.go, que ya sabía dar acceso a un usuario existente en
-- `users` sin auth — sólo se le agregó resetear este flag).
--
-- Toda la escritura pública pasa por 2 funciones SECURITY DEFINER, NO por
-- policies de INSERT directas sobre las tablas — así ningún visitante de
-- internet puede escribir un valor que no sea exactamente el que la función
-- permite (rol, is_active_member, super_admin, etc. quedan fuera de su
-- control aunque manden esos campos en el body).
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_visitor boolean NOT NULL DEFAULT false;

-- Única iglesia real hoy — sion-website es el sitio de ESTA iglesia
-- específicamente, no un portal multi-tenant.
-- id: 00000000-0000-0000-0000-00000000515e ("Iglesia Sion")

CREATE OR REPLACE FUNCTION public.register_visitor(
  p_first_name text,
  p_last_name  text,
  p_email      text,
  p_phone      text DEFAULT '',
  p_address    text DEFAULT '',
  p_id_number  text DEFAULT '',
  p_whatsapp   boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid := '00000000-0000-0000-0000-00000000515e';
  v_user_id   uuid;
BEGIN
  IF p_first_name = '' OR p_last_name = '' OR p_email = '' THEN
    RAISE EXCEPTION 'first_name, last_name and email are required';
  END IF;

  INSERT INTO public.users (
    church_id, first_name, last_name, email, phone, address, id_number,
    whatsapp, is_visitor, is_active_member, is_active, role
  ) VALUES (
    v_church_id, p_first_name, p_last_name, p_email, COALESCE(NULLIF(p_phone, ''), 'N/A'),
    COALESCE(NULLIF(p_address, ''), 'N/A'), COALESCE(NULLIF(p_id_number, ''), 'VISITOR-' || substr(md5(p_email), 1, 12)),
    p_whatsapp, true, false, true, 'server'
  )
  ON CONFLICT (church_id, email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    phone      = COALESCE(NULLIF(EXCLUDED.phone, 'N/A'), public.users.phone),
    updated_at = now()
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_visitor FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_visitor TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_event_interest(
  p_event_id   uuid,
  p_first_name text,
  p_last_name  text,
  p_email      text,
  p_phone      text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid := '00000000-0000-0000-0000-00000000515e';
  v_user_id   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND church_id = v_church_id AND is_published = true
  ) THEN
    RAISE EXCEPTION 'event not found or not published';
  END IF;

  v_user_id := public.register_visitor(p_first_name, p_last_name, p_email, p_phone);

  INSERT INTO public.event_registrations (event_id, user_id, status, church_id)
  VALUES (p_event_id, v_user_id, 'going', v_church_id)
  ON CONFLICT (event_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.register_event_interest FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_event_interest TO anon, authenticated;

-- Lectura pública de eventos publicados — lo único que sion-website necesita
-- leer directo (todo lo demás es vía las funciones de arriba).
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public reads published events" ON public.events;
  CREATE POLICY "Public reads published events"
    ON public.events FOR SELECT TO anon
    USING (is_published = true AND church_id = '00000000-0000-0000-0000-00000000515e');
END $$;

-- ---------------------------------------------------------------------------
-- FIX DE SEGURIDAD (encontrado probando lo de arriba, no relacionado a esta
-- feature en sí, pero ya en producción): "Allow user registration and
-- service role operations" tenía `WITH CHECK (... OR auth.uid() IS NULL)` —
-- CUALQUIERA con la anon key pública podía insertar una fila arbitraria en
-- users (role=admin, is_super_admin=true, cualquier church_id incluido), sin
-- estar autenticado. Esa policy existía para el registro público desde el
-- sitio — ahora cubierto por register_visitor()/register_event_interest()
-- (SECURITY DEFINER, sin ese hueco). Se reemplaza por el único caso legítimo
-- real: un usuario YA autenticado insertando su propia fila (auth.uid()=id),
-- que es lo que el trigger handle_new_user necesita.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow user registration and service role operations" ON public.users;
DO $$ BEGIN
  CREATE POLICY "Authenticated users insert own row"
    ON public.users FOR INSERT TO public
    WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');
END $$;
