-- Script para resetear el sistema y probar el setup wizard
-- ADVERTENCIA: Esto eliminará TODOS los usuarios y restablecerá los módulos

-- Eliminar todos los usuarios
DELETE FROM auth.users;
DELETE FROM public.users;

-- Resetear módulos a estado inicial
UPDATE public.modules SET is_installed = FALSE, installed_at = NULL WHERE key != 'base';
UPDATE public.modules SET is_installed = TRUE, installed_at = NOW() WHERE key = 'base';

-- Verificar estado
SELECT 'Users count:' as info, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Modules status:', NULL;

SELECT key, name, is_installed FROM public.modules ORDER BY key;
