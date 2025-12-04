-- =====================================================
-- MIGRACIÓN: Settings, Preferences, y Storage
-- Fecha: 2024
-- =====================================================

-- =====================================================
-- PARTE 1: TABLAS DE CONFIGURACIÓN GLOBAL (Singleton)
-- =====================================================

-- 1.1 Tabla: system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    site_name TEXT NOT NULL DEFAULT 'Sistema Sion',
    site_version TEXT DEFAULT '1.0.0',
    maintenance_mode BOOLEAN DEFAULT false,
    allow_registrations BOOLEAN DEFAULT true,
    max_users_per_group INTEGER DEFAULT 12,
    session_timeout_minutes INTEGER DEFAULT 60,
    default_theme TEXT DEFAULT 'light',
    default_language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Santo_Domingo',
    animations_enabled BOOLEAN DEFAULT true,
    sidebar_collapsed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row_system CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- 1.2 Tabla: church_info
CREATE TABLE IF NOT EXISTS public.church_info (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002'::uuid,
    name TEXT NOT NULL DEFAULT 'Iglesia Sion',
    pastor_name TEXT,
    description TEXT,
    mission TEXT,
    vision TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    banner_url TEXT,
    primary_color TEXT DEFAULT '#1e40af',
    secondary_color TEXT DEFAULT '#fbbf24',
    social_facebook TEXT,
    social_instagram TEXT,
    social_youtube TEXT,
    social_twitter TEXT,
    service_times JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row_church CHECK (id = '00000000-0000-0000-0000-000000000002'::uuid)
);

-- 1.3 Tabla: notification_config
CREATE TABLE IF NOT EXISTS public.notification_config (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000003'::uuid,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    new_user_notifications BOOLEAN DEFAULT true,
    role_change_notifications BOOLEAN DEFAULT true,
    weekly_reports BOOLEAN DEFAULT false,
    event_reminders BOOLEAN DEFAULT true,
    important_messages BOOLEAN DEFAULT true,
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT,
    smtp_password TEXT,
    smtp_from_email TEXT,
    smtp_from_name TEXT DEFAULT 'Iglesia Sion',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row_notif CHECK (id = '00000000-0000-0000-0000-000000000003'::uuid)
);

-- =====================================================
-- PARTE 2: PREFERENCIAS DE USUARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Santo_Domingo',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT false,
    whatsapp_notifications BOOLEAN DEFAULT true,
    event_reminders BOOLEAN DEFAULT true,
    weekly_newsletter BOOLEAN DEFAULT true,
    profile_visibility TEXT DEFAULT 'members' CHECK (profile_visibility IN ('public', 'members', 'private')),
    show_email BOOLEAN DEFAULT false,
    show_phone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARTE 3: AUDIT LOG PARA CONFIGURACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.settings_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARTE 4: INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar registro inicial de system_settings
INSERT INTO public.system_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Insertar registro inicial de church_info
INSERT INTO public.church_info (id, name, mission, vision)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Iglesia Sion',
    'Proclamar el evangelio de Jesucristo y formar discípulos que transformen vidas y comunidades.',
    'Ser una iglesia que impacte positivamente nuestra ciudad y las naciones con el amor de Cristo.'
)
ON CONFLICT (id) DO NOTHING;

-- Insertar registro inicial de notification_config
INSERT INTO public.notification_config (id)
VALUES ('00000000-0000-0000-0000-000000000003'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Crear preferencias para usuarios existentes
INSERT INTO public.user_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- PARTE 5: TRIGGERS Y FUNCIONES
-- =====================================================

-- 5.1 Trigger para crear preferencias automáticamente al crear usuario
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();

-- 5.2 Trigger para updated_at en todas las tablas
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

DROP TRIGGER IF EXISTS update_church_info_updated_at ON public.church_info;
CREATE TRIGGER update_church_info_updated_at
BEFORE UPDATE ON public.church_info
FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

DROP TRIGGER IF EXISTS update_notification_config_updated_at ON public.notification_config;
CREATE TRIGGER update_notification_config_updated_at
BEFORE UPDATE ON public.notification_config
FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

-- 5.3 Trigger de auditoría para configuraciones
CREATE OR REPLACE FUNCTION public.log_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.settings_audit_log (table_name, action, changed_by, old_values, new_values)
    VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_system_settings ON public.system_settings;
CREATE TRIGGER audit_system_settings
AFTER UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.log_settings_changes();

DROP TRIGGER IF EXISTS audit_church_info ON public.church_info;
CREATE TRIGGER audit_church_info
AFTER UPDATE ON public.church_info
FOR EACH ROW EXECUTE FUNCTION public.log_settings_changes();

DROP TRIGGER IF EXISTS audit_notification_config ON public.notification_config;
CREATE TRIGGER audit_notification_config
AFTER UPDATE ON public.notification_config
FOR EACH ROW EXECUTE FUNCTION public.log_settings_changes();

-- =====================================================
-- PARTE 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- 6.1 system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All can read system_settings" ON public.system_settings;
CREATE POLICY "All can read system_settings" 
ON public.system_settings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Pastor/Staff can update system_settings" ON public.system_settings;
CREATE POLICY "Pastor/Staff can update system_settings" 
ON public.system_settings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

-- 6.2 church_info
ALTER TABLE public.church_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All can read church_info" ON public.church_info;
CREATE POLICY "All can read church_info" 
ON public.church_info FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Pastor/Staff can update church_info" ON public.church_info;
CREATE POLICY "Pastor/Staff can update church_info" 
ON public.church_info FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

-- 6.3 notification_config
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pastor/Staff can read notification_config" ON public.notification_config;
CREATE POLICY "Pastor/Staff can read notification_config" 
ON public.notification_config FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

DROP POLICY IF EXISTS "Pastor/Staff can update notification_config" ON public.notification_config;
CREATE POLICY "Pastor/Staff can update notification_config" 
ON public.notification_config FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

-- 6.4 user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences" 
ON public.user_preferences FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" 
ON public.user_preferences FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" 
ON public.user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6.5 settings_audit_log
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pastor/Staff can view audit" ON public.settings_audit_log;
CREATE POLICY "Pastor/Staff can view audit" 
ON public.settings_audit_log FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

-- =====================================================
-- PARTE 7: STORAGE BUCKET PARA LOGOS
-- =====================================================

-- Crear bucket (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'church-assets',
    'church-assets',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS para storage
DROP POLICY IF EXISTS "Public read church-assets" ON storage.objects;
CREATE POLICY "Public read church-assets" 
ON storage.objects FOR SELECT
USING (bucket_id = 'church-assets');

DROP POLICY IF EXISTS "Pastor/Staff upload church-assets" ON storage.objects;
CREATE POLICY "Pastor/Staff upload church-assets" 
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'church-assets' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

DROP POLICY IF EXISTS "Pastor/Staff update church-assets" ON storage.objects;
CREATE POLICY "Pastor/Staff update church-assets" 
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'church-assets' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

DROP POLICY IF EXISTS "Pastor/Staff delete church-assets" ON storage.objects;
CREATE POLICY "Pastor/Staff delete church-assets" 
ON storage.objects FOR DELETE
USING (
    bucket_id = 'church-assets' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('pastor', 'staff')
    )
);

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
