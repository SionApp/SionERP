-- Insertar solo usuarios de prueba nuevos
INSERT INTO public.users (
  nombres, apellidos, cedula, correo, telefono, direccion, password_hash, role, is_active, whatsapp
) VALUES 
  ('María', 'García', '40112233445', 'maria.garcia@email.com', '8091234567', 'Santiago', 'temp_hash', 'staff', true, true),
  ('Juan', 'Pérez', '40298765432', 'juan.perez@email.com', '8097654321', 'La Vega', 'temp_hash', 'supervisor', true, false),
  ('Ana', 'Rodríguez', '40387654321', 'ana.rodriguez@email.com', '8095555555', 'Puerto Plata', 'temp_hash', 'server', true, true),
  ('Carlos', 'López', '40476543210', 'carlos.lopez@email.com', '8096666666', 'San Cristóbal', 'temp_hash', 'server', true, false),
  ('Rosa', 'Martínez', '40565432109', 'rosa.martinez@email.com', '8097777777', 'Baní', 'temp_hash', 'server', true, true),
  ('Pedro', 'Jiménez', '40654321098', 'pedro.jimenez@email.com', '8098888888', 'Moca', 'temp_hash', 'supervisor', true, true),
  ('Lucía', 'Fernández', '40743210987', 'lucia.fernandez@email.com', '8099999999', 'Bonao', 'temp_hash', 'server', true, false),
  ('Miguel', 'Torres', '40832109876', 'miguel.torres@email.com', '8090000000', 'Higüey', 'temp_hash', 'server', true, true)
ON CONFLICT (cedula) DO NOTHING;