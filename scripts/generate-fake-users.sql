-- Script para generar datos fake de usuarios
-- Ejecutar DESPUÉS del backup

-- Limpiar tabla de usuarios
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Insertar usuarios fake con diferentes roles
INSERT INTO users (
    email, first_name, last_name, id_number, phone, address, role, 
    birth_date, baptized, baptism_date, zone_name, is_active,
    marital_status, occupation, education_level, how_found_church,
    ministry_interest, first_visit_date, is_active_member, membership_date,
    cell_group, pastoral_notes, whatsapp, territory, discipleship_level
) VALUES 
-- Pastor Principal
('pastor.principal@iglesiasion.com', 'Carlos', 'Mendoza', '12345678', '555-0001', 'Av. Principal 123', 'pastor', 
 '1980-05-15', true, '1995-03-20', 'Centro', true,
 'married', 'Pastor Principal', 'Master en Teología', 'Nació en la iglesia',
 'Predicación y Liderazgo', '1980-01-01', true, '1980-01-01',
 'Grupo Principal', 'Líder espiritual de la iglesia', true, 'Centro', 1),

-- Pastores Asociados
('pastor.juventud@iglesiasion.com', 'Ana', 'Rodríguez', '12345679', '555-0002', 'Calle Juventud 456', 'pastor',
 '1985-08-22', true, '1998-07-15', 'Norte', true,
 'single', 'Pastor de Juventud', 'Licenciatura en Ministerio', 'Invitado por amigo',
 'Ministerio Juvenil', '1998-05-10', true, '1998-05-10',
 'Juventud Activa', 'Especialista en ministerio juvenil', true, 'Norte', 2),

('pastor.discipulado@iglesiasion.com', 'Miguel', 'Hernández', '12345680', '555-0003', 'Plaza Discipulado 789', 'pastor',
 '1975-12-03', true, '1992-11-25', 'Sur', true,
 'married', 'Pastor de Discipulado', 'Doctorado en Ministerio', 'Evento evangelístico',
 'Discipulado y Crecimiento', '1992-08-15', true, '1992-08-15',
 'Discípulos Fieles', 'Experto en formación de discípulos', true, 'Sur', 2),

-- Staff Administrativo
('admin@iglesiasion.com', 'Laura', 'García', '12345681', '555-0004', 'Oficina Central 321', 'staff',
 '1990-03-10', true, '2005-06-12', 'Centro', true,
 'single', 'Administradora', 'Licenciatura en Administración', 'Familia miembro',
 'Administración y Finanzas', '2005-03-01', true, '2005-03-01',
 'Staff Central', 'Manejo administrativo de la iglesia', true, 'Centro', 3),

('secretaria@iglesiasion.com', 'Carmen', 'López', '12345682', '555-0005', 'Recepción Iglesia 654', 'staff',
 '1988-09-18', true, '2003-04-20', 'Centro', true,
 'married', 'Secretaria', 'Técnico en Secretariado', 'Visita dominical',
 'Servicio y Atención', '2003-02-15', true, '2003-02-15',
 'Equipo Administrativo', 'Primera línea de atención', true, 'Centro', 3),

-- Supervisores de Zona
('supervisor.norte@iglesiasion.com', 'Roberto', 'Morales', '12345683', '555-0006', 'Zona Norte 987', 'supervisor',
 '1982-07-25', true, '1997-09-30', 'Norte', true,
 'married', 'Supervisor de Zona', 'Licenciatura en Ministerio', 'Ministerio previo',
 'Supervisión y Liderazgo', '1997-06-15', true, '1997-06-15',
 'Líderes Norte', 'Supervisa 5 grupos en zona norte', true, 'Norte', 3),

('supervisor.sur@iglesiasion.com', 'Patricia', 'Vargas', '12345684', '555-0007', 'Zona Sur 147', 'supervisor',
 '1983-11-12', true, '1998-12-05', 'Sur', true,
 'single', 'Supervisora de Zona', 'Maestría en Liderazgo', 'Crecimiento personal',
 'Desarrollo de Líderes', '1998-10-01', true, '1998-10-01',
 'Líderes Sur', 'Supervisa 6 grupos en zona sur', true, 'Sur', 3),

