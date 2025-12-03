-- Actualizar roles de usuarios específicos para generar actividad
UPDATE public.users 
SET role = 'pastor'::user_role, updated_at = now()
WHERE LOWER(nombres || ' ' || apellidos) LIKE '%othiel%morales%';

UPDATE public.users 
SET role = 'staff'::user_role, updated_at = now()
WHERE LOWER(nombres || ' ' || apellidos) LIKE '%victor%perez%';

-- Verificar que los cambios se aplicaron
SELECT nombres, apellidos, role FROM public.users 
WHERE LOWER(nombres || ' ' || apellidos) LIKE '%othiel%morales%' 
   OR LOWER(nombres || ' ' || apellidos) LIKE '%victor%perez%';