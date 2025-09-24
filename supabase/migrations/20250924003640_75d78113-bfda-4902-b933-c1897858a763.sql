-- Update user danztty@gmail.com to have pastor role
UPDATE users 
SET role = 'pastor'::user_role 
WHERE correo = 'danztty@gmail.com';