-- Líderes de Célula
('lider.celula1@iglesiasion.com', 'Jorge', 'Torres', '12345685', '555-0008', 'Célula Esperanza 258', 'server',
 '1987-04-20', true, '2008-08-15', 'Centro', true,
 'married', 'Líder de Célula', 'Técnico Superior', 'Evento de iglesia',
 'Evangelización', '2008-05-10', true, '2008-05-10',
 'Esperanza', 'Líder del grupo Esperanza', true, 'Centro', 4),

('lider.celula2@iglesiasion.com', 'Sandra', 'Jiménez', '12345686', '555-0009', 'Célula Fe 369', 'server',
 '1989-06-14', true, '2010-11-20', 'Norte', true,
 'single', 'Líder de Célula', 'Licenciatura en Educación', 'Amistad cristiana',
 'Discipulado', '2010-09-05', true, '2010-09-05',
 'Fe', 'Líder del grupo Fe', true, 'Norte', 4),

('lider.celula3@iglesiasion.com', 'Fernando', 'Castro', '12345687', '555-0010', 'Célula Amor 741', 'server',
 '1985-01-30', true, '2007-03-25', 'Sur', true,
 'married', 'Líder de Célula', 'Ingeniería', 'Testimonio familiar',
 'Evangelización', '2007-01-15', true, '2007-01-15',
 'Amor', 'Líder del grupo Amor', true, 'Sur', 4),

-- Miembros Activos
 ('miembro1@iglesiasion.com', 'Alejandra', 'Ruiz', '12345688', '555-0011', 'Calle Miembros 852', 'server',
 '1995-08-05', true, '2015-12-24', 'Centro', true,
 'single', 'Estudiante Universitaria', 'Universitario', 'Redes sociales',
 'Música y Adoración', '2015-10-15', true, '2015-10-15',
 'Esperanza', 'Miembro activo en ministerio de música', true, 'Centro', 5),

('miembro2@iglesiasion.com', 'Diego', 'Mendoza', '12345689', '555-0012', 'Avenida Familia 963', 'server',
 '1992-12-18', true, '2012-06-30', 'Norte', true,
 'married', 'Ingeniero', 'Ingeniería Industrial', 'Matrimonio',
 'Tecnología y Medios', '2012-04-20', true, '2012-04-20',
 'Fe', 'Responsable de tecnología en servicios', true, 'Norte', 5),

('miembro3@iglesiasion.com', 'Valentina', 'Silva', '12345690', '555-0013', 'Plaza Servicio 174', 'server',
 '1988-03-22', true, '2009-09-15', 'Sur', true,
 'married', 'Enfermera', 'Licenciatura en Enfermería', 'Ministerio médico',
 'Servicio Social', '2009-07-01', true, '2009-07-01',
 'Amor', 'Coordina ministerio de salud', true, 'Sur', 5),

('miembro4@iglesiasion.com', 'Ricardo', 'Pérez', '12345691', '555-0014', 'Boulevard Comunidad 285', 'server',
 '1991-05-10', true, '2014-03-10', 'Centro', true,
 'single', 'Contador', 'Contaduría Pública', 'Evento evangelístico',
 'Finanzas y Administración', '2014-01-20', true, '2014-01-20',
 'Esperanza', 'Ayuda en administración de eventos', true, 'Centro', 5),

('miembro5@iglesiasion.com', 'Isabella', 'González', '12345692', '555-0015', 'Calle Juventud 396', 'server',
 '1998-09-25', true, '2018-11-12', 'Norte', true,
 'single', 'Estudiante', 'Secundaria', 'Grupo juvenil',
 'Misiones y Evangelización', '2018-09-01', true, '2018-09-01',
 'Fe', 'Participante activa en misiones locales', true, 'Norte', 5),

