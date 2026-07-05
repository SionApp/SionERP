-- Fix: user_preferences necesita UNIQUE(church_id, user_id) para ON CONFLICT
-- 
-- El handler preference.go hace:
--   INSERT INTO user_preferences (...) ON CONFLICT (church_id, user_id) DO NOTHING
--
-- PostgreSQL requiere un UNIQUE o EXCLUSION constraint que coincida exactamente
-- con las columnas del ON CONFLICT. La tabla tiene church_id (agregado en
-- phase2b), pero el constraint viejo UNIQUE(user_id) se mantuvo en producción
-- y no se creó el nuevo UNIQUE(church_id, user_id).

-- =============================================================================
-- 1. Dropear el viejo UNIQUE(user_id) — una persona puede tener preferencias
--    por iglesia, no tiene sentido un unique global sobre user_id solo.
-- =============================================================================
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_key;

-- =============================================================================
-- 2. Crear el nuevo UNIQUE(church_id, user_id)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_church_id_user_id_key'
      AND conrelid = 'public.user_preferences'::regclass
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_church_id_user_id_key
      UNIQUE (church_id, user_id);
  END IF;
END $$;
