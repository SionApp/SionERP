-- Script para sincronizar usuarios de auth.users con public.users
-- 1. Crear función para manejar nuevos usuarios
-- 2. Crear trigger automático
-- 3. Sincronizar usuarios existentes

-- 1. Función para sincronizar usuarios automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'server', -- Rol por defecto para nuevos usuarios
    true,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sincronizar usuarios existentes que no están en public.users
INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    created_at, 
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    'server', -- Rol por defecto
    au.email_confirmed_at IS NOT NULL, -- Activo si email confirmado
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL -- Solo usuarios que no existen en public.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Mostrar resumen de usuarios sincronizados
SELECT 
    'Usuarios en auth.users' as tabla,
    COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT 
    'Usuarios en public.users',
    COUNT(*)
FROM public.users
UNION ALL
SELECT 
    'Usuarios sincronizados (nuevos)',
    COUNT(*)
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
WHERE pu.created_at > NOW() - INTERVAL '1 minute'; -- Usuarios creados en el último minuto

-- 5. Mostrar usuarios que fueron sincronizados
SELECT 
    pu.email,
    pu.first_name,
    pu.last_name,
    pu.role,
    pu.is_active,
    au.email_confirmed_at IS NOT NULL as email_verified
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
ORDER BY pu.created_at DESC;