('miembro6@iglesiasion.com', 'Andrés', 'Martín', '12345693', '555-0016', 'Avenida Crecimiento 507', 'server',
 '1986-07-08', true, '2006-05-20', 'Sur', true,
 'married', 'Maestro', 'Licenciatura en Educación', 'Crecimiento espiritual',
 'Educación Cristiana', '2006-03-15', true, '2006-03-15',
 'Amor', 'Enseña en escuela dominical', true, 'Sur', 5),

('miembro7@iglesiasion.com', 'Camila', 'Rivera', '12345694', '555-0017', 'Plaza Alabanza 618', 'server',
 '1993-11-14', true, '2011-08-05', 'Centro', true,
 'single', 'Músico', 'Conservatorio', 'Ministerio de música',
 'Música y Adoración', '2011-06-20', true, '2011-06-20',
 'Esperanza', 'Líder de alabanza', true, 'Centro', 5),

('miembro8@iglesiasion.com', 'Sebastián', 'Ortiz', '12345695', '555-0018', 'Calle Servicio 729', 'server',
 '1984-02-28', true, '2004-12-18', 'Norte', true,
 'married', 'Técnico', 'Técnico en Electrónica', 'Necesidad espiritual',
 'Tecnología y Medios', '2004-10-10', true, '2004-10-10',
 'Fe', 'Mantiene equipos de sonido', true, 'Norte', 5),

('miembro9@iglesiasion.com', 'Natalia', 'Herrera', '12345696', '555-0019', 'Boulevard Familia 830', 'server',
 '1990-06-16', true, '2008-04-22', 'Sur', true,
 'married', 'Psicóloga', 'Psicología', 'Búsqueda personal',
 'Consejería Pastoral', '2008-02-15', true, '2008-02-15',
 'Amor', 'Apoya en consejería familiar', true, 'Sur', 5),

('miembro10@iglesiasion.com', 'Gabriel', 'Moreno', '12345697', '555-0020', 'Plaza Esperanza 941', 'server',
 '1987-10-03', true, '2007-07-08', 'Centro', true,
 'single', 'Arquitecto', 'Arquitectura', 'Evento de construcción',
 'Infraestructura', '2007-05-20', true, '2007-05-20',
 'Esperanza', 'Ayuda en proyectos de construcción', true, 'Centro', 5);

-- Actualizar referencias de cell_leader_id (después de insertar todos los usuarios)
UPDATE users SET cell_leader_id = (SELECT id FROM users WHERE email = 'lider.celula1@iglesiasion.com') WHERE cell_group = 'Esperanza';
UPDATE users SET cell_leader_id = (SELECT id FROM users WHERE email = 'lider.celula2@iglesiasion.com') WHERE cell_group = 'Fe';
UPDATE users SET cell_leader_id = (SELECT id FROM users WHERE email = 'lider.celula3@iglesiasion.com') WHERE cell_group = 'Amor';

-- Crear algunos usuarios inactivos para pruebas
INSERT INTO users (
    email, first_name, last_name, id_number, phone, address, role, 
    birth_date, baptized, is_active, marital_status, occupation
) VALUES 
('inactivo1@iglesiasion.com', 'Usuario', 'Inactivo1', '99999001', '555-9991', 'Calle Inactiva 100', 'server',
 '1985-01-01', false, false, 'single', 'Sin ocupación'),
('inactivo2@iglesiasion.com', 'Usuario', 'Inactivo2', '99999002', '555-9992', 'Calle Inactiva 200', 'server',
 '1990-01-01', false, false, 'married', 'Sin ocupación');

-- Mostrar resumen de usuarios creados
SELECT 
    role,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN is_active = true THEN 1 END) as activos,
    COUNT(CASE WHEN baptized = true THEN 1 END) as bautizados
FROM users 
GROUP BY role 
ORDER BY 
    CASE role 
        WHEN 'pastor' THEN 1 
        WHEN 'staff' THEN 2 
        WHEN 'supervisor' THEN 3 
        WHEN 'server' THEN 4 
    END;
