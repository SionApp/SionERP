-- Actualizar el teléfono de danztty@gmail.com para generar audit log
UPDATE users 
SET phone = '04246706254', updated_at = now() 
WHERE email = 'danztty@gmail.com';