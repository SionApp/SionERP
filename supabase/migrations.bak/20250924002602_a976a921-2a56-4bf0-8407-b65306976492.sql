-- Actualizar el registro existente de Daniel Bonalde para que use el ID del usuario autenticado
UPDATE public.users 
SET id = '44f6f3cd-23a7-4afb-ac91-9ea866187cec'
WHERE cedula = '23674783' AND correo = 'danztty@gmail.com';

-- Verificar el cambio
SELECT id, nombres, apellidos, correo, role FROM users 
WHERE correo = 'danztty@gmail.com';