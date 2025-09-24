-- Migrate user table columns from Spanish to English
ALTER TABLE users RENAME COLUMN nombres TO first_name;
ALTER TABLE users RENAME COLUMN apellidos TO last_name;
ALTER TABLE users RENAME COLUMN cedula TO id_number;
ALTER TABLE users RENAME COLUMN correo TO email;
ALTER TABLE users RENAME COLUMN telefono TO phone;
ALTER TABLE users RENAME COLUMN direccion TO address;
ALTER TABLE users RENAME COLUMN bautizado TO baptized;
ALTER TABLE users RENAME COLUMN fecha_bautizo TO baptism_date;