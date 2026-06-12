-- ============================================================
-- SionERP - Seed generado automáticamente
-- Generado: 2026-06-09T21:58:26.056Z
-- Fuente:   /Users/danzt/Codes/SionERP/data/DATA IGLESIA SION ACT. 14-12-25 (1).xlsx
--
-- Para regenerar: node scripts/generate-seed.mjs
-- Para aplicar:   supabase db reset
-- ============================================================

SET session_replication_role = replica;

-- ========================
-- MÓDULOS
-- ========================
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
  ('base',         'Sistema Base',  'Funcionalidades principales: Usuarios, Configuración', true,  NOW()),
  ('discipleship', 'Discipulado',   'Gestión de grupos, jerarquías y reportes',             true,  NOW()),
  ('zones',        'Zonas',         'Gestión de zonas territoriales',                        true,  NOW()),
  ('events',       'Eventos',       'Eventos de la iglesia',                                 false, NULL),
  ('reports',      'Informes',      'Informes y estadísticas avanzadas',                     false, NULL)
ON CONFLICT (key) DO UPDATE SET
  is_installed = EXCLUDED.is_installed,
  installed_at = CASE WHEN EXCLUDED.is_installed THEN COALESCE(modules.installed_at, NOW()) ELSE NULL END;

-- ========================
-- ZONAS
-- ========================
INSERT INTO public.zones (id, name, description, color, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'OESTE 1', 'Zona Oeste 1', '#3b82f6', NOW(), NOW()),
  ('c0000002-0000-0000-0000-000000000002', 'OESTE 2', 'Zona Oeste 2', '#10b981', NOW(), NOW()),
  ('c0000003-0000-0000-0000-000000000003', 'OESTE 3', 'Zona Oeste 3', '#f59e0b', NOW(), NOW()),
  ('c0000004-0000-0000-0000-000000000004', 'ESTE', 'Zona Este', '#ef4444', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================
-- MIEMBROS (581 filas en Excel → 575 importados)
-- Admin se crea via bootstrap.go al levantar el backend
-- ========================
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('3317c478-1aab-458e-b5cd-bbdb89ffd5a1', 'CLENNY DEL VALLE', 'SIRA ORIA', '13202178@sionerp.local', '4127899614', 'URB. VELITA 4 AV. 1 N 30', '13202178', 'server', '1975-08-13', '2014-07-27', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('b1eb95e7-33c5-4efd-94cb-915a0a55e83a', 'JESUS ALEXANDER', 'PIÑEREZ ZAVALA', 'alexlaley13@gmail.com', '4122802712', 'PUEBLO NUEVO CALLE BUCHIVACOA ENTRE SUCRE Y MARA N 24', '13496864', 'server', NULL, NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('8474e7c8-9852-49f3-a3e5-fe03a6d4d72d', 'ANDREA', 'TOYO', 'andreatoyo13.@gmail.com', '4146013277', 'CALLE CHURUGUARA CON MILAGROS E ISLA', '32424451', 'server', '2006-10-13', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6ad91586-9a41-4ed1-9817-5f316ebe4c29', 'MARY LENIS', 'TIGRERA', 'marylenistigrera46@gmail.com', '4126301396', 'CALLE PALMASOLA N 138 CON SUCRE Y GIRARDOT', '9518830', 'server', '1968-07-08', '1986-03-16', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0610cf50-e42c-4c6d-9795-9d32a034c5ee', 'ANDRINET ESTER', 'ACOSTA GUTIERREZ', 'andrinet2009@gmail.com', '4246665921', 'CALLE NUEVA ENTRE SUCRE Y CALLEJON SUCRE', '20213165', 'server', NULL, NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('047d90d4-80be-4ea9-9bde-ad36768d0b6c', 'LILA G', 'MORILLO CH', 'lilamorillo0901@gmail.com', '4121701768', 'CALLE PALMASOLA SECTOR PUEBLO NUEVO, CALLE MIRANDA', '9527783', 'server', NULL, NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0f220b5f-0ab1-4fe7-a909-63fb933298d0', 'DANIEL DAVID', 'GUTIERREZ YORIS', 'quetalaaa464@gmail.com', '4165639639', 'CALLE TOLEDO CON ZAMORA', '30800097', 'server', '2005-05-27', '2023-04-16', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('4facf838-ab76-48bf-8dac-09e75f311b4f', 'GENESIS', 'GOMEZ', 'genegomez780@gmail.com', '4146013277', 'CALLE CHURUGUARA ENTRE MILAGROS E ISLA', '19006576', 'server', '1990-02-14', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('f52e6001-6498-45c7-8b3f-ab6ea725ac59', 'MARIETZY', 'DORANTE TIGRERA', 'dorantemarietzy@gmail.com', '4246174628', 'CALLE PALMASOLA ENTRE SUCRE Y GIRARDOR N 138', '29600863', 'server', NULL, NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('afd44bc3-eddc-4d6b-a5ee-0481e0684aa5', 'AIDALIS COROMOTO', 'SANGRONIS', 'aidalissangronis3@gmail.com', '4246655798', 'CALLEJON SUCRE ENTRE SUCRE Y MARA', '18770297', 'server', '1982-12-25', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('fc0cd98c-56f3-4ded-82fa-2832905e3310', 'YILEINA ENCARNACION', 'JIMENEZ DIAZ', 'yileinajdiaz@gmail.com', '4146800428', '', '7497122', 'server', NULL, NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('a8c49239-9191-4ff1-b625-e206dd75451a', 'INGRID', 'PARTIDA MALDONADO', 'ingridp2211@hotmail.com', '4246534492', 'AV. ALI PRIMERA CON AV. SUCRE', '10702117', 'server', NULL, NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('99638bc0-a5c8-44a2-9c1d-e8892b915e65', 'ANA ROSA', 'NAVARRO', '1962138@sionerp.local', '', 'CALLE MILAGROS ENTRE CALLES CHURUGUARA Y LIBERTAD', '1962138', 'server', '2023-04-16', '2023-04-16', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0434bc6f-63ac-4627-b772-827b4766de0d', 'MARIELIS', 'SANGRONIS', 'sangronismariely@gmail.com', '4125682028', 'CALLEJON SUCRE ENTRE LIBERTAD Y MARA', '15067895', 'server', '2001-06-09', '2001-06-09', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('66e2b0f9-b018-4f65-9c8a-adebdf86a0f1', 'MARIA AUXILIADORA', 'NAVAS', '7470730@sionerp.local', '', 'CALLE MILAGRO N 29', '7470730', 'server', NULL, '2022-04-01', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('7cc2d5b2-b9fd-4967-a1c1-0419ae65380d', 'YGNACIA RAMONA', 'REYES COLINA', 'igcolina09@gmail.com', '4122354496', 'CALLE LIBERTAD CON SUCRE N 21', '10476862', 'server', '1967-06-30', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('3e1a85a3-a97e-4a48-80c1-66c591b6d004', 'IRALUZ JOSEFINA', 'BRACHO LEON', 'irabracho@gmail.com', '4126851681', 'CALLE LIBERTAD CON SUCRE N 27', '24595633', 'server', '1992-01-01', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('7357f49a-a5d8-4f76-a097-9627a54050cd', 'JUAN CARLOS', 'GONZALEZ', 'juanc.gonzalez.2014@gmail.com', '4246778967', 'CALLE EL SOL CON SOLON', '14796794', 'server', '1977-12-29', '2022-02-04', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('991d8b95-79bb-4fd7-8ecb-8c7ff798bb77', 'NOHEMI MARGARITA', 'LUGO DE COLINA', 'nohemymic30@gmail.com', '4129540953', 'CALLE LIBERTAD CON LEON FARIAS', '7499576', 'server', '1963-07-30', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('ea17e07b-1dd7-4ccc-b52c-35b35c162116', 'RONALD JOSE', 'FONTANA BARRIO', 'juleinfontana@gmail.com', '4246662794', 'CALLE FEDERACION CON GARCES', '12326704', 'server', '1971-09-09', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('641866b5-3173-460b-afbb-fffa9ab2f068', 'JULEIN SOFIA', 'DE FONTANA', '11767872@sionerp.local', '4146507962', 'CALLE FEDERACION CON GARCES', '11767872', 'server', '1975-05-07', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('f26c9549-a844-4070-b4e9-757862374504', 'SIXTO RAMON', 'ARGUELLES MARIN', 'urumania.20@gmail.com', '4120742061', 'CALLE LIBERTAD N 54 CON LEON FARIAS Y MILLAR', '2362858', 'server', '1942-03-28', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('58ac613e-42b0-4408-bc46-1eeef1b0a34b', 'CAROLINA', 'PEROZO GRANADILLO', 'carolinaperozo@gmail.com', '', 'CALLE BUCHIVACOA', '9525147', 'server', '1968-04-02', '2025-10-12', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('009694ab-37b0-48d0-91e0-051c3de877b3', 'LOLIMAR JOSEFINA', 'PEREIRA ZARRAGA', 'lolimarpereira50@gmail.com', '4246856216', 'CALLE LEON FARIAS ENTRE LIBERTAD Y CAMPO ELIAS', '11478631', 'server', '1972-02-05', NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('2a6757ef-287c-4566-ac61-dbffe027b903', 'ZULEIMA DEL VALLE', 'MAIMO DIAZ', 'vallemaimo@gmail.com', '4141645370', 'CALLE COLON ENTRE LIBERTAD Y MONZON N 65-1', '9521496', 'server', '1967-01-09', '2013-11-13', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('b4756620-2de1-410e-b757-c10c843d72d2', 'ISMARI ALEJANDRA', 'GOMEZ HERNANDEZ', 'ismaridesibada@gmail.com', '4246476469', 'CALLE COLON ENTRE MONZON Y LIBERTAD', '20295113', 'server', '1988-03-23', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('8df93d8a-a2c4-4e56-85d1-4beda560a714', 'KARLEY JASKON', 'SIBADA SANCHEZ', 'import.28@sionerp.local', '4246476469', 'CALLE COLON ENTRE MONZON Y LIBERTAD', '', 'server', '1987-09-29', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('d12864b7-fe54-45cd-832c-4503d1d81d20', 'ISLENDYS', 'AVILA', 'isabel196duno@gmail.com', '4121240269', 'CALLE BRION ENTRE ISLA Y MILAGRO', '14396196', 'server', '1977-11-20', '2023-12-08', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('8ccecd5e-c64a-4286-9132-ce662edffef8', 'DIGLENYS LORENA', 'PACHANO GARCES', 'contadorapachano@gmail.com', '4246149646', 'CALLE COLON ESQUINA CALLE LA PAZ N 29', '17351979', 'server', '1986-07-20', '2025-10-12', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('1c86bb9a-fb41-437a-9274-1fdb4124416e', 'JHOANNYS NAZARETH', 'PIÑA LUGO', 'jhoannys+npl@hotmail.com', '4146849390', 'CALLE LIBERTAD CON MILLAR', '24308724', 'server', '1993-09-03', '2010-10-23', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('68a53fea-9b14-4a7b-b57e-f54e2f1947ba', 'NOE ROLANDO', 'VENTURA COBIS', 'noeventura4@gmail.com', '4226429503', 'CALLE PORVENIR ENTRE MILLAY Y PROYECTO', '27543845', 'server', '2000-09-04', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('1c091f09-9f2c-455d-bc55-a2212753df32', 'ROSA MARIA', 'COLINA CHIRINOS', '11474700@sionerp.local', '', 'CALLE MONZON N 93 ENTRE FEDERACION Y COLON', '11474700', 'server', '1969-10-24', '2007-05-15', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('1852127e-eafa-4683-8cfc-f15726e682aa', 'IRAIRA JOSEFINA', 'MORENO DE RIVERO', 'lengualiteraturalatin@hotmail.com', '4267629359', 'CALLE BRION ENTRE COLON Y PROVIDENCIA N 27, SECTOR LA GUINEA', '5287183', 'server', '1953-05-07', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('48970f0a-d3ed-4645-82fe-45d3674ff63b', 'MAGALY COROMOTO', 'PENICHE COLINA', 'cristgar34@gmail.com', '4246448567', 'CALLE FEDERACION CON GARCES', '4788456', 'server', '1955-12-17', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('01af9293-31d4-4c1c-9ffe-ce71b58403ff', 'ANTONIO JOSE', 'CHIRINOS GOMEZ', '3676363@sionerp.local', '4121232076', 'VELITA 2 V 56 N 3', '3676363', 'server', '1950-10-27', '2018-10-14', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('66e79b1b-4046-450e-965f-f12727ddd9dd', 'ELISA ELENA', 'MORA CHIRINOS', 'morachirinoselisa@gmail.com', '4121232076', 'VELITA 2 V 56 N 3', '10706569', 'server', '1968-06-04', '2013-08-12', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('3d7ff2d0-b2e5-41c6-a088-42fc0a5b6e74', 'MARGARITA', 'PALENCIA', '4640751@sionerp.local', '4126579065', 'CALLE MONZON CON COLON Y LEON FARIAS', '4640751', 'server', '1948-10-26', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('618871d1-f355-411c-b7fe-e9eab632d625', 'CELISMAR', 'PALENCIA CUARTT', 'celismarpalencia@gmail.com', '4126579065', 'CALLE MONZON ENTRE COLON Y LEON FARIAS', '10708737', 'server', '1971-11-28', NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('d3cce20f-97a0-41a8-9112-74a1c218aaf1', 'RIGCELIS GUADALUPE', 'FERRER PALENCIA', 'rigcelisferrer@gmail.com', '4126672795', 'CALLE MONZON ENTRE COLON Y LEON FARIAS', '33252519', 'server', '2008-03-03', NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('7f505bdd-1317-494d-bf92-755cfa290908', 'JORGELIS ESTEFANI', 'FERRER PALENCIA', '33509443@sionerp.local', '4124169491', 'CALLE MONZON ENTRE COLON Y LEON FARIAS', '33509443', 'server', '2010-06-07', NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('eef04377-327f-4af7-b24f-de9fdc40e580', 'JEHIFRI NER', 'LOPEZ GARCIA', 'jehifri@gmail.com', '4248662974', 'CALLE BRION ENTRE FEDERACION Y COLON N 11-8', '16830450', 'server', '1984-01-05', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('34628f78-8966-4ec6-a08e-35643b446177', 'LUISANA', 'DECENA DE LOPEZ', 'decenaluisana@gmail.com', '4121240450', 'CALLE BRION ENTRE FEDERACION Y COLON N 11-8', '14102377', 'server', '1978-04-19', '1996-09-01', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('d0e92471-d35f-4fdf-9aaf-6f9d114486ae', 'LUCIA JEHILU', 'LOPEZ DECENA', '34817733@sionerp.local', '4121240450', 'CALLE BRION ENTRE FEDERACION Y COLON N 11-8', '34817733', 'server', '2011-08-16', '2025-11-09', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0cbb5da3-65df-4046-96c8-85cef8059bf3', 'MARIELA MARGARITA', 'MARTINEZ LUGO', 'azulyrosa3000@gmail.com', '4262675874', 'CALLE FEDERACION N 80', '11479051', 'server', '1970-01-30', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('88ce241a-c930-4c4c-b2f3-7b54d307c9ab', 'JOSE DARIO', 'MEDINA HERNANDEZ', '10704366@sionerp.local', '4165148442', 'CALLE LIBERTAD', '10704366', 'server', '1968-02-20', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('c80c1e1b-8f38-4f54-abaa-f0cf54969398', 'WILLIANNYS ESTHER', 'ROMERO EGURROLA', 'wilegurrola@gmail.com', '4167997293', 'VELITA 2 CALLE 23', '29513198', 'server', '2000-05-25', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('a2daf2ec-e2b2-4972-9fd1-e2e19803c113', 'CRISTOPHER DANIEL', 'HERRERA GARCIA', 'cristopherdanielherreragarcia@gmail.com', '4246978284', 'CALLE SAN MARTIN, SECTOR PUEBLO NUEVO 1', '32424675', 'server', '2006-03-26', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('b732c4ca-29e4-44ea-b6ba-db7e9e934248', 'MARIHUM BERMARYS', 'CHIRINOS PEREZ', 'marihumchirinos9@gmail.com', '4123494911', 'CALLE BUCHIVACOA ENTRE SUCRE Y MARA', '33463798', 'server', '2010-06-04', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('f9f76e13-67c9-4670-a968-ba5bd1200273', 'JHOANGEL DAVID', 'ARGUELLES CHAVIER', 'arguellesjhoangel36@gmail.com', '4124625830', 'CALLE MILAGRO', '33664131', 'server', '2006-11-14', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('c5cef399-a8c1-4353-98e6-f467a9521b79', 'LUANNADYS COROMOTO', 'ESPLUGA GUTIERREZ', 'eluannadys@gmail.com', '4124414867', 'VELITA 1 BLOQUE 11 APTO 0007', '18048923', 'server', '1986-06-16', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('7a930e46-da91-4149-94f0-a9a7470b7352', 'GERALITH SARAI', 'NARANJO MEDINA', 'geralithsarainaranjomedina@gmail.com', '4120621595', 'LIBERTADORES DE AMERICA M 32 N 12', '28403944', 'server', '1998-09-04', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('8ce89860-6846-42b9-b879-d30f3b19c72c', 'VICTOR RAMON', 'CHIRINOS CHIRINOS', '10703699@sionerp.local', '4246532725', 'CALLE POPULAR CASA 14-A', '10703699', 'server', '1964-01-20', '2025-03-09', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('c8903413-40cd-4684-90ca-92873420ed05', 'SERGIO SEGUNDO', 'GARCIA', 'sergiogar1010@gmail.com', '4246804441', 'CALLEJON CHEVROLET ENTRE NORTE Y MIRANDA', '10477708', 'server', '1968-10-03', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('2d06edb4-ef7e-42fb-8aae-523b6b9bde61', 'DANIELA ABIGAIL', 'PARTIDAS ACOSTA', 'partidasda25@gmail.com', '4161616118', 'CALLE MONZON, SECTOR LA GUINEA', '27005495', 'server', '2000-01-25', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6731d8fc-f419-4f6c-92b5-ae09d9a6af3d', 'JESUAN DANIEL', 'GARCÍA MAVARE', '25613771@sionerp.local', '4227093336', 'CALLE MONZON SECTOR LA GUINEA', '25613771', 'server', '1997-04-02', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('9889447b-c375-4155-93ee-105edd6244db', 'JUAN CARLOS', 'GALINDEZ BUENO', 'galindejuancarlosb130@gmail.com', '4125178329', 'CALLE PROVIDENCIA CON PORVENIR', '31574577', 'server', '2004-07-02', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('4963e65b-53b5-4d08-9619-1d1a87f893de', 'JEYME DEL CARMEN', 'MAVARE LUGO', 'yeimemavare39@gmail.com', '4121683924', 'CALLE BRION ENTRE COLON Y PROVIDENCIA N 27, SECTOR LA GUINEA', '13202341', 'server', '1977-09-15', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('3863cb44-320b-49ae-9c5c-517565d2941b', 'NAYMAR YERARDIN', 'GOMEZ MOLINA', '20682743@sionerp.local', '4246611290', 'CALLE MILLAR ENTRE BRION Y NUEVA', '20682743', 'server', '1990-05-29', '2024-03-29', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('f494b0e6-8950-4b5c-bc20-d4c5492ca9b7', 'MAYRET BETANIA', 'HERNANDEZ JIMENEZ', 'mayret.hernandezj@gmail.com', '4146910671', 'CALLE PORVENIR ENTRE MILAGRO Y AV SUCRE', '24680280', 'server', '1994-09-21', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0e200ee4-e08e-43f8-9c22-c55e2fa143da', 'MARIA NELA', 'JIMENEZ DE HERNANDEZ', 'mjm01.04.65@gmail.com', '4146865739', 'CALLE PORVENIR ENTRE MILAGRO Y AV SUCRE', '9527189', 'server', '1965-04-01', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('e3f2db0d-1479-46ed-b6ab-336d0f171dac', 'MAEVA ISABEL', 'JIMENEZ DE VARGAS', 'misabelvictoriosa@gmail.com', '4246656085', 'CALLE POPULAR N 25', '16942780', 'server', '1985-04-05', '2006-12-10', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6113aa24-2efe-434b-8722-a1d8adae1207', 'SARAH VALENTINA', 'VARGAS JIMENEZ', 'swj02@gmail.com', '4246359662', 'CALLE POPULAR N 25', '33252592', 'server', '2009-10-02', '2015-10-12', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('3ad0bd60-0713-4ce5-9909-b5291db967b3', 'JOCSIMAR JEANNETTE DE LA CHIQUINQUIRA', 'GARCIA GOMEZ', 'jocsymar1010@gmail.com', '4121257457', 'CALLE MILLAR ENTRE BRION Y NUEVA', '32148887', 'server', '2006-11-18', '2024-03-29', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('d36b5ae5-bde5-4778-9296-7af93621bde8', 'RENATA ZURIEL', 'VARGAS JIMENEZ', 'rzvj08@gmail.com', '4144016633', 'CALLE POPULAR ENTRE PROYECTO Y PROVIDENCIA N 25', '34490562', 'server', '2012-08-08', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6521c2ac-0d6b-4eb3-ade5-c121a698eada', 'REGULO EMILIO', 'HERNANDEZ VILLA', 'reguloemilio@gmail.com', '4246178194', 'CALLE PORVENIR ENTRE MILAGRO Y AV. SUCRE', '9510841', 'server', '1965-03-30', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('06022f21-a9af-423c-a1de-52d4bf77569b', 'YOEL ERNESTO', 'VARGAS ODUBER', 'yoeldecristo@gmail.com', '4246224033', 'CALLE POPULAR N 25', '14167283', 'server', '1980-01-23', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('669a1b96-8762-49ad-b00c-fb951125482c', 'NORMA JOSEFINA', 'DIRINOT COLINA', 'normadirinot@gmail.com', '4129662919', 'CALLE MONZON CON MILAGROS N 5', '9502919', 'server', '1966-05-15', '2023-12-10', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('335f761c-b987-4109-b2a6-b16968d4c590', 'IRIS AURORA', 'ACOSTA VILLAVICENCIO', 'irisacosta458@gmail.com', '4246584069', 'CALLE EL TENIS N 25', '5295087', 'server', '1956-06-29', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('ddc049c1-9ff4-44d9-91ee-192e6db1a9da', 'PASTORA OLIMPIA', 'ACOSTA VILLAVICENCIO', '9529284@sionerp.local', '4120737545', 'CALLE EL TENIS N 25', '9529284', 'server', '1967-10-25', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('5dfefbf6-3397-4294-bf7a-d6cab32d5ec0', 'GLORYS DEL VALLE', 'CHIRINO ACOSTA', 'gloryschirino@gmail.com', '4246584069', 'CALLE EL TENIS N 25', '14262269', 'server', '1979-05-19', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('9c06d5dd-5f38-43cb-8c79-c83bf65240c4', 'NUGLENNIS CARILEN', 'SUARCEZ SUAREZ', 'nuglennyssuarcez@gmail.com', '4266258023', 'CR. JUAN C. FALCON ED. FALCON AP. 01', '14027164', 'server', '1976-01-27', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('8f28eaa8-c640-43d2-a145-6636b3d8e776', 'JAVIER JOSE', 'RUIZ MORALES', 'vidaamorpazjaviruiz24@gmail.com', '4146570110', 'URB. AMPIES, CALLE 3', '24809848', 'server', '1994-01-22', '2023-04-16', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('e141a306-28c7-426b-b4c8-d4579275d7a3', 'JACKELINA COROMOTO', 'RODRIGUEZ GARCIA', 'rodriguezjackelina08@gmail.com', '4125120808', 'CALLE TENIS CON COLON', '9505470', 'server', '1963-10-17', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('5e6f12bc-2af3-4b04-a45c-70fe2858f760', 'ELIONAI ISAAC', 'SUARCEZ SUAREZ', 'sselionai01@gmail.com', '4246283158', 'VELIA 2 CALLE 18', '13901189', 'server', '1977-07-11', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('b834510e-81d9-4707-917b-373b330cdbce', 'NORQUIS CRISTINA', 'MEDINA SUAREZ', 'norkismedina00@gmail.com', '4127229219', 'PARCELAMIENTO CRUZ VERDE CALLE VICTOR MARQUEZ N 10', '12184741', 'server', '1973-05-16', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('990ab7a4-0a9e-4b3a-a075-6f4ef2960491', 'SARELYS ANDREINA', 'COLINA MIRANDA', '20932702@sionerp.local', '4124479674', 'LAS EUGENIAS 4 ETAPA', '20932702', 'server', '1990-09-27', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('bfa5fc3a-09d5-4129-9e44-ee587f01bc0d', 'ENMANUEL JAVIER SCHILLACI', 'IBARRA MUÑOZ', '20568872@sionerp.local', '4126450243', 'LAS EUGENIAS 4 ETAPA', '20568872', 'server', '1990-10-12', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('83f9dd7d-3cc6-48cf-8121-d70bd71d0258', 'ALEJANDRA', 'ZARRAGA MARTINEZ', 'alejaza20@gmail.com', '4246076252', 'CALLEJON BORREGALES SECTOR MONTE VERDE II', '18047140', 'server', '1986-02-13', '2010-10-05', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0c4374de-4e99-4cdf-8b28-fa95f0558919', 'OLGA MARINA', 'YAGUA', 'olgayagua349@gmail.com', '4244015768', 'CALLEJON  BORREGALES SECTOR MONTE VERDE', '9925361', 'server', '1963-10-05', '2010-10-05', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('25012525-b25f-4c82-9eca-7248bddc76d3', 'LUIS MANUEL', 'MARTINEZ OLLARVES', 'manuel.im27@gmail.com', '4246845374', 'CAJA DE AGUA SECTOR LA PEÑITA', '9528956', 'server', '1966-02-22', '2010-10-21', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('66e5725c-3d9f-45e4-8aa5-83a37f4e2ef3', 'DULCIDA MARINA', 'MORLES DE DAVALILLO', 'dulcidamorles@gmail.com', '4121027439', 'CALLE AMPIES ENTRE AV, RUIZ PINEDA Y CALLE 3 DE LA URB. AMPIES', '5290025', 'server', '1957-04-23', '2010-10-21', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('28ec6091-9723-46c1-9b7c-79cbf584a007', 'NELSON JESUS', 'DAVALILLO GAUNA', '4102369@sionerp.local', '', 'CALLE AMPIES ENTRE AV, RUIZ PINEDA Y CALLE 3 DE LA URB. AMPIES', '4102369', 'server', '1949-06-01', '2012-01-22', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('793a66fa-500b-4482-9e92-b5b0f05937c8', 'ROSIMAR CAROLINA', 'DAVALILLO MORLES', 'rosimar-davalillo@hotmail.com', '4146894698', 'CALLE AMPIES ENTRE AV, RUIZ PINEDA Y CALLE 3 DE LA URB. AMPIES', '16708186', 'server', '1985-08-26', '2007-10-21', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('2202b255-1250-4ea6-b735-c80f29cac4a9', 'JOSE GREGORIO', 'FERRER PAZ', 'dabajuro1973@gmail.com', '4128480073', 'CALLE COLON N 91 ENTRE DEMOCRACUA Y SOL, CURAZAITO', '12588794', 'server', '1973-12-20', '1994-12-05', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('ebb6df49-d459-4e49-b5ea-14342279b8af', 'MIGDALIA', 'GARCIA', 'migdaliag26g@gmail.com', '4246468024', 'CALLE PROYECTO CON PALMASOLA', '12735725', 'server', '1974-12-26', '2012-04-16', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('71d7f9fd-7a06-4f6c-906e-629023a577a1', 'ALEXIS JESUS', 'REYES GARCIA', 'masteralexislfna@gmail.com', '4141655545', 'CALLE CHURUGUARA', '28092039', 'server', '2000-09-10', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('13b33e5c-c40d-4af4-9e20-78a351266030', 'VIRGINIA', 'QUIVA', 'virginiaquiva2013@gmail.com', '4146071765', 'AV. BOLIVARIANA JOSEFA CAMEJO', '17923671', 'server', '1986-06-09', '2014-07-27', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('77e0c849-dcc8-45f2-8cb0-ec9a89b68f3a', 'CECILIA', 'CHIRINO', 'chirinocecilia29@gmail.com', '4125472783', 'CASTULO MARMOL FERRER CALLE MAMA PANCHA', '7479654', 'server', '1960-11-22', '1979-02-20', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('0d3d0b0e-5163-45f0-a755-467e89fc57fd', 'SARA MARIA', 'CHIRINO DE CALATAYUD', 'saramariachirinoarias@gmail.com', '4163608660', 'PARC. CASTULO MARMOL FERRER AV. BOLIVARIANA N 15', '7496264', 'server', '2025-07-27', '2015-03-09', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6a35a4fa-7dab-457f-909e-15532752dd33', 'JONATHAN JOSE', 'GARCIA SIRA', 'senyigarcia2004@gmail.com', '4120457636', 'CALLE SAN MARTIN N 4', '30892729', 'server', '2004-04-20', '2023-12-10', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('75305fd2-e5fb-467d-883f-c6c839601fb1', 'ASDRUBAL DAVID', 'HERRERA GARCIA', 'asdrubitadavid@gmail..com', '4146663304', 'CALLE SAN MARTIN N 4', '32425021', 'server', '2007-05-19', '2007-05-19', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('aa4cc09f-a51e-4dbb-aba7-7616ffeaa568', 'NELSON EBANO', 'ROMERO BARCO', '2021gerardo.20@gmail.com', '4163657876', 'CASTULO MARMOL FERRER CALLE HNOS CHICA', '9629053', 'server', '1969-01-28', '2019-12-08', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('6d6d4dc2-bd92-4722-9100-eda171660349', 'IRISMAR CAROLINA', 'LOPEZ RIVERO', 'lopezirismar1982@hotmail.com', '4166627122', 'AV. ALI PRIMERA ENTRE PROYECTO Y 23 DE ENERO', '15558181', 'server', '1982-02-14', '2014-08-28', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('9b847857-8a6b-4418-8d84-2d9606c15650', 'HALWILENMAY NAZARET', 'MIRANDA YORIS', 'nazaretmirandayoris@gmail.com', '4260483835', 'PANTANO ABAJO CALLE NORTE ENTRE 23 DE ENERO Y PROYECTO', '19824634', 'server', '1991-09-04', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('b9b80192-b7b3-4936-ba31-d03e313c9c6f', 'KATIUSCA', 'CHIRINOS', 'katiuscachiri@gmail.com', '4246552547', 'CASTULO MARMOL FERRER', '', 'server', '1975-05-17', '2004-10-17', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('d24d82e2-b845-4481-bdef-58cb024ab40d', 'RICHAR', 'PEREZ', '12368795@sionerp.local', '4246373961', 'CASTULO MARMOL FERRER CALLE MAMA PANCHA N 19', '12368795', 'server', '1973-12-04', NULL, false, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('aefe65ca-8366-4ac6-9374-f7fdc132963c', 'SILVIA GUADALUPE', 'MARTINEZ LUGO', '7495502@sionerp.local', '4123378451', 'CALLE FEDERACION N 80', '7495502', 'server', '1962-02-10', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('e3cb8131-5d50-4d63-959d-e164ea637ec4', 'YASMIRA LISBETH', 'MARTINEZ TIMAURE', '15777250@sionerp.local', '4163657876', 'CASTULO MARMOL FERRER CALLE HNOS CHICA', '15777250', 'server', '1981-01-10', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('62951a0f-00e9-48a9-a8ac-15c62ae44db3', 'EDGAR', 'CHIRINO', 'edgarchirino879@gmail.com', '4246950780', 'CASTULO MARMOL FERRER CALLE PPAL', '12733299', 'server', '1973-10-07', '1973-10-07', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('67c8b14a-be04-4b08-808b-40c2568cca36', 'MARIA EDITA', 'ROMERO', 'romerodemedina56@gmail.com', '4246353259', 'PANTANO ABAJO CALLEJON NORTE N 82', '4793413', 'server', '1956-11-01', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('4376b1b3-3c46-4b99-a4d8-da2729355d11', 'ELEARMY FRANCISCO', 'OLIVERA COVIZ', 'franovioficial@gmail.com', '4120667321', 'URB. CRUZ VERDE CALLE 7 VEREDA 8', '21668957', 'server', '1992-06-18', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('ed8c33bc-4b75-43c4-8db3-39ec9e77edb7', 'JULIO JOSE', 'COLINA BORGES', 'juliocolina41253@gmail.com', '4260635742', '', '5290168', 'server', '1953-12-04', '1979-04-15', true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('460ba03f-3973-4b9e-9d34-254fc74889e3', 'LUIS DANIEL', 'GARCIA MOSQUERA', 'luigy2410@gmail.com', '4126853823', 'UCV. SECTOR 5 V14 N 11', '21113689', 'server', '1991-10-24', '2006-05-21', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('623d3edc-e5d9-4e89-ae81-4d1daa1d0466', 'YOLANDA RAMONA', 'CHIRINOS', '7486182@sionerp.local', '4246130665', 'PANTANO ABAJO CALLE VUELVAN CARAS N 120', '7486182', 'server', '1947-10-27', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('557c6a37-30ff-40b1-aa60-e18779b721f8', 'LISBETH GREGORIA', 'SANCHEZ CHIRINOS', '25127648@sionerp.local', '', 'PANTANO ABAJO CALLE VUELVAN CARAS N 120', '25127648', 'server', '1962-10-15', NULL, false, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('ac710b70-b7d3-4899-bed6-ba61d93555a4', 'IVAN', 'MARIN', '9924586@sionerp.local', '4126832364', '', '9924586', 'server', '1968-05-25', NULL, true, false, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('c4f7b6ef-0da6-4c1c-864a-46cb0964be53', 'MOISES', 'NOGUERA', 'moisesno@gmail.com', '05493794184033', 'CALLE COLOMBIA', '2787121', 'server', '1943-12-20', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('42160e9d-18bf-43b2-87a4-6fad553330e9', 'GABRIELYS DIONELA', 'GALLARDO NOGUERA', 'gabrielysgallardo@gmail.com', '05493794184033', 'CALLE COLOMBIA', '30622452', 'server', '2004-03-24', '2020-05-13', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('2610034d-4cf1-4088-8d75-4fa856a9425c', 'GADBIELYS SARAI', 'GALLARDO NOGUERA', 'gsaraigallardo@gmail.com', '0543794587103', 'CALLE COLOMBIA', '32311052', 'server', '2006-03-15', '2020-05-13', true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('02c9b210-c479-448d-a751-3be484b4c5b4', 'YULENYS JOSEFINA', 'NOGUERA DE GALLARDO', 'yulenynogera@gmail.com', '05493794184033', 'CALLE COLOMBIA', '9504544', 'server', '1966-08-20', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('a95c633b-f3f9-46a9-8220-cc84229bb390', 'DIONEL', 'GALLARDO', 'danielgallardo51@gmail.com', '5493794184033', 'CALLE COLOMBIA', '3799917', 'server', '1951-06-05', NULL, true, true, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()),
  ('eb26d7d7-bbe3-43a8-aff2-7af26014788f', 'ELIZABETH DEL VALLE', 'HERNANDEZ', 'eliedi1984@gmail.com', '4129793831', 'CALLE CHURUGUARA CON AV. SUCRE', '16520887', 'server', '1984-02-17', '2017-12-24', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('34581a81-4838-409f-9924-3b8f38a07a06', 'EDIMAR ANGELIC', 'PARTIDAS HERNANDEZ', 'hernandezedimar88@gmail.com', '4246543948', 'CALLE CHURUGUARA CON AV. SUCRE', '31947434', 'server', '2007-03-14', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('fed5f96b-59f2-4f3a-87fd-37debc319164', 'VICTOR MANUEL', 'PARTIDAS HERNANDEZ', 'partidasm378@gmail.com', '4129793831', 'CALLE CHURUGUARA CON AV. SUCRE', '36523463', 'server', '2012-08-27', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('91700ea1-ce6d-4d58-ad00-060040263ec6', 'ELIAS MANUEL', 'PARTIDAS HERNANDEZ', '36523461@sionerp.local', '4129793831', 'CALLE CHURUGUARA CON AV. SUCRE', '36523461', 'server', '2014-09-04', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3b924d4f-dfd2-4a14-8b88-c7108046fb4f', 'KEYBERTH JOSE', 'QUINTERO CHIRINO', 'keyberthjosequintero@gmail.com', '4246749605', 'CALLEJON CHURUGUARA 28 JULIO', '33362430', 'server', '2010-06-20', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0d9102ec-f107-4cde-82d2-46cb766659b6', 'RUZ LUCMI', 'RIVAS CHIRINOS', 'lucmirivas17@gmail.com', '4120873335', 'CALLEJON CHURUGUARA 28 JULIO', '32915710', 'server', '2007-12-11', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('73f5d454-f969-4fa1-9a0b-7c26f32f9bec', 'ROMELIA', 'MOLINA', '7485200@sionerp.local', '4121033191', 'CALLE BUCHIVACOA', '7485200', 'server', '1955-09-27', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0dc2a0d2-f99e-4218-9211-3b6b9a57cdb8', 'MIRIAN MARBELLA', 'MIQUILENA ARGUELLOS', 'mirianmiquilena2@gmail.com', '4246124754', 'CALLE COLOMBIA, BARRIO CRUZ VERDE', '9925776', 'server', '1969-03-25', '2013-05-26', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a6857b3c-6c8e-4376-97f5-35c2d8f7cb6c', 'LUIS JOSÉ', 'RODRÍGUEZ', 'luisjoserodriguez2508@gmail.com', '4129644449', 'CALLE COLOMBIA, BARRIO CRUZ VERDE', '9924997', 'server', '1967-08-25', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('881dfe82-d9dc-476a-937d-3d53c861e541', 'IBRAHIN JOSÉ', 'RAMIREZ QUERALES', 'ibrahinjramirez@gmail.com', '4126638895', 'CRUZ VERDE, CALLEJON COLOMBIA', '20933502', 'server', '1993-06-28', '2015-06-28', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7d1546d0-507f-4f81-9792-c9b13a045038', 'FRANDAKER', 'UZCÁTEGUI', 'frandakeru@gmail.com', '4167684655', 'CVRUZ VERDE', '29535671', 'server', '2000-04-10', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('db83f3bb-aa77-4e3c-82ca-47b786746bbe', 'CANDIDA ROSA', 'RODRÍGUEZ', 'coropuntofijo67z@gmail.com', '4146653945', 'BARRIO CRUZ VERDE, CALLE COLOMBIA N 75', '6105906', 'server', '1955-08-30', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1a0eb8b6-eb33-44a9-9b20-d521cd330282', 'PABLO ANTONIO', 'PIRONA', '9513386@sionerp.local', '4146653945', 'BARRIO CRUZ VERDE, CALLE COLOMBIA N 75', '9513386', 'server', '1958-06-28', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2aeeb4c5-35c6-47fa-9c9a-6394e6b17072', 'IRIS CELESTE', 'JIMÉNEZ HERNÁNDEZ', 'iriscelestejh@gmail.com', '4124220337', 'CALLE MONZÓN, SECTOR LA FLORIDA', '', 'server', '1969-09-25', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1053c191-62a2-4a4b-b6f7-77c07b422abc', 'JOSEFINA', 'QUERALES YANEZ', 'josefinaquelez@gmail.com', '4125804184', 'CRUZ VERDE, CALLEJON COLOMBIA', '10479884', 'server', '1967-05-15', '2016-07-31', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('10b0b2e9-5257-47ad-aedf-6040718cd702', 'YOSMARI REBECA', 'GARCÍA CHIRINOS', 'yosmarirebecagarciachirinos@gmail.com', '4126451433', 'CALLEJON SUR ABAJO', '19001986', 'server', '1987-10-14', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c2f1f7cb-546a-42bc-a509-067a9ad73e01', 'ROSA EMILIA', 'RODRIGUEZ', 'remir9787@gmail.com', '4146362618', 'CRUZ VERDE, CALLEJON COLOMBIA', '9808459', 'server', '1967-03-23', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b9614362-9acc-4f6b-b298-fcbedb7f3ed8', 'JOSÉ LUIS', 'CHIRINO NOGUERA', 'lisbeth220471@gmail.com', '4246179421', 'SECTOR LA FLORIDA, CALLE NUEVA', '7496179', 'server', '1962-07-05', '2018-10-14', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a70b14fd-62bf-49b8-9698-9fce3be7ee45', 'LISBETH JOSEFINA', 'RUJANA FERRER', '12181692@sionerp.local', '4246179421', 'SECTOR LA FLORIDA, CALLE NUEVA', '12181692', 'server', '1971-04-22', '2013-10-12', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b13f3ff9-ec96-4939-8c37-52640cbf57e4', 'MARLENE JOSEFINA', 'VILLAVICENCIO', 'jv1781721@gmail.com', '4126828144', 'CALLE EL SOL CON AV. SUCRE', '10705661', 'server', '1967-02-15', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0d142713-0de0-4229-a68a-548946579bd4', 'LUISA', 'PETIT', 'luisapetit84@gmail.com', '4246649410', 'AV. SUCRE', '7481165', 'server', '1960-10-11', '2017-12-24', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b0a87399-248b-4481-af37-38abf35ba581', 'LUISIANNY GUADALUPE', 'HERNANDEZ COLINA', 'luisiannyhernandez179@gmail.com', '4125806918', 'CALLE SOL CON AV. SUCRE', '33363209', 'server', '2007-02-06', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('19d17a83-a199-49d3-ae85-c6226c909cec', 'ERIKSON DE JESUS', 'OESTE 2+B3', 'eriksonh240@gmail.com', '4121369929', 'CALLE SOL CON AV. SUCRE', '34817779', 'server', '2009-09-10', '2024-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0d45624d-7d33-4283-9c25-bbfae1eb9a52', 'DAAMELYS MARIA', 'CHIRINOS', '63mariadamelys@gmail.com', '414361148', 'CALLE MARA ENTRE LIBERTAD Y CAMPO ELIAS', '9508829', 'server', '1963-12-28', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c78c9405-fd9b-4f0a-b6a0-007fddbef8b7', 'MARIELA AUXILIADORA', 'ARGUELLES DIAZ', 'lela61800@gmail.com', '4122214603', 'CRUZ VERDE, CALLEJÓN RAÚL LEONI', '11141621', 'server', '1970-12-02', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0294c826-87d8-401e-a44b-8a8c46690ed7', 'DIEGO', 'YSEA', '33149673@sionerp.local', '4246667544', 'AV. SUCRE', '33149673', 'server', '2009-12-18', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('4286d71c-674e-4e63-9c39-12c34cb68000', 'DEYANIRA', 'LOPEZ ARGUELLES', 'lopezarguellesd15@gmail.com', '4121962612', 'CALLE MAPARARI ENTRE MILAGROS Y PROYECTO', '22600875', 'server', '1992-11-02', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a5dc8fca-fe46-4b52-a27b-68cb060e8fc0', 'JULIA ISAMAR', 'MORALES ARGUELLES', 'ysabella9623388@gmail.com', '4121401201', 'CRUZ VERDE, CALLE 2', '20212338', 'server', '1990-07-14', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('310dc8da-bd08-459c-b499-1bbb3153cf1f', 'NORYS JOSEFINA', 'MIQUILENA ARGUELLE', 'norismoquilena03@gmail.com', '4125600563', 'CALLE COLOMBIA N 48 BARRIO CRUZ VERDE', '9523276', 'server', '1965-02-03', '2014-07-27', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('16e20112-40cd-47a3-9043-799e7c49eba2', 'BERTHA MARÍA', 'VENTURA VELASQUEZ', 'berthamaria2903@gmail.com', '4146807810', 'JUAN C. FALCON EDF. CORO PB04', '9520075', 'server', '1968-04-16', '2010-03-15', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c432cab4-cbdc-4cdb-8729-3e2a6b637b30', 'INDRA VALENTINA', 'RUJANA FERRER', 'indraruja76@gmail.com', '4246225784', 'CALLE NUEVA N 11 LA FLORIDA', '14027295', 'server', '1976-05-07', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0de74590-8c12-4091-bb09-59470f3ff9fe', 'INDRIMAR COROMOTO', 'LAGUNA RUJANA', 'laguna@gmail.com', '4246287888', 'CALLE NUEVA N 11 LA FLORIDA', '29641644', 'server', '2002-09-03', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f4d6ca47-3c7c-478d-ae8e-30c66d024981', 'ELIZABETH JOSEFINA', 'VALERA', 'cristiandejesus992@gmail.com', '4160243083', 'CALLE NUEVA N 11 LA FLORIDA', '5296438', 'server', '1954-10-23', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('973b3f7a-6f73-402b-883a-895822561525', 'MAGLY JOSEFINA', 'ANTEQUERA COLINA', 'maglyantequera4@gmail.com', '4269604682', 'AV. SUCRE, SECTOR LA FLORIDA', '18047556', 'server', '1983-03-20', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a4f5d149-002b-48ae-b9b9-454f339e3d1d', 'MARIA ROMELIA', 'MORA COLINA', 'angerhh449@gmail.com', '4129683514', 'CALLE NUEVA SECTOR LA FLORIDA', '9509237', 'server', '1961-02-17', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cd1ca2a8-32a0-414f-b1c8-d38fe6a59175', 'NELIDA ANTONIA', 'COLINA', '9930730@sionerp.local', '4246147566', 'CALLE NUEVA, LA FLORIDA', '9930730', 'server', '1964-04-29', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('6c9471f1-85bf-493e-b128-436ac099f963', 'ANAIRIS CAROLINA', 'AMAYA JIMENEZ', 'anairisamaya@gmail.com', '4246730893', 'CALLE NUEVA, LA FLORIDA', '', 'server', '1991-05-12', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3522c5f4-738e-4195-8da8-7a4f3d4650d7', 'ANTONIO JOSÉ', 'MEDINA NAVA', 'antojosemedina15@gmail.com', '4246598933', 'CALLE NUEVA, LA FLORIDA', '15067206', 'server', '1979-01-12', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('73d7f185-e048-43b7-b75c-c9acf1d36135', 'OSIRIS EMILIA', 'VENTURA VELASQUEZ', 'osirisemiliaventuravelasquez@gmail.com', '4346825093', 'CALLE MONZON CON AV. SUCRE LA FLORIDA', '7497207', 'server', '1963-09-16', '2008-07-20', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('ae9cfc3b-7277-4921-9f48-030a1d6a387e', 'LIRA VICTORIA', 'CHIRINO GUTIÉRREZ', '34308788@sionerp.local', '4124716228', 'URB. LIBERTADORES DE AMERICA', '34308788', 'server', '2009-12-02', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('9a9071bf-7f7a-4d32-a286-076a7eb8f240', 'RAIZA YRENE', 'RIVERO COBIS', 'raizarivero45@gmail.com', '4264616269', 'URB. LIBERTADORES DE AMERICA', '9518933', 'server', '1966-08-30', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('674227ad-8b1d-477d-bf3e-77d8ed4940ab', 'NILDA MARÍA', 'SUAREZ VARGAS', '7478894@sionerp.local', '4246062009', 'URB. LIBERTADORES DE AMERICA', '7478894', 'server', '1960-12-02', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b9f1b45a-2737-42f8-bf58-53f76035d0cb', 'PEDRO JOSE', 'MORA COLINA', 'moraclef2019@gmail.com', '4125149608', 'URB. LIBERTADORES DE AMERICA', '11478771', 'server', '1971-08-15', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e89b12fc-c427-47fb-8aac-cd68cdc04ce8', 'MARIA YSABEL', 'GONZALEZ DE BRETT', 'mariaysabelg1158@gmail.com', '4246196900', 'CALLE JOSE LEONARDO CHIRINO CAUJARAO', '5253503', 'server', '1958-11-06', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c9f987fc-9c8e-4f32-bdf3-7fa062446bfc', 'LIDDA', 'BRAVO', 'lidda@gmail.com', '4246588253', 'URB. LIBERTADORES DE AMERICA', '7486101', 'server', '1958-10-15', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('edc97b7b-174b-4f24-9698-cd1c5ad19097', 'RITA DEL CARMEN', 'GUTIERREZ SALGUEIRO', 'ritagutierrez281@gmail.com', '4124288847', 'URB. LIBERTADORES DE AMERICA', '12180101', 'server', '1973-02-13', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('425f374e-33d8-4df8-a3f0-180d623c64cd', 'NILZA JOSEFINA', 'RAMIREZ BRAVO', 'nilzajramirezb@gmail.com', '4126817143', 'URB. EL BOSQUE CALLE 3', '11293157', 'server', '1971-10-19', '2021-12-04', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('dfa6f071-3667-4dbe-b49e-847d8c0fe03c', 'CARMEN JULIA', 'COLINA MORA', 'carmencolinamora@gmail.com', '4124490374', 'URB. EL ENCANTO CALLE 1', '11805120', 'server', '1974-09-11', '1996-11-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d86d7761-a0db-4252-ab6d-5814e578ca28', 'BEATRIZ ADRIANA', 'PEÑA GONZALEZ', '11479946@sionerp.local', '4262582964', 'URB. EL BOSQUE CALLE 2', '11479946', 'server', '1970-05-01', '2019-12-08', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a1c541ea-6746-45dd-9d6b-b28b6bf69771', 'MANUEL MARÍA', 'TIGRERA REYES', 'manueltigrera4@gmail.com', '4121197858', 'URB. EL ENCANTO CALLE 1', '12176856', 'server', '1974-03-14', '1991-07-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('435d4f19-7285-4c13-a450-f6ff607c502d', 'DEXY', 'TIGRERO', 'dexitigrero@gmail.com', '4246498010', 'URB. EL BOSQUE CALLE 5TA TRANSVERSAL', '13487619', 'server', '1976-10-01', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8e3df9ac-f456-49f3-be8b-ed1a7bb92d7c', 'DIANA ELIZAABETH', 'PULIDO AGUILAR', 'dianapulido1705@gmail.com', '4246258662', 'URB. EL BOSQUE CALLE 5TA TRANSVERSAL', '31437851', 'server', '2005-05-17', '2025-10-12', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('71da5236-44b2-4de4-ac76-5aada04eaafa', 'ADELGIZA', 'ZANTOYA', '81935147@sionerp.local', '4124601518', 'URB. EL BOSQUE CALLE 5 CASA K-10', 'E81935147', 'server', '1959-09-29', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c65c68b3-a77d-45e0-920c-bb33305ccdd1', 'TERESA', 'MEJIAS', '3599121@sionerp.local', '', 'URB. EL BOSQUE CALLE 1', '3599121', 'server', '1939-10-16', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('11c66805-26da-4cc4-b89c-fb977a784b38', 'ALEXIS JOSÉ', 'GUTIERREZ MIQUILENA', '20680940@sionerp.local', '4121271019', 'SECTOR CRUZ VERDE, CALLE COLOMBIA', '20680940', 'server', '1991-06-02', '2010-10-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8638d972-2a8c-4577-9cbb-9b84a91991ee', 'MARY JOSEFINA', 'MEDINA PETIT', 'mary1001medina@gmail.com', '4146241172', 'BARRIO CRUZ VERDE CALLEJON PORVENIR', '11139731', 'server', '1972-01-10', '2020-09-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5b75b405-58bd-4dbe-b0f7-3fa7d205408c', 'AIVERSON ANDRES', 'MACHO CHIRINO', 'chirinoandres53@gmail.com', '4246631455', 'PARCELAMIENTO CRUZ VERDE', '30353835', 'server', '2004-02-28', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d63a67ff-5b30-41b4-9e9b-67d3f4980e29', 'LLEPNI EMPERATRIZ', 'DORANTE GARCÍA', 'llepnyemperatriz71@gmail.com', '4123897979', 'BARRIO CRUZ VERDE', '11141299', 'server', '1971-11-23', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('305eaf45-2ce7-4d5c-a4d1-43d6aeeb82cd', 'LUISANGI ALEJANDRA', 'SALAS MEDINA', 'luisangisalas@gmail.com', '4246222033', 'CRUZ VERDE, CALLEJON PORVENIR', '29535091', 'server', '2002-03-17', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('fe0b52e4-ddbb-40a3-9b1a-6cc8e6c8be06', 'DUMARY J', 'RODRIGUEZ REYES', '16521245@sionerp.local', '4246438688', 'BARRIO  CRUZ VERDE, CALLEJON PORVENIR', '16521245', 'server', '1978-12-31', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('450359db-6af6-4f00-94b1-23d6cf55182f', 'KAROL JOSEFINA', 'DUNO VARGAS', 'jkarolduno@gmail.com', '4246123118', 'PARCELAMIENTO CRUZ VERDE', '29940476', 'server', '2003-05-09', '2017-12-24', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ffd628ca-7fea-4ef7-9b10-702682bec77f', 'YOLIMAR', 'CHIRINO', 'yolimarchirino430@gmail.com', '4162478025', 'PARCELAMIENTO CRUZ VERDE', '18481100', 'server', '1987-01-05', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2d01ab6c-d0a7-426e-bf11-0132d764c740', 'JOSE JULIAN', 'LARA CATARI', 'josejulianlaracatari@gmail.com', '4120666576', 'UCV CALLE 2, SECTOR 3 N 20', '26991221', 'server', '1999-07-22', '2015-12-05', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b088653b-3368-452e-a648-744b06fcb0d7', 'WILMARY DEL VALLE', 'RODRIGUEZ CORDONES', 'wilmary1986rodriguez@gmail.com', '4126818357', 'PARCELAMIENTO CRUZ VERDE', '18198499', 'server', '1987-06-24', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('bb278817-e9b9-43b2-9684-f16027046051', 'JESUS REINALDO', 'RODRIGUEZ REYES', '29535083@sionerp.local', '4246501238', 'CALLEJON PORVENIR', '29535083', 'server', '2000-10-22', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('65981f9f-27d3-4142-bcb9-4e5970760d2a', 'YAMELIS DEL VALLE', 'COLINA SANABRIA', 'sanabriayamelis@gmail.com', '4122975091', 'CALLE POPULAR N 27', '107055337', 'server', '1972-01-12', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1bf87527-1dca-44f6-bf2c-aa9614ae9253', 'JOSEFINA', 'VARGAS GUTIERREZ', 'finavargas.2020@gmail.com', '4246043933', 'PARCELAMIENTO CRUZ VERDE', '11140668', 'server', '1969-03-12', '1969-03-12', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1a324ac1-1d23-45db-8579-e81e0857eb3a', 'NAYDALY KARINA', 'YANEZ NAMIAS', 'yonayanez2014@gmail.com', '4260646450', 'PARCELAMIENTO CRUZ VERDE', '23680843', 'server', '1995-07-19', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('11a8e201-d95f-44e7-b2bb-73ebe4abf7e8', 'YOWAL JOSE', 'RODRIGUEZ LOPEZ', 'yowalrodriguez@gmail.com', '4163315042', 'PARCELAMIENTO CRUZ VERDE', '18890013', 'server', '1985-04-26', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8d7e7b57-51af-4348-97ef-0493b8952ec7', 'FREDDY JOSE', 'RAMIREZ MIQUILENA', 'f1093ramirez@gmail.com', '4121315858', 'SECTOR CRUZ VERDE CALLE COLOMBIA', '24307363', 'server', '1993-10-01', '2013-02-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('93eeb619-c5e4-440d-a5ef-c20d1e744f63', 'YOANA JESUS', 'MOLINA CHIRINO', 'yihanamolina@gmail.com', '4246100576', 'PARCELAMIENTO CRUZ VERDE', '14794089', 'server', '1981-12-06', '2016-06-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2cc8dd2b-3d4c-4555-a8d9-7b2cd644cb95', 'LENYS DEL CARMEN', 'VIDAL QUERO', 'lenysvidal62@gmail.com', '4246702017', 'PARCELAMIENTO CRUZ VERDE', '11474155', 'server', '1971-07-07', '2023-04-16', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('50653a7c-30a0-4e1f-bf55-5a7acafbaeca', 'JULVICMAR JOSE', 'LARA CATARI', 'julvilara@gmail.com', '4120741338', 'URB CRUZ VERDE', '26110005', 'server', '1997-09-19', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('08c294de-6dbe-4df8-a2ec-f8a23a217973', 'ALEJANDRO ALBERTO', 'PEÑALOZA YANTIL', 'alejandroapy123@gmail.com', '4246078306', 'UCV CALLE 7 N 17', '27885932', 'server', '2000-02-22', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('9f5210e3-0e09-4b64-b3be-4b4c52f3e292', 'MARLENE', 'BARRIOS', 'import.188@sionerp.local', '4146741056', 'PARCELAMIENTO CRUZ VERDE', '', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7a351c6e-d3c5-4b9f-8fd3-76e56fd4c96f', 'FREDDY', 'GARCÍA', '7474993@sionerp.local', '4146741056', 'PARCELAMIENTO CRUZ VERDE', '7474993', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cd062ba5-38b4-4fb2-b73d-48b45ed0caf8', 'IREXSI YANIRA', 'SANCHEZ  HERRERA', 'irexsis@gmail.com', '04121067892', 'U. C.V CALLE 4 SECTOR 4 ·Nº 22', '17628947', 'server', '1985-02-07', '2021-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('112704b1-0751-4995-8130-56f6afff7cd6', 'CESAR FRANCISCO  JOSE', 'VIDAL QUERO', 'cesarvidalquero@gmail.com', '01420652703', 'U. C.V CALLE 4 SECTOR 4 ·Nº 22', '9520404', 'server', '1967-10-04', '2024-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b1ce1c58-ce3d-479f-9e1b-5ba64e706ec3', 'MILECTA MARGARITA', 'HERNANDEZ JIMENEZ', 'milecta23@gmail.com', '04146834763', 'URB.  VELITA II C/12 V/15', '9509342', 'server', '1964-10-26', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('6ae81e1f-7eb5-4a18-af93-981fbd617705', 'JOSE GREGORIO', 'CHIRINOS GOMEZ', '8752440@sionerp.local', '04125983564', 'URB.  VELITA II C/12 V/10 nº7', '8752440', 'server', '1971-10-02', '2006-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('704b24ae-a137-434c-a925-f5bcb1451cca', 'ORELIS CARINET', 'RODRIGUEZ PRIMERA', 'inversionesernestomolina@gmail.com', '04144158018', 'PAR. C.V. CALLE MARTINIANO  ZAVALA', '17102799', 'server', '1984-03-16', '1999-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('dbfb078f-c7a7-4cd2-9d8b-ef08c322ec54', 'YUSMELYS ANDREINA', 'VERDE ZARRAGA', 'yusmelysverde@gmail.com', '4120975159', 'U.C.V CALLE 4 SECTOR 4 Nº20', '13202158', 'server', '1976-07-04', '2025-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5fbfebc5-e159-43f0-b843-39cc99e50292', 'JOSE LUIS', 'VERDE ZARRAGA', '16942459@sionerp.local', '04120975159', 'U.C.V CALLE 4 SECTOR 4 Nº20', '16942459', 'server', NULL, NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7513a565-f9b5-4d67-afe7-be2c3ae3be0d', 'LEWIS MANUEL', 'SANGRONIS VIDAL', 'lewissangronis@gmail.com', '04246702081', 'PAR. C.V. CALLE DIEGO  LEON', '31037337', 'server', '2001-10-01', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('58000025-0745-4d91-8976-0ad19d4ec06c', 'NEYCETH JOSE', 'VIDAL QUERO', 'neycethvidal@gmail.com', '04246842120', 'PANTANO ABAJO  CALLE 23 DE ENERO', '20212504', 'server', '1988-06-17', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2f6872e8-8041-4fd9-9009-6b24b995c070', 'EDUMIRIS ANDREINA', 'FANEITE COLINA', '13028927@sionerp.local', '04125836033', 'U.C.V BLOQUE 5', '13028927', 'server', '1976-08-20', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('4d365aa9-2c7f-403b-8b47-8a5127b7f126', 'EUNICE MARIA', 'DIAZ QUEIPO', 'eunicethebest17@gmail.com', '04121770574', 'U.C.V C/4 V/20 Nº9', '13417084', 'server', '1978-10-09', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('997aadf5-407d-47e1-b4df-f20459ef379e', 'KEILA YOSELYN', 'ZAVALA MADRIS', 'keilayoselyn94@gmail.com', '04127838842', 'U.C.V. S/05 V/12 Nº9', '24307069', 'server', '1994-11-06', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('9ae1c75f-0249-4bec-89de-ea244cd3be78', 'LESVY MARIELA', 'FORNERINO', 'lesvyfornerino@gmail.com', '4121432101', 'U.C.V S/7 V/4 Nº3', '10700283', 'server', '1968-11-07', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('6e1166f8-3de8-47c3-b7b6-4b3470435d23', 'JUANA PETRONILA', 'ROMERO  MARTINEZ', 'juanaprm88@gmail.com', '04124285297', 'U.C.V SECTOR 4 CALLE 9 V/15 Nº12', '9509997', 'server', '1966-11-11', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('640f3ba0-d175-49a3-ba47-97657056573b', 'VICTORIA JOSEFINA', 'PEREZ COLINA', 'rendydanieljimenezchirinos@gmail.com', '4127535119', 'U.C.V SECTOR 5  V//15 Nº2', '18890059', 'server', '1986-08-02', '2010-03-03', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c60fc251-dd9e-4841-bb05-55784437aa86', 'DORIS MINERVA', 'MEDINA REYES', 'dormed32@gmail.com', '4126826088', 'U.C.V. S/05 V/15 Nº12', '18293574', 'server', '1987-02-12', '2022-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('58b3a426-b165-4318-875a-3253a4a6ebbc', 'MARIA ALEJANDRA', 'MEDINA REYES', '33942617@sionerp.local', '04126569009', 'U.C.V. S/05 V/15 Nº12', '33942617', 'server', '2009-08-14', '2024-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3177330d-9921-458e-aa95-3c2efad45530', 'ANA ELIZABETH', 'LOPEZ SANGRONIS', 'anaelizabethlopez81@gmail.com', '04126751185', 'CALLE MAPORAL C/23  DE ENERO', '14654732', 'server', '1978-12-14', '2003-01-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e01be2e2-b406-4e35-b8be-fcbb5468b652', 'ARGENIS DAVID', 'ZARRAGA GONZALEZ', 'angel2003zarraga@hotmail.com', '04121348169', 'URB FRANCISCO  DE MIRANDA CALLE 11 Nº1', '30948546', 'server', '2003-06-08', '2022-05-14', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b92ee586-413c-43fe-b1a4-ac1dffba47fd', 'RUTH MARIA', 'GONZALEZ GUTIERREZ', 'rutza2017@hotmail.com', '4121348169', 'URB. FRANCISCO DE MIRANDA CALLE 2 Nº16', '15703032', 'server', '1980-05-14', '1987-04-05', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('58542b15-388c-4770-be8e-0f2d6d11aae7', 'MARLENE DEL  CARMEN', 'MUÑOZ GONZALEZ', 'marlenemuz17@gmail.com', '04121348169', 'URB.  ANDARA CALLE 2 Nº36', '11636471', 'server', '1971-11-17', '1997-08-08', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2309535b-d2f4-4836-8b33-6444e9036420', 'RAFAEL JOSE', 'GONZALEZ LACLE', 'rafito6.286z@gmail.com', '04121267934', 'URB.  ARISTIDES CALVAN  CALLE 1 Nº7', '4107890', 'server', '1954-06-28', '1984-06-28', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('34def62a-8fad-41df-bc51-f1a243ff27c2', 'JANIS  DEL  VALLE', 'ESPINOZA DE PEREIRA', 'juniesponoza@gmail.com', '', 'URB. FRANCISCO  DE MIRANDA CALLE 7 M/7 Nº11', '11139547', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1d82e035-65f3-43b8-81b2-d8c5f84a5f91', 'YOSMARY DANIELA', 'ZARRAGA  RIVAS', 'yosmaryzarraga7@gmail.com', '04246377784', 'URB FRANCISCO  DE MIRANDA CALLE 7 Nº3', '29979869', 'server', '2000-07-02', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ed65d3c9-72be-41d9-bc32-da8c5f70167b', 'CARMEN  ELENA', 'BRACHO  PAZ', 'paolatesta@gmail.com', '04121069190', 'URB FRANCISCO  DE MIRANDA CALLE 7 Nº2', '7718932', 'server', '1962-09-30', '2013-03-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3d9fb279-5dd1-4752-a230-9821b14d29ed', 'JOSUE DAVID', 'ARIAS ARIAS', 'ariasjosue25@gmail.com', '04264885578', 'URB.  ARISTIDES CALVAN  CALLE 9 5ETPA Nº22', '25370891', 'server', '1997-07-23', '2011-12-11', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f5ee692c-5d51-4a8d-a0e6-e008a078515f', 'BETZABETH KATHERINES', 'ARCILA MEDINA', 'betzabetharcila11@gmail.com', '04262699540', 'URB.  ARISTIDES CALVANI', '29513408', 'server', '2000-10-28', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('36520892-9205-41ed-8af0-94042a4e6776', 'NAILIUG ALEJANDRA', 'ESPTUPIÑAN TREMONT', 'nailing2000@gmail.com', '04246231749', 'URB LAS EUGENIAS 4 ETAPA', '21112368', 'server', '1993-08-02', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8e29b204-181d-4623-957e-bdd49ae21686', 'ELISEO  JOSUE', 'PEREIRA', 'eliseoojosue#@gmail.com', '04146916479', 'URB FRANCISCO  DE MIRANDA CALLE  7 M/7Nº11', '11472348', 'server', '1973-08-01', '2013-02-13', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('eaee3dc8-4964-4e25-9578-53f6bcfdbc6d', 'JOSUE JESUS', 'PEREIRA ESPINOZA', '55pe062698@gmail.com', '04146916479', 'URB FRANCISCO  DE MIRANDA CALLE  7 M/7Nº11', '26991051', 'server', '2013-06-26', '2013-02-13', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f5a80a40-78d1-4893-bba7-1c4de4b837ec', 'MARIATERESA DE JESUS', 'PEREIRA ESPINOZA', 'janiespinoza1970@gmail.com', '04146916479', 'URB FRANCISCO  DE MIRANDA CALLE  7 M/7Nº11', '32704830', 'server', '2007-12-28', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('352cfb60-65af-4425-8652-969c1cc0f06e', 'VERONICA ANAIS', 'HIGUERA ACOSTA', 'veronicahigueraacosta@gmail.com', '04122827291', 'URB FRANCISCO  DE MIRANDA 2 ETPA CALLE  26 Nº34', '32704756', 'server', '2005-12-20', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0157f92a-3e3f-443c-ac8b-9370bad2f14f', 'JONATHAN EDUARDO', 'MORENO PALMO', 'jonathaneduardo25@gmail.com', '04146279237', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº5', '33310341', 'server', '2008-05-01', '2023-04-30', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e7444fbb-07f8-42ed-b9ba-7d40f13ab790', 'DORALIS  YAJAIRA', 'PALMO', 'doralispalmo@hotmail.com', '04146279237', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº5', '12184131', 'server', '1975-09-04', '1991-03-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('dc514442-5ca4-476b-b7a5-5275ed48a3ea', 'RICHARD REINALDO', 'PINTO  NAVARRO', 'ricardpintoxd@gmail.com', '057350248571', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº2', '31801747', 'server', '2005-01-05', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5a69f4d1-b97e-40df-9b4e-eae231c02cb2', 'JOSE LUIS', 'VILLANUEVA BECERRIT', 'villanuevajose21@gmail.com', '04129094871', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº9', '11478406', 'server', '1971-12-21', '2002-04-26', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('6a24f830-f506-4609-971b-e3fb96b921ed', 'VALERIA ESTHER', 'MORENO PALMO', 'valeriaesthermoreno2005@gmail.com', '', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº5', '33310062', 'server', '2005-10-06', '2023-04-30', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5521da47-428d-4cc8-b569-577d1294abe5', 'ZUNIRDE JOSEFINA', 'RIVEROS MORA', 'riveroszunilde@gmail.com', '04149651632', 'URB FRANCISCO  DE MIRANDA CALLE  2 Nº8', '12736765', 'server', '1976-01-08', '2016-12-05', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('45415390-8a65-4b90-89e5-8a887aa58131', 'MIGDALIA JOSEFINA', 'MORA BORGES', 'migdaliamora15@gmail.com', '04149651632', 'URB FRANCISCO  DE MIRANDA CALLE  2 Nº8', '7478565', 'server', '1959-01-29', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7de8f58b-50c0-4b6b-92da-6c624522c77b', 'EICHER VIOLETA', 'IGLESIAS', 'violetaiglesias22@gmail.com', '04120646908', 'URB FRANCISCO  DE MIRANDA CALLE  13 Nº120', '5886168', 'server', '1960-06-22', '2023-04-26', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5f46220a-e89c-4c1b-8eaa-4b94b5548d57', 'JOSIERIKA SINAI', 'BRAVO IGLESIAS', 'josierikabravo@gmail.com', '04127855587', 'URB FRANCISCO  DE MIRANDA CALLE  13 Nº120', '25371060', 'server', '1997-01-15', '2013-03-21', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2baafbc6-b16e-4e1c-9e4e-6412c802a2c2', 'MIRIANS KARELIS', 'SANCHEZ REYES', 'mirianksanchez@gmail.com', '04163636826', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº9', '12734749', 'server', '1976-09-26', '2007-03-26', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7002e2ea-ecda-45ab-b554-c00834818606', 'MICHEL ESTELIN', 'VILLANUEVA SANCHEZ', 'michelsvg@gmail.com', '04261822182', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº9', '25009501', 'server', '1996-01-14', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0a36c0c2-0614-4d57-930e-6d9b2aba6736', 'NICOLE ALEJANDRA', 'MEDINA GOITIA', 'nicolemedina@gmail.com', '04126872739', 'URB FRANCISCO  DE MIRANDA CALLE  2 Nº2', '31947693', 'server', '2005-03-07', '2018-04-28', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('96783b22-1172-41a1-90d4-894510d8b753', 'CARMEN  MIREYA', 'COLINA', 'caemencolina009@gmail.com', '04262321266', 'URB FRANCISCO  DE MIRANDA CALLE  PPAL  Nº5', '10705008', 'server', '1969-04-21', '1999-04-20', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3e7d0bfa-b775-4525-a8ed-8b7fdc4b0b36', 'RUT YAREMI', 'DELGADO  COLINA', 'rutdelgado33@gmail.com', '4246120564', 'URB FRANCISCO  DE MIRANDA CALLE  PPAL  Nº5', '31037695', 'server', '2005-02-02', '2018-04-28', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b5bdba82-a1c1-4a78-b3b4-ea6e2d22b94e', 'RAQUEL ESTEFANIA', 'DELGADO  COLINA', 'raqueldelgado1515@gmail.com', '04264869480', 'URB FRANCISCO  DE MIRANDA CALLE  PPAL  Nº5', '34350880', 'server', '2008-11-15', '2018-04-28', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('58fb0017-721c-4db8-87e5-e7a0cc4bd729', 'ROSA RAMONA', 'VERGARA ACOSTA', 'drosavergara@gmail.com', '4126893572', 'URB.  LAS EUGENIAS 5 ETP CALLE 10 Nº10', '9520759', 'server', '1965-11-02', '1999-04-05', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cf71c2a9-ab6d-4114-8e2a-1d5fc429b5e3', 'ALCIFREDO ANTONIO', 'OCANDO  RIVERO', 'alcifredo747@gmail.com', '04126866853', 'RES.  POLICIAL JOSEFA  C CALLE 2 Nº14', '7478667', 'server', '1996-07-17', '2014-07-07', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b6206f30-c474-40bb-894a-9f78317b6445', 'PETRA RAMONA', 'ZARRAGA DE OCANDO', 'petra.zarraga@gmail.com', '04127652265', 'RES.  POLICIAL JOSEFA  C CALLE 2 Nº14', '9501332', 'server', '1961-10-14', '2014-07-27', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('4072b66d-6336-49e5-b9dd-dce95c243dae', 'ZULAY COROMOTO', 'ISEA ATIENZO', 'zallay95forever@gmail.com', '04267613462', 'U.C.V SECTOR 01 V/8', '', 'server', '1964-06-04', '2018-04-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('aa34f744-8acb-4e6e-80a0-b4b4e6b925c4', 'ANA DUBIZ', 'HERNANDEZ GARCIA', 'dubiz2012@gmail.com', '04146508082', 'CALLE NUEVANº15', '14397236', 'server', '1977-05-28', '2020-12-20', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('56d7d5e7-e4a1-41d5-9b3d-02952781c8c0', 'ANA DEL CARMEN', 'SUAREZ PEROZO', 'anasuarezperozo40@gmail.com', '04246896871', 'U.C.V S/2 c/5', '9529125', 'server', '1966-11-13', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('213c4147-c57e-4ca1-82f7-f04223cd3275', 'NELLY ISABEL', 'GOITIA DE PINEDA', 'nellysgoitia41@gmail.com', '', 'U.C.V C/3 BLOQUE 2 A-0018', '4102947', 'server', '1948-03-06', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cd9a60e4-ef57-479c-9621-dc5c3fb29fc3', 'YASMIRA ALBERTINA', 'OLLARVES', 'no@gmail.com', '04166689826', 'CALLE EL  SOL CASA 50 LA FLORIDA', '18293729', 'server', '1983-10-01', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('29ba472a-6ba1-4b86-9af9-7c190e148fb4', 'MARIA INMACULADA', 'JIMENES OLLARVES', 'inmaculada1208@gmail.com', '04162282743', 'CALLE EL  SOL CASA 50 LA FLORIDA', '15704014', 'server', '1979-12-08', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7b54f1b2-78fb-43d7-a197-df29f9e94b9c', 'MARIA ISAACMAR', 'CHIRINO GIMENEZ', '31676572@sionerp.local', '', 'CALLE EL  SOL CASA 50 LA FLORIDA', '31676572', 'server', '2005-09-08', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('20c86a2f-3da9-4a14-b81e-f0b7d8d20281', 'MILEXIS DEL  CARMEN', 'MAVARES PIÑERO', 'mavarezmilexis71@gmail.com', '04246509557', 'URB.  SANTA PAULA C/7 N16', '11478934', 'server', '1971-04-09', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('410eed61-b3cf-4306-a533-281c6e46b7ef', 'MILAGROS JOSEFINA', 'MAVARES PIÑERO', 'milax1968@gmail.com', '04121225151', 'U.C.V CALLE 2 S/4 Nº15', '9931014', 'server', '1968-04-30', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('fa256959-fc17-4efd-b1f6-8ecdf92f832b', 'ALFREDO  JOSE', 'SAAVEDRA CHIRINO', 'alfredosaavedra@gmail.com', '04246509557', 'URB.  SANTA PAULA C/7 N16', '13616288', 'server', '1976-09-08', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cefca380-ae28-4d65-a54f-6ccb53673e36', 'TERESA DE JESUS', 'PIÑERO  DE MAVARE', 'milax1968mavare@gmail.com', '04121225151', 'U.C.V C/2 S/4 N15', '3092149', 'server', '1941-10-15', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('75d313eb-ad6f-4c7f-8a2d-40a35ba42202', 'MARYORIS TEODORA', 'ARIAS MANZANO', 'ariasmaryoris@gmail.com', '04161292117', 'U.C.V CALLE 9 S/4 Nº3', '10705286', 'server', '1971-05-12', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8ccb3088-a958-4515-81d5-a12000b93508', 'ELEIDA ESTHER', 'DIAZ QUEIPO', 'eleunidiaz@gmail.com', '04129616324', 'U.C.V CALLE 4 SECTOR 4 Nº20', '15917326', 'server', '1984-02-13', '2002-12-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('a7d4a128-96a5-4c60-84e2-78852c057e81', 'ESTEBAN RAMON', 'PIÑA CASTRO', 'ep500406619@gmail.com', '04126738409', 'U.C.V CALLE 2 S/5 Nº32', '9930074', 'server', '1968-12-16', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('fc1469cb-5958-41be-ac07-2c8cfc89e3d4', 'EDJEMAR CELEN', 'RODRIGUEZ ROMERO', 'edjmarrodriguez@gmail.com', '04246944654', 'U.C.V CALLE 2 S/5 N/S', '34350773', 'server', '2010-02-11', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ff3b0bf5-a4eb-4ec9-82d6-68bbefcdb984', 'EGLIMAR CAROLINA', 'COELLO', 'eglymarcarolinacoello@gmail.com', '04264560025', 'BARRIO ZUMURUCUARE CJON VENEZUELA', '18606243', 'server', '1987-11-12', '2002-12-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('40e868b9-18b8-4121-b243-81755bd884af', 'BIRZAVIT', 'GARCIA HERNANDEZ', 'birzavitgarcia77@gmail.com', '04146861503', 'BARRIO ZUMURUCUARE CJON VENEZUELA', '13660456', 'server', '1977-09-01', '2007-08-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('44eee0ef-129c-456c-a6c9-721b89b193a0', 'EGLY MARIA', 'COELLO', 'eglymaria@gmail.com', '04148290378', 'U.C.V S/4 C/9 Nº8', '12176477', 'server', '1972-10-15', '1990-04-22', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ca9f7443-d5f4-4679-b0d6-27550c541371', 'ANGELA CIPRIANA', 'DIAZ', 'angeladiazreyes@gmail.com', '04121624625', 'U.C.V C/7 V/22 Nº8', '9527306', 'server', '1967-09-26', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7f30f85d-d65a-41f1-be8d-bf0266ee05d3', 'MARIELSI AUXILIADORA', 'RODRIGUEZ DE CHIRINOS', 'marielsirodriguez3@gmail.com', '04146790255', 'U.C.V C/7 V/11 Nº2', '14396804', 'server', '1980-12-19', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a61b7b56-8e5a-4330-8b44-4d3ae2e5112c', 'XIOMARA JOSEFINA', 'SANCHEZ CHIRINOS', '9517319@sionerp.local', '04246327926', 'U.C.V CALLE 2 S/5 Nº32', '9517319', 'server', '1968-04-01', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('fa8d6401-612f-44f3-a83c-8b2fef39cbfd', 'GENESIS GUADALUPE', 'CHIRINO  HERNANDEZ', 'gchirinos1906@gmail.com', '04120635682', 'URB SANTA MARIA AV 01 CASA 2', '19251683', 'server', '1989-07-06', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b33b0517-0fac-4801-8427-bd82f0034c98', 'SOLANGEL  KARINA', 'COELLO', 'solangelkariacoello@gmail.com', '04162206504', 'U.C.V C/9 CASA 8', '12176476', 'server', '1974-11-26', '2025-10-12', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('81d813f0-4de6-4bbd-9940-379002eaa920', 'MARIA DEL PILAR', 'COELLO', '3453694@sionerp.local', '04162206504', 'U.C.V C/9 CASA 8', '3453694', 'server', '1944-03-28', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('80097157-4211-4481-a249-1037aadda36e', 'EDWARD LEONARDO', 'RANGEL  ARIAS', 'eswardjesus502@gmail.com', '04149635732', 'U.C.V CALLE  9 S/4 V/3', '32005670', 'server', '2007-05-13', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('cafebc92-108a-4143-893f-7d8dcffa1af8', 'JAVIER JESUS', 'CHIRINOS RODRIGUEZ', 'chirinosjavier23@gmail.com', '04120983316', 'U.C.V C/7 V/11 Nº2', '31091349', 'server', '2005-01-06', '2019-04-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8e8c1419-cef1-4c23-af0b-904f92d1da3b', 'MARBELLA JOSEFINA', 'YANTIL MOLLEDA', 'marbella17@gmail.com', '04246850617', 'U.C.V C/7 N17', '11806731', 'server', '1971-01-07', '2010-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c16d0585-fbfd-4364-9c22-23684905b7f2', 'MARIALIS CAROLINA', 'ROMERO  ARGUELLES', 'marialiscrm@gmail.com', '04146808952', 'U.C.V C/4 Nº4 S/4', '25925857', 'server', '1997-10-12', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('023087b3-b494-4502-8b5b-96eb63f3614f', 'CARMEN  GERONIMA', 'RODRIGUEZ DE ARGUELLES', 'carmengeronima30@gmail.com', '04261171030', 'U.C.V C/4 S/4 Nª4', '4646106', 'server', '1952-09-30', '2022-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8ee1c0a8-3538-4ca0-b5ed-59029b0d7e9e', 'OLGA', 'HERNANDEZ', '3546856@sionerp.local', '04163408822', 'U.C.V  C/9 S/4 Nº12', '3546856', 'server', '1949-11-05', '1984-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('deb30ebc-1ab5-4c2b-b579-2e77da755ad3', 'WILMER TADEO', 'MORALES SIRAX', 'willmorales149@gmail.com', '04121023323', 'U.C.V B/14 A-02-04', '19253822', 'server', '1989-04-01', '2013-02-03', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('54d25586-3201-4957-a84d-6af0c87c41db', 'GLADYS GRACIELA', 'SIRAX LEAL', 'gladysgracieladirax@gmail.com', '4123805046', 'U.C.V B/14 A-02-04', '9504624', 'server', '1962-12-22', '2015-03-29', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f745536a-a97a-456f-855f-69148b871e1d', 'LUCIA JULIETA', 'CORZO RAMIREZ', 'luciajulieta21@gmail.com', '04140640708', 'U.C.V BLOQUE 6', '25992659', 'server', '1997-09-21', '2017-12-17', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('987b16e9-bc27-43db-a65c-f4eda109b352', 'NELY  JOSEFINA', 'MEDINA DE PIÑA', 'nellymedina502@gmail.com', '04121268035', 'U.C.V CALLE 2 SECTOR 4', '7479802', 'server', '1956-06-11', '2017-10-18', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('039fc6d0-42bc-41d8-a6c6-8f24fee9f8cc', 'PEDRO MANUEL', 'PIÑA DELGADO', 'ppiña0727@gmail.com', '04121268035', 'U.C.V CALLE 2 SECTOR 4', '4638150', 'server', '1956-06-11', '2017-10-18', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d5837593-fa53-43cc-b640-8fadc28a9ba9', 'MAIRA ALEJANDRA', 'FLORES MORA', 'amairaalejandra87@gmail.com', '04220027457', 'U.C.V S/4 Nº67', '14263163', 'server', '1978-10-10', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('33564917-e9d9-4e35-a4e1-513874d679bc', 'REINA', 'RAMIREZ', '7414953@sionerp.local', '04126821032', 'U.C.V BLOQUE 6', '7414953', 'server', '1967-06-21', '2017-12-17', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('60526eff-40b4-46db-9e4b-0170e33ec966', 'DILIA ANTONIA', 'BERMUDEZ SANGRONIS', 'diliabermudez18@gmail.com', '04149639824', 'U.C.V C/9 S/4 Nº3', '3833558', 'server', '1952-07-17', '2025-03-09', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('051ed486-1003-4a50-bbdf-1a531459f979', 'YOMARY  MILAGROS', 'MALDONADO  CHICAS', 'yosmarymilagrosmaldonado@gmail.com', '04146990256', 'ARISTIDES CALVANI C/1 Nº9', '17925955', 'server', '1985-06-09', NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ef26b8b3-8f1a-417f-8382-af3f3a642969', 'PETRA', 'ROMERO  THIELEN', 'petraydal@gmail.com', '4121609524', 'ARISTIDES CALVANI C/1 Nº9', '9503716', 'server', '1964-02-18', '2017-03-04', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c1a7be0a-4022-43c5-85a5-1013c9387446', 'LIGIA GREGORIA', 'HERNANDEZ', 'ligiagregoriahernandez@gmail.com', '04246682116', 'ARISTIDES CALVANI C/1 Nº9', '9503112', 'server', '1963-08-15', '1990-04-30', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a01a0fd5-6962-4115-b9a3-5f20fa4d6b06', 'JHONATAN  ALEXIS', 'ROMEMRO  PEÑA', 'jalexis.romero2024@gmail.com', '4122827291', 'URB.  FRANCISCO  DE MIRANDA C/26 Nº34', '31044552', 'server', '2002-04-17', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5ba23cb1-4ad5-47b8-a832-66d61019cab1', 'JENIFFER DAVIANA', 'ROMERO FALCON', 'romerojeniffer4@gmail.com', '04246215020', 'U.C.V CALLE 2 SECTOR 4', '19006902', 'server', NULL, '2021-12-05', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('434d3cc3-c393-4a0e-bada-e14a2fcf26ad', 'LUISMAR CAROLINA', 'GUTIERREZ PEROZO', 'luismargutierrez333@gmail.com', '4161628974', 'ZUMURUCUARE SETOR 4', '32309382', 'server', NULL, '2024-04-28', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('dc2af481-7734-4673-9ece-6fbdf6207cfa', 'NILDA ROSA', 'TOYO SALOM', 'lidatoyo1@gmail.com', '04246441099', 'ZUMURUCUARE SETOR 4', '5295764', 'server', '2026-11-04', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a64e4254-89f2-42a4-b36f-cdbb829980df', 'LILIANNYS GUADALUPE', 'COLINA COVIS', 'liliannyscolina@gmail.com', '04169671047', 'ZUMURUCUARE SETOR 4', '33363233', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('872888d1-32fe-46c0-bf00-4fe2795ba9be', 'AURIANNY ESTHER', 'GOMEZ ZALAZAR', 'gomezauriannys91@gmail.com', '04162216960', 'ZUMURUCUARE SETOR 4', '29901158', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1f0bf72b-b431-4ea6-8232-5cf2eb7f742e', 'LUIS SEGUNDO', 'CORDERO', 'luiscordero@gmail.com', '04140378692', 'U.C.V CALLE 11 S/5', '9506762', 'server', '2026-03-04', '1983-02-26', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e9eae14d-4113-423a-839b-07656b437ccd', 'GLADYS NOHEMY', 'GUTIERREZ DE CORDERO', 'gladyscordero1067@gmail.com', '04146569110', 'U.C.V CALLE 11 S/5', '9929155', 'server', NULL, '1984-01-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d1a2dba6-c34e-4cd0-85ed-54ccfe7d0439', 'GLEDYS JOSEFINA', 'PEROZO LEAL', 'gledysperozo@gmail.com', '04262255597', 'ZUMURUCUARE SETOR 4', '17336748', 'server', NULL, NULL, false, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('52597c30-2ec8-4d96-bb83-b3420020ca58', 'MIRIAN JOSEFINA', 'GARCIA DE QUERALES', 'mirianquerales29@gmail.com', '04246615108', 'U.C.V CALLE 11 S/5', '7483538', 'server', NULL, NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e5780bf8-0a1c-4b31-99ba-a5f7512da6cc', 'MAGALY JOSEFINA', 'ARIAS YEDRA', '7487411@sionerp.local', '', 'U.C.V CALLE 9 S/4', '7487411', 'server', '1900-10-29', '2013-05-16', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a7795354-efca-4481-af30-f171400992d4', 'MARIA AUXILIADORA', 'CHIRINO  CURIEL', '11806511@sionerp.local', '04129743424', 'U.C.V CALLE 7', '11806511', 'server', NULL, '1991-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('6ae9b1ef-5be6-47ac-ac21-d5f249f3e516', 'KEUDYS EMMANUEL', 'MIQUILENA PIÑEREZ', 'keudysmiquilena@gmail.com', '04246481276', 'SECTOR CRUZ VERDE', '21112375', 'server', NULL, '2011-05-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1ce95080-eae3-4707-b5c7-ce7cf1ae497b', 'NELIMAR ANAIS', 'COLINA POLANCO', 'nelimarcolina@gmail.com', '04121007938', 'SECTOR CRUZ VERDE', '20570100', 'server', NULL, '2011-05-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('50b9c4bf-79a5-445d-8fa6-8db610b820c1', 'MIGUEL ATILIO', 'BLANCO MARTINEZ', 'gooshmiguel@gmail.com', '04122293462', 'U.C.V CALLE 19 S/7 V/8 Nº2', '14396161', 'server', '1981-08-13', '2013-12-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d48b5403-6ad0-4059-83db-132fd27a8556', 'YONELA COROMOTO', 'SANCHEZ CHIRINOS', 'sanchezyonela@gmail.com', '04246949022', 'U.C.V CALLE 19 S/7 V/8 Nº2', '14490743', 'server', '1979-04-02', '1997-01-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('43de3f55-92e4-4b70-ae00-29ec5446649d', 'DANIELYS ANDREA', 'ILARRETA SILVA', '34026245@sionerp.local', '4122273689', 'UCV CALLE 11 SECTOR 8 N 19', '34026245', 'server', '2009-02-27', '2023-12-23', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a3c39d7c-fdbe-485f-9306-d14036b54375', 'AATON DAVID', 'GARCÍA RAMIREZ', '31947487@sionerp.local', '4146018965', 'VELITA 2 CALLE 25', '31947487', 'server', '2007-02-22', '2023-12-23', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('4dd99bf8-5689-4ee9-9153-a0cdbddd4a43', 'GEORELYS GABRIELA', 'ILARRETA SILVA', 'georelysilarreta16@gmail.com', '4123650742', 'UCV CALLE 11 SECTOR 8 N 19', '30295637', 'server', '2025-09-16', '2017-12-24', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e99ad15b-bd63-4a5e-914d-fbcc9b6a48e4', 'ENMANUEL JESUS', 'GARCIA CHIRINO', 'enmanueljg163@gmail.com', '4246008461', 'UCV', '25784232', 'server', '1995-03-19', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('85913bad-c48a-483f-a184-9981159043e0', 'GRECIA VICTORIA', 'ARIAS FERNANDEZ', 'greciavictoriaf2002@gmail.com', '4246006663', 'UCV', '29833543', 'server', '2002-12-04', '2018-10-14', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ce1a19e6-461d-4c06-8270-72a828122b80', 'ELIAN', 'MIQUILENA RIVEROS', 'elianmopsu@gmail.com', '4241319191', 'UCV', '29641910', 'server', '2000-09-25', '2019-04-30', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('2ca28156-7605-49ba-abbf-cfab8b6e42ad', 'LIZMARY CRISTINA', 'ESPINOZA DE AGÜERO', 'impresosla14@gmail.com', '4122553544', 'UCV CALLE 11 SECTOR 8 N 41', '13615959', 'server', '1978-09-11', '2011-01-12', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('d2d9b04b-d1c5-4915-9621-9d694ed8b17b', 'DANIEL JOSUE', 'AGÜERO SUAREZ', 'visipoldaniel@gmail.com', '4126308707', 'UVC CALLE 11 SECTOR 8 N 41', '14792185', 'server', '1979-03-02', '2011-01-12', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a88e8ca1-b96e-4e85-b8a8-c9f730bf8e2d', 'SOFIA VICTORIA', 'AGÜERO ESPINOZA', '34484229@sionerp.local', '', 'UVC CALLE 11 SECTOR 8 N 41', '34484229', 'server', '2010-07-12', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('1db9bc6a-dea2-475a-bfe6-e35ddc114793', 'NORKIS SORELLYS', 'ZARRAGA', '4102492@sionerp.local', '4168667868', 'UCV SECTOR 8', '4102492', 'server', '1952-08-29', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a83adb55-f600-4748-a1d9-498081e789ec', 'PEDRO', 'PIÑA PEREIRA', '9522812@sionerp.local', '4146312250', 'UCV SECTOR 8 CALLE 11', '9522812', 'server', '1964-06-29', '2012-05-20', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e13bf650-b28c-4795-be89-b15d090506a0', 'MILANGEL ROSARIO', 'PIÑA CASTRO', 'milangelpina052@gmail.com', '4246373488', 'UCV CALLE 11 VEREDA 9 N 7', '11800657', 'server', '1970-12-01', '2023-12-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5e2ece6b-af9d-4155-aefc-bce99ca56254', 'GEORGINA EDUVIGES', 'SILVA DE ILARRETA', 'georginasilva77@gmail.com', '4146734058', 'UCV CALLE 11 SECTOR 8 N 19', '12588290', 'server', '1977-05-20', '2003-12-21', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5f3adcad-9608-4dfd-8fb3-a39284f1238f', 'YUNEISYS MARYOLI', 'BRICEÑO ARTEAGA', 'yuneisisbriceno25@gmail.com', '4226370322', 'UCV SECTOR 8 CALLE 13 VEREDA 11 N 7', '25551220', 'server', '1996-07-11', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('bb79c2b6-565f-4684-bd7d-9c20fd603658', 'MARY CARMEN', 'ZARRAGA MEDINA', 'maryzarraga613@gmail.com', '4120717493', 'UCV CALLE 11 SECTOR 5 N 22', '14168614', 'server', '1974-11-09', '2025-08-17', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('9a7c8c97-d2ab-4421-8502-924abb621eec', 'NORMEDY LOURDES', 'RAMIREZ DE GARCIA', 'normedydegarcia@gmail.com', '4120744042', 'VELITA 2 CALLE 25', '15238321', 'server', '1981-04-13', '2007-10-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a5ea240c-cd2a-494d-ab7c-7bc5dd162c7f', 'ARIS CAROLINA', 'SANGRONIS', 'arissangronis@gmail.com', '4146888397', 'URB.  LAS EUGENIAS 4 ETAPA 3 TRANSV N° B17''15', '9527869', 'server', '1968-08-05', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f33e85be-876b-49c6-bc0a-2c58f0d7cdcb', 'GLADYS MARY', 'CHAVEZ DE PALENCIA', 'gladiel2006@gmail.com', '4146204387', 'URB. LAS EUGENIAS 6TA ETAPA CALLE 1, N 34', '14562796', 'server', '1979-04-06', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('756c4977-6665-4625-af24-4bb47b2cfdbc', 'ELVIN POMPEYO', 'PALENCIA OLIVET', 'elvinpalencia97@gmail.com', '4146715558', 'URB, LAS EUGENIAS 6TA ETAPA CALLE 1  N 34', '12181043', 'server', '1975-03-07', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('f27a8d17-791d-4adc-b8fd-0b4a688f8100', 'MARY CARMEN', 'CHIRINOS DE SECO', 'marycarmendeseco@gmail.com', '4122585951', 'URB. LAS EUGENIAS 5TA ETAPA CALLE 11', '10701859', 'server', '1969-06-09', '2010-10-03', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e4b0199a-6d21-4157-b234-db24792b7faa', 'MAILIN MARGARITA', 'HERNANDEZ DE MOTA', 'mailinhernaaqndez018@gmail.com', '4125988477', 'URB. LAS EUGENIAS 4TA. ETAPA TRASNV 11, N 13 14', '14459234', 'server', '1977-01-18', NULL, true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e08cdd23-cb54-4be2-a46a-08599f22b4a0', 'MARIA DE LOS ANGELES', 'GUITIERREZ GOMEZ', 'abgmariadlsa@gmail.com', '4124232536', 'URB. LAS EUGENIAS 3ERA ETAPA CALLE 10', '18152254', 'server', '1988-12-20', '2013-01-01', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0684043a-53f4-4e80-8d2d-77bdc3e729a7', 'AURA', 'ALVAREZ', '4790463@sionerp.local', '4125668503', 'URB. LAS EUGENIAS ETAPA 7', '4790463', 'server', '1955-05-14', '2015-12-15', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('39940a29-8eca-4d7e-b952-3fa7dde784d7', 'JAVIER SEGUNDO', 'IBARRA PIÑANGO', 'javieribarrapiñango@gmail.com', '4246127536', 'URB. LAS EUGENIA 4TA ETAPA CALLE 2', '8178306', 'server', '1963-02-04', '2000-06-24', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0717a73b-f4aa-4c62-8640-58d0a4774ea8', 'YOLIMAR DEL CARMEN', 'SANCHEZ REYES', 'yolimarsanchez3105@gmail.com', '4246454041', 'URB. LAS EUGENIAS 8VA ETAPA', '16755395', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7901c288-af4a-43a6-a82e-a52a7ef60435', 'GERALDINE MARIUZKA', 'MEDINA PALEMO', 'gm.medinapalemo@gmail.com', '4120640354', 'URB CALLE 3 N 2636', '17630565', 'server', '1984-06-14', '2025-10-12', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('976f23df-7112-47ba-b741-66b42116e63a', 'ANDERSON MICHEL', 'ESCOBAR LOPEZ', 'nosmichel28@gmail.com', '4126416715', 'URB. EUGENIA CALLE 1 N 3424', '15558949', 'server', '1980-12-31', '2025-10-15', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('a291ec9c-e6d4-45f4-9dc1-6674acb71d6a', 'CARLOS EMILIO', 'RANGEL MONTOYA', 'emiliomontoya87@gmail.com', '4126528499', 'URB. LAS EUGENIAS CALLE 3 N 26', 'E-84422310', 'server', '1987-04-19', '2006-01-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('73a2bd54-755f-4b3f-998e-2c308da251eb', 'DAYANA CAROLINA', 'CORTEZ DE SECO', 'dayanacortez@gmail.com', '4121225836', 'URB. LAS EUGENIAS 5TA ETAPA CALLE 11', '21113770', 'server', '1993-02-05', '2013-02-03', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e9578e8f-67a6-4680-ad38-35d490644d7f', 'JULIA YOHENIRA', 'COLINA', 'juliacolina.71@gmail.com', '4123823554', 'URB. LAS EUGENIAS 5TA ETAPA CALLE 11', '10477033', 'server', '1971-02-27', '2023-04-16', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3b0ec5b1-79c0-42ce-a8ae-d338bbd28425', 'JEFFERSON EMANUEL', 'SECO CORTEZ', 'jeferssonsecocortez@gmail.com', '4126812053', 'UR.LAS EUGENIAS 5 ETAP CALLE 11', '34247693', 'server', '2011-02-14', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('100270a4-1735-47c6-91ae-49f2e1852363', 'JOSE RAMON', 'CORTEZ DIAZ', '10702360@sionerp.local', '4121024946', 'URB. LAS EUGENIAS 5 ETAPA CALLE 11', '10702360', 'server', '1970-12-28', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('efb9638e-3753-4790-8b0e-9c29f3608c79', 'CESAR ALEXANDER', 'BELLO ACOSTA', '34548742@sionerp.local', '', 'URB. LAS EUGENIAS 5 ETAPA CALLE 11', '34548742', 'server', '2010-01-21', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('534169e6-f9a2-416a-aebf-88ac837b852f', 'ANDREINA MARÍA', 'PEREIRA GUTIERREZ', 'pereiraandreina999@gmail.com', '4246721872', 'URB. LAS EUGENIAS 5 ETAPA TRANSV 20 N 15-36', '16197604', 'server', NULL, '2025-03-09', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('c0fdaa81-b9be-4e72-a54b-2df4128d67b8', 'IVAN ALBERTO', 'SANDOVAL CHIRINO', 'iasch.2980@gmail.com', '', 'URB. LAS EUGENIAS 5 ETAPA TRANSV 20 N 15-36', '14168965', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('9d664015-9a95-46ff-918d-c123345ef206', 'EMIGBET', 'SALAS', 'emigbet2807@gmail.com', '', 'URB. LAS EUGENIAS 5 ETAPA CALLE 10', '32705199', 'server', NULL, NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('faa8d6a5-b5af-4486-acd0-467b8bc91314', 'BETZY', 'PAEZ', 'betsypaez2911@gmail.com', '', 'URB. LAS EUGENIAS 5 ETAPA CALLE 10', '15339815', 'server', NULL, NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('2d5966ed-c3a0-43f9-90b6-5297032bedb6', 'YOHANNA', 'MUJICA', 'yohannamujica745@gmail.com', '4129093179', 'URB. LAS EUGENIAS 5 ETAPA CALLE 9 N E17-2', '19251504', 'server', NULL, NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ff0ea892-e83f-4f35-a2f7-31aa75f83bef', 'ANNILEY', 'PEREZ', 'annileyperez@gmail.com', '4121089930', 'URB. LAS EUGENIAS 5 ETAPA CALLE 9 N E17-2', '33616002', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('93451faa-23cc-4ac2-8729-66ce08b34457', 'JESUS', 'MONTERO', 'monteroj2010@gmail.com', '', 'URB. LAS EUGENIAS 5 ETAPA CALLE 9 N E17-2', '34189674', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('55153a8d-0357-4d89-bb96-80e33bb1f6d6', 'NOHEMY', 'COELLO', '27503038@sionerp.local', '4122570238', 'URB. LAS EUGENIAS 5 ETAPA CALLE 10', '27503038', 'server', NULL, NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('468d1638-8c72-4e3d-b3d9-bb1f347da54c', 'ENDER JOSUE', 'JOBERA PETIT', 'eyoberap@gmail.com', '4227163924', 'URB. LAS EUGENIAS 5 ETAPA CALLE 9 TRANSV 20', '31946986', 'server', '2007-05-18', '2023-04-16', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('b508e259-b5c8-442a-90c0-1bf555802379', 'MAGLORY', 'PETIT DUNO', 'lolypetit@gmail.com', '4127668683', 'URB. LAS EUGENIAS 5 ETAPA C 9 N E17-05', '14396910', 'server', '1980-10-23', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('14afa408-3b78-4670-a6b7-e9b2f9367ff2', 'CLARET JOSEFINA', 'MOGOLLON LAZARO', 'claretmogollon2012@gmail.com', '4126867303', 'URB. LAS EUGENIAS 5 ETAPA CALLE 7 E 19 N 16', '13266602', 'server', NULL, NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('0ab2606f-e7ee-487d-bb22-acef6f0caf1f', 'NOHELIA MARGARITA', 'TOYO SALOM', 'noheliatoyo@gmail.com', '4146071327', 'URB. LAS EUGENIAS 5 ETAPA CALLE 10 N 12', '9507778', 'server', '1963-05-13', NULL, false, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('3bc8abee-5af2-4666-92eb-903628a1d5f3', 'DAMARIS NOHEMIT', 'TIGRERA DE VENTURA', 'damaritigrera64@gmail.com', '4220751321', 'URB. LAS EUGENIAS 2 ETAPA C5', '9502943', 'server', '1964-12-26', '1986-07-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('11a049a0-14bf-4285-9ee6-e0b5bc9050bc', 'XIOMARA JOSEFINA', 'ZAVALA', 'xiomaraxiomarazavala777@gmail.com', '4127680244', 'URB. LAS EUGENIAS CALLE 1 N 12-8', '7491971', 'server', '1962-11-10', '2005-03-06', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('6ddf33c7-ae31-4cc5-a780-a42c611dae60', 'JOSE', 'VENTURA', 'joseventura1063@gmail.com', '4126583289', 'URB. LAS EUGENIAS CALLE 5 N A1611. E ETAPA', '7492598', 'server', '1978-03-12', '1978-03-12', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7a8c9a9b-921f-4556-915c-74906ece638c', 'ERIKA SOFIA', 'SANGRONIS ORTUÑEZ', 'sofisangronis3@gmail.com', '4126820240', 'URB. LAS EUGENIAS CALLE 1 ETAPA 1', '31426515', 'server', '2004-05-30', '2013-12-10', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('150bc7c0-8bab-44f2-a6f1-3ea06c3cb1af', 'YRIAN', 'GUTIERREZ', 'yrianbenellan71@gmail.com', '4146980340', 'URB. LAS EUGENIAS IE CALLE 4 A 16-26', '10476940', 'server', '1971-07-02', '1991-03-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('287019a8-80eb-4c46-b336-d21854c4051d', 'CRISTINA', 'COLINA', 'cristinacolina01@gmail.com', '4127232277', 'URB. LAS EUGENIAS II', '9061721', 'server', '1961-09-23', '2015-03-30', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('7ac0c6c5-310b-47c8-9422-3b4dbebdfef5', 'EGLEE', 'LEON', 'leon_eglee@hotmail.com', '', 'URB. LAS EUGENIAS', '9503409', 'server', '1964-09-22', '2014-04-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('8f44be5b-28bd-473f-8e06-919591d64150', 'AMBAR', 'DIAZ', 'ambardiaz263@gmail.com', '4120207024', 'URB. CREPUSCULO CORIANO', '25783226', 'server', '1996-01-22', '2023-12-10', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('e7fd47fa-2570-492d-9725-e498abb03f41', 'ANGELA CIPRIANA', 'MEDINA', 'angelmedina228@gmail.com', '4120207024', 'URB. CREPUSCULO CORIANO', '20569003', 'server', '1990-11-20', '2023-12-10', true, true, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('5fac6d6f-6be5-4809-91a2-8be485472c88', 'YULIMAR', 'CHIRINO', '12736458@sionerp.local', '4127394872', 'LAS EUGENIAS CALLE 4 1 ETAPA', '12736458', 'server', '1975-02-19', NULL, true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ed327b85-0890-4127-a33e-1327adb8859c', 'OSCAR JESUS', 'LACLE MEDINA', 'lacle1504@gmail.com', '4126805179', 'VELITA II, AV. 2 CASA 42', '19252431', 'server', '1987-04-15', '2025-10-12', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('addc2adc-0566-49d7-8bd3-0610a767dff0', 'YOLAIDA MARIA', 'MEDINA RIVERO', '9507813@sionerp.local', '4121235002', 'VELITA II, AV. 2 CASA 42', '9507813', 'server', '1960-03-26', NULL, false, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('27d20b12-3440-4c56-92e2-8884a4d143db', 'JEIBER JESUS', 'BETANCOURT LUGO', 'jeiberbetancourt@gmail.com', '41204126836952', 'VELITA II, AV. 2 CASA 42', '34679895', 'server', '2011-12-27', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('f756dea7-d7fa-43d2-bda2-29a2df65f752', 'JESSICA DE LOS ANGELES', 'LUGO CHIRINOS', 'lugojessica37@gmail.com', '4141438630', 'VELITA II, AV. 2 CASA 42', '21156836', 'server', '1991-11-27', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('c888c8d8-7156-4579-9c54-01c10bef6588', 'WILLIAN ANTONIO', 'MELENDEZ HERNANDEZ', 'melendezwillian1@gmail.com', '4121024684', 'VELITA 1 BLOQUE 38', '18197651', 'server', '1983-07-20', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('38870850-6c67-4fac-81e0-154f7cdf2c6b', 'RUTSIMAR COROMOTO', 'GARCIA CAZORLA', 'rutsigarcia@gmail.com', '4126589675', 'GMAIL', '17923421', 'server', '1986-10-05', '2012-10-10', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('afbbca05-7e59-45d8-a2ad-23787671cdc1', 'FREDDY JOSE', 'DUNO CHIRINO', 'theduno21@gmail.com', '4129599286', 'VELITA II, CALLE 18, VRDA 29 N 9', '17351876', 'server', '1985-04-24', '2004-05-01', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('54727faf-cad1-44ef-83ca-e2157aaf0700', 'GLENDYS HENDRINA', 'GOMEZ GONZALEZ', 'chinoragm@gmail.com', '4121276187', 'VELITA I', '15558836', 'server', '1980-09-19', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('bdbd9f93-c357-4a93-b122-b30dac073181', 'NICOLE MERARI', 'GOMEZ GONZALEZ', 'nicolemerari1@gmail.com', '4122521021', 'VELITA 1 BLOQUE 10', '33577087', 'server', '2008-09-29', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('4aa8bbbe-1a36-4009-b7c9-78093fcc8fb8', 'ARGELIA SARAIS', 'CASTRO CUART', 'argeliadv@outlook.com', '4149629777', 'VELITA 1', '28251068', 'server', '1997-09-22', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('970c787f-908e-4994-83cf-c0cdff9e0fc0', 'AURIBEL', 'DELGADO', 'auribeldelgado@gmail.com', '4246058622', 'VELITA 1', '30949162', 'server', '2001-09-25', NULL, false, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fec9f42e-b81a-4e4d-943e-cac1f348923d', 'JESUS ANTONIO', 'VERIS SANCHEZ', 'jesusveris2012@gmail.com', '4121044811', 'VELITA 1 BLOQUE 40, APTO 01-02', '21544726', 'server', '1993-11-11', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('f4b20aff-e39d-4953-bdab-1f60dec18f22', 'JORGE LUIS', 'PORTILLO SANCHEZ', 'portilloj290706@gmail.com', '4140592167', 'LAS VELITAS BLOQUE 40, APTO 02-03', '15558930', 'server', '1982-01-13', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('2896936f-ebce-45c9-9b2d-3ebf26bacc77', 'MAGNA ELIZABETH', 'ARTEAGA DE PORTILLO', 'magnaarteaga2017@gmail.com', '4246192628', 'LAS VELITAS BLOQUE 40, APTO 02-03', '16438200', 'server', '1983-05-13', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('056530e1-a69b-486a-add1-4d27340af7b1', 'PRISCILA ISABELLA', 'PORTILLO ARTEAGA', '34308172@sionerp.local', '4146641312', 'LAS VELITAS BLOQUE 40, APTO 02-03', '34308172', 'server', '2011-04-26', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('7370e158-4899-4ea8-8aaf-dc35e57aba14', 'YENEREDITH ALEJANDRINA', 'CHIRINOS SALAS', 'yennyalejandra225@gmail.com', '4126816868', 'LAS VELITAS BLOQUE 45 1 PISO APTO 0106', '', 'server', '1976-04-06', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('c78d8a66-3f0a-4196-8c40-d0f9a4af3994', 'LISMAIRA RAMONA', 'MEDINA POLANCO', 'lismairamedina@gmail.com', '4126449504', 'LAS VELITAS ETAPA 1 BLOQUE 35 APTO 0005', '11799645', 'server', '1972-05-02', '2025-10-12', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('95f8b2ff-92ec-4a42-a7d4-6435fc01b5dc', 'LICE MARINA', 'CUART CASTRO', 'licecuart@gmail.com', '4129836093', 'SECTOR BOBARE, CALLEJON SANTA INES', '12184573', 'server', '1974-11-22', '2022-11-18', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('d4fe1239-9d8a-46ad-a3c8-326f5cebf2dc', 'FANNY MARIA', 'YANEZ', 'fannyyanez3@gmail.com', '4127698918', 'VELITA 1 BLOQUE 35', '11477853', 'server', '1973-07-30', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('1db89f66-f860-4122-96ce-60241588fd2e', 'LISBETH', 'MEDINA BERMUDEZ', 'lisbechiqui18@gmail.com', '4246341189', 'LAS VELITAS BLOQUE 2 APTO 0103', '9518698', 'server', '1976-08-13', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('131a075c-1b24-4e85-948c-e28f042fb6df', 'ALIDA', 'BRACHO', 'alidabracho@gmail.com', '4121583935', 'LAS VELITAS BLOQUE 32 APTO 0208', '5284077', 'server', '1955-05-02', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('4b2a02ff-aaea-4401-b88e-abc8a91a2491', 'ANGEL', 'RIVERO', 'riveroangel@gmail.com', '4121583935', 'LAS VELITAS BLOQUE 32 APTO 0208', '5750030', 'server', '1955-01-05', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('f5227c6b-d0cf-4d09-81f2-10da33aab4cf', 'NAIROBY DEL CARMEN', 'MORALES ACOSTA', 'nairobyhijos@gmail.com', '4120646999', 'CR BOLIVAR LIBERTADOR, CALLE LA ISORA N 47', '12184080', 'server', '1971-11-26', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('e561b550-6f89-4bd6-a6f8-752a366b91f6', 'ANA AUXILIADORA', 'COLINA CHIRINOS', 'anaauxiliadoracolina@gmail.com', '4126454744', 'LA VELITA 1 BLOQUE 14 APTO 0002', '5295103', 'server', '1960-10-28', '2002-06-09', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('010bd325-62fd-4f80-b086-e7b13513bb3d', 'MARIA DE LOS ANGELES', 'OLLARVES CRESPO', '20501515@sionerp.local', '4224800385', 'VELITA 1 BLOQUE 39', '20501515', 'server', '1988-07-30', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('93fe54c0-d61a-4ff4-993f-1c630b7f2aa0', 'MARTHA ROSARIO', 'SEMPRUM LOPEZ', 'marthasemprun@gmail.com', '4126907615', 'LAS VELTAS BLOQUE 1 APTO 0308', '10709636', 'server', '1971-12-20', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('ed4a4d2d-da98-40c5-b081-124ad421826f', 'FRANKLIN ANTONIO', 'SANCHEZ CHIRINOS', 'sanchezfranklin572@gmail.com', '4241451927', 'VELITA 2 AV PPAL', '11473249', 'server', '1972-12-05', '2012-08-11', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('b7828f96-96db-4344-8376-0487d9442e94', 'MARUJA', 'SIRIT DE PALMO', 'siritmaruja@gmail.com', '4127805986', 'VELITA 2 CALLE 13 V 2 N 9', '5292915', 'server', '1959-08-07', '1987-12-31', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('e0965daf-eb4d-4ee8-a190-8cd8e5f850bf', 'GENOVEVA', 'NIEVES DE SANCHEZ', 'vevanieves@gmail.com', '4241451927', 'VELITAS 2 AV PPAL N 66', '12500377', 'server', '1974-12-10', '2012-08-11', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('3fd2c3c8-22da-4e9e-98bd-8942b70d577a', 'FRANGELI YERANI', 'SANCHEZ NIEVES', 'frangelissanchez05@gmail.com', '4262602575', 'VELITAS 2 AV PPAL N 66', '27607345', 'server', '2001-01-05', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('ab5a1497-032b-4394-b081-37b7ed6e2030', 'YEXIBEL DEL CARMEN', 'SANCHEZ NIEVES', '33363322@sionerp.local', '4246339432', 'VELITAS 2 AV PPAL N 66', '33363322', 'server', '2006-11-28', '2023-12-10', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fb4f6c61-bc85-4ce6-92e3-d95ba07a873c', 'XAVIER DAVID', 'QUEIPO PETIT', 'xavierqueipo@gmail.com', '4128287399', 'VELITA 2 VEREDA 12 N 03', '20569040', 'server', '1991-03-23', '2011-04-08', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('2bb2e9c0-34c9-45a4-bd17-1d736a60a4f5', 'CARMEN', 'SANCHEZ', 'carmens9629@gmail.com', '4140168262', 'BLOQUE 38 LA VELITA APTO 0204', '4643228', 'server', '1956-03-29', '2001-01-28', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('e166b4ea-2c5d-4ff5-9d13-0805b85313c1', 'YOLIMAR MARIA', 'COLINA LEAL', 'yolimarcolina10@gmail.com', '4146949411', 'VELITA 1 BLOQUE 20 APTO 0205', '20931721', 'server', '1990-03-10', '2021-12-05', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fa220d2a-8c2f-4d1b-8ec5-3bc7d192e35a', 'YANELIN DEL CARMEN', 'ROMERO DAAL', 'yanelinromero23@gmail.com', '4122157433', 'VELITAS 2 V12 N 3', '25127621', 'server', '1994-10-23', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('35a44203-1094-4830-b805-2a268a8b5e27', 'YOIMAR MARIA', 'COLINA LEAL', 'joimarmariacolinaleal@gmail.com', '4125269269', 'VELITA 4 CALLE 6 N 10', '20931720', 'server', '1990-03-10', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('c7712a41-fa83-4b77-91ad-95b35eb2694c', 'CLARA RAFAELA', 'ROMERO SANGRONIS', 'clararafaelaromero@gmail.com', '4124897291', 'VELITA 4 CALLE 3 N 17', '7495787', 'server', '1962-05-12', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('6ceb23ca-9b6c-4ae4-bd31-2367d49146df', 'BRYAN DANIEL', 'NAVARRO DUNO', 'bryan0212navarro@gmail.com', '4124281212', 'VELITA 4 C 03 N 17', '31238889', 'server', '2005-12-02', NULL, false, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('0061654e-79e3-4ed0-baef-8790bd69db36', 'JESUS RAFAEL', 'GONZALEZ CASTILLO', 'jesusrafaelgonzalez1963@mail.com', '4161403639', 'VELITA 4 CALLE 6 N 12', '9507950', 'server', '1963-03-01', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('1f75cf2f-ef6b-46a8-8d14-2ac1abb7f449', 'CLARISBEL ANDREINA', 'NAVARRO DUNO', 'clarisbelnavarrol@gmail.com', '4224281515', 'VELITA 4 CALLE 3 N 17', '3468149', 'server', '2009-02-05', NULL, false, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fd4baa48-9983-4f6d-9fb2-295ced3082ac', 'MARIA ANA', 'LEAL GUTIERREZ', 'lealgutierrezmariana@gmail.com', '4124270366', 'VELITA 4 CALLE 6 N 10', '9507185', 'server', '1965-08-29', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('df17d1eb-ec42-477b-a6e1-79208a512dd0', 'ASTRI ANDREINA', 'HIEDRA BARBOZA', 'hirdraastri8@gmail.com', '4125749159', '480 AÑOS SANTA ANA DE CORO', '21447195', 'server', '1987-06-08', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('8223eb19-3247-4f63-b461-c316c37be24e', 'JOHANNA JOSEFINA', 'PEROZO BRACHO', 'johannaperozo19@gmail.com', '4246588294', 'CALLE CURBATTI ENTRE SUCRE Y GIRALDOT.', '16520567', 'server', '1984-03-19', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('8ffe3527-973c-4bda-b8e1-015a351d0587', 'JOSIMAR JOSEFINA', 'REYES LUGO', 'josialir2020@gmail.com', '4120726511', 'VELITA 4 VEREDA 6 N 3', '18769275', 'server', '1987-08-07', '2022-12-05', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('add54e4b-93fc-4e06-a6a5-ee54e21c16b9', 'ENDY', 'QUINTERO', '13417491@sionerp.local', '4129643276', 'VELITA 4 C 8', '13417491', 'server', '1977-09-02', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fa5d50e5-0edb-4e7e-9240-d6798f134bd4', 'MILAGROS DEL VALLE', 'SUAREZ BUENO', 'milgarosvsb69@gmail.com', '4126664614', 'MONSEÑOR ITURRIZA 3 ETAPA', '10478583', 'server', '1969-02-19', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('d6f86eb1-9193-46b7-b3b3-10b4ebfd8f7b', 'ELY Y', 'SIVIRA G', 'elysivira385@gmail.com', '4126877787', 'MONSEÑOR ITURRIZA CALLE 2 N 131', '7474107', 'server', '1959-12-16', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('3ca967ef-b389-4651-a462-ebbac0da0204', 'MARIANT PAULA', 'CHIRINOS GONZALEZ', 'mariantchirinos@gmail.com', '4126855798', 'MONSEÑOR ITURRIZA CALLE 12 N 271', '25440685', 'server', '1996-09-13', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('ef3b099b-e99e-455f-8748-dd14dc96e4b7', 'BELKYS E', 'CHIRINOS', 'belkisch960@gmail.com', '4126802744', 'MONSEÑOR ITURRIZA CALLE 2 N 139', '7478306', 'server', '1960-09-29', '2015-12-05', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('8cb9ae2b-0086-4b91-8927-1d70fc2785c7', 'MARIA VALENTINA', 'PACHANO FUGUET', 'mavalefuguet1806@gmail.com', '4120426236', 'MONSEÑOR ITURRIZA 3 CALLE 2', '32064719', 'server', '2007-06-18', '2024-04-28', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('b49db6bf-1778-40ad-a36c-f599c79ca1f4', 'ISAMAR GUADALUPE', 'MARIN GONZALEZ', 'marinisamar268@gmail.com', '4120884906', 'MONSEÑOR ITURRIZA 3 CALLE 16', '33363176', 'server', '2006-12-12', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('c0164c0a-208d-41a0-add5-97fb8dff74d6', 'ESCARLET JIREH', 'REVETTE MENDEZ', 'jireh.revette@icloud.com', '4126857742', 'VELITA II', '33309760', 'server', '2007-10-04', '2025-10-12', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('ad08200c-74be-4a7b-acc8-b11f4dc20e72', 'EMILYS EDITHA', 'CALDERON MEDINA', 'elimyscalderon@gmail.com', '4146973392', 'MONSEÑOR ITURRIZA ETAPA 1 CALLE 2 N 100', '29641085', 'server', '2002-08-15', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fd4e1e8e-28be-45be-bb18-407960c382e7', 'VALESKA D"LA LUZ', 'PALEMO', 'valesskapalemo@gmail.com', '4224855627', 'SIBURUA', '31437822', 'server', '2006-05-24', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('4ce19157-4a60-473b-b1e8-4ae5de8f9b8e', 'GUILLERMO', 'ROSENDO CHIRINOS', 'ftigre2007@gmail.com', '4120761766', 'MONSEÑOR ITURRIZA', '19824744', 'server', '1990-09-14', '2017-12-24', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('1c8dc706-3fac-4cab-ab88-5d289c1246d4', 'ZACKARY DAVID', 'SANCHEZ SOTO', 'zackarysanchezsoto@gmail.com', '422021090', 'CIUDADELA NUCLEO 7 N 109', '31945767', 'server', '2006-09-25', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('05a77ebe-019d-4e36-93ab-97d2e1cfb4f1', 'ANDRES JOSE', 'LARA NAVARRETE', 'laraandres2021@gmail.com', '4246013354', 'CALLE GARCES ENTRE FEDERACION Y COLON', '31328123', 'server', '2006-05-16', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('d0dfa104-431f-4ae0-bf65-eccaa04f81c3', 'CRISTIAN GABRIEL', 'AYALA MOSQUERA', 'ayalacristian.g@gmail.com', '4121386707', 'MONSEÑOR ITURRIZA 3 ETAPA CALLE 12 N 271', '26270077', 'server', '1997-02-02', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('68c32884-1f25-4acc-aac3-a97eba85a842', 'YOLANDA MARIA', 'CAMEJO RAMIREZ', 'yolancamejo@hotmail.com', '4160660540', 'MONSEÑOR ITURRIZA 1 ETAPA N 07', '9521800', 'server', '1966-02-23', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('b2fac1c8-4e2b-40b6-ae95-c496059a5507', 'ROSA ANGELICA', 'GOTOPO MELENDEZ', 'gotoporosa123@gmail.com', '4126815424', 'AV. SUCRE CON CALLE SOL', '29979279', 'server', '2001-05-03', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('82274bd6-90ff-4c16-9218-7ce22625c919', 'LUIS MANUEL', 'ZARRAGA JIMENEZ', 'luiszarragajm@gmail.com', '4246486614', 'AV. SUCRE CON SOL', '21114978', 'server', '1993-09-27', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('bc0fea53-83bd-46de-a73e-398014691a6b', 'FRANNY EVANGELYN', 'MORILLO COLINA', 'frannyemc@gmail.com', '4126597720', 'MONSEÑOR ITURRIZA CALLE 16', '27247990', 'server', '2000-11-01', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('48037ca4-4c1c-47f4-a409-cadd3c8f6c8d', 'ISAAC JAVIER', 'BONALDE PRADO', 'ibonalde001@gmail.com', '4246212466', 'MONSEÑOR ITURRIZA CALLE 16', '29513844', 'server', '2001-10-22', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('fa1bdd39-012b-46b1-9fab-54803a107b57', 'MIRTHA', 'MEDINA', 'mmirene1970@hotmail.com', '4167352834', 'CIUDADELA N 111', '1047862', 'server', '1970-03-10', '2022-04-12', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('39b5b4e5-80d4-475c-912f-ef15b8e3c1a1', 'JOSE ANTONIO', 'PACHANO FUGUET', 'joseantoniopachano33@gmail.com', '4262673707', 'MONSEÑOR ITURRIZA, ETAPA 3 CALLE 2', '33616537', 'server', '2009-03-12', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('d3b3099a-77f9-411d-8db1-55f1b0580c05', 'HENBERT ANTONIO', 'MEDINA RODRIGUEZ', 'hemedanto@gmail.com', '4126423409', 'CALLE CUBA SECTOR PANTANO ABAJO', '14735307', 'server', '1979-08-12', NULL, true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('486a3c0d-cd63-4327-b31f-fb317d7fa3e7', 'MARITZA COROMOTO', 'LEAL LUGO', 'maritzaleallugo@hotmail.com', '4163639317', 'ZUMURUCUARE CALLE ZULIA', '11138495', 'server', '1968-06-15', NULL, false, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('e81e8816-a780-493b-be56-aaf36cb47e13', 'ELIA YAMILET', 'BERMUDEZ MORALES', 'sofia.val19@gmail.com', '4146627549', 'ZUMURUCUARE', '11801318', 'server', '1970-07-21', '1989-02-10', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('e99852fb-b22b-4826-8fa8-84e3fb8c22e0', 'FRANCISCO ELIEZER', 'SANCHEZ CHIRINOS', 'feschi9510@gmail.com', '4120754895', 'ZUMURUCUARE SECTOR 5 CALLE NEGRO P.', '9510274', 'server', '1964-09-28', '1964-09-14', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('a165a9a3-82b6-448a-9d52-4827155e03fc', 'GLADYS MARGARITA', 'MARTINEZ RUIZ', 'correogm750244@gmail.com', '4125294695', 'ZUMURUCUARE SECTOR 5 CALLE NEGRO P.', '9508676', 'server', '1962-10-07', '1964-09-14', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('1f5ba5eb-b68c-494a-8938-2f12ad4de14a', 'GONZALO DAVID', 'CHIRINOS PIÑERO', 'chirinogonzalo07@gmail.com', '4121779514', 'EDF. DON SILVEIRO TORRE A', '25440476', 'server', '1995-10-05', '2014-03-16', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('75c1cf56-3d80-4ba9-ad47-b1de31f6197b', 'ANA LUCIA', 'PARRA RABAN', 'luciaraban1403@gmail.com', '4123167647', 'EDF. DON SILVEIRO TORRE A', '24941132', 'server', '1996-05-19', '2015-05-09', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('8d631223-5ff6-46c2-ad7f-a06e49868425', 'IRMA JOSEFINA', 'ZARRAGA MEDINA', 'irmazarr447@gmail.com', '4264607275', 'LA CAÑADA', '9926260', 'server', '1966-09-28', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('3c27e727-1eff-4fd2-b2d9-d4a2e1670a4d', 'BELKIS MARILU', 'CHIRINOS', 'contadorpublicok@gmail.com', '4121565816', 'SECTOR 1 ZUMIRUCUARE, CALLE SAN JUAN', '4560480', 'server', '2025-12-15', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('5a38e746-6a1d-4661-b5ca-e92616983f27', 'WILLY JOSE', 'ALVARADO ARIAS', 'portrabajo83@gmail.com', '4124963322', 'SECTOR 1 ZUMIRUCUARE, CALLE SAN JUAN', '17923932', 'server', '1972-05-05', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('71c9a855-1279-4da2-8a9c-5be9bdb12e60', 'KLEYDISMAR ODALIS', 'VILLEGAS CHIRINOS', '19804982@sionerp.local', '4124963322', 'SECTOR 1 ZUMIRUCUARE, CALLE SAN JUAN', '19804982', 'server', '1988-12-19', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('9d63d0ee-deac-459e-9d9f-a31bc3b7438a', 'JEOSANNY DEL CARMEN', 'ESCALONA BARRIOS', 'jeosanny2112@gmail.com', '4268250760', 'CALLE PADILLA SECTOR 2 ZUMUCUARE', '15275176', 'server', '1981-12-21', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('593bb990-178e-4562-a0ee-3861af3566df', 'NORKYS NOHEMI', 'VERIS SANCHEZ', 'verisnorkis@gmail.com', '4126933701', 'ZUMURUCUARE CALLE PEREZ BONALDE', '24351009', 'server', '2002-03-25', '2017-01-08', true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('59eea718-1f14-47e2-8e44-1740789265a9', 'VALERIA SOFIA', 'LEMA BERMUDEZ', 'valeriasofialb2021@gmail.com', '4140644345', 'ZUMURUCUARE', '30236743', 'server', '2003-06-16', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('44b81616-6510-4eef-ad41-030e5e27746f', 'GENNY JOSE', 'MORENO MEDINA', 'gennymoreno2005@mail.com', '4124674171', 'LAS EUGENIAS, 8 ETAPA, MANZANA 46-28', '17027598', 'server', '1980-02-23', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('cee0c6ac-cd17-48c5-8124-150afe6f6aca', 'CARMEN ZORAIDA', 'PETIT QUINTERO', 'drchirino49@gmail.com', '4120607616', 'URB. STA MARIA CALLE 16 N 15', '8775946', 'server', '1970-10-22', NULL, true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('f5275b85-161b-4ff5-a7da-404b3c3ab694', 'DOUGLAS RAMON', 'CHIRINO OROPEZA', '9519556@sionerp.local', '4127514300', 'URB. STA MARIA CALLE 16 N 15', '9519556', 'server', '1967-06-26', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('9b9211b0-16ef-45fb-9563-7fb9edacd7e1', 'MARIA YSABEL', 'ROSILLO ALVARADO', 'mariaysabelrosillo@gmail.com', '4126584018', 'URB. STA MARIA CALLE 17 N 24', '11805211', 'server', '1972-03-17', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('2583d715-1594-446b-a4fa-fe252699cbed', 'CESAR ABDIAS', 'SIVIRA ROSILLO', 'siviracesarabdias@gmail.com', '4246416675', 'URB. STA MARIA CALLE 17 N 24', '33362884', 'server', '2010-06-04', NULL, false, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('2e92af8f-4298-42de-8e9c-c8711395bfd8', 'MIGDALIA DEL VALLE', 'ALVAREZ SOTO', 'alvarezmigdalia3@gmail.com', '424690536', 'URB. STA MARIA CALLE 9 CASA 10', '10478271', 'server', '1969-01-07', NULL, true, true, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('74dcb90f-4825-461c-86a3-0b519dee850b', 'LIDUVINIA MARGARITA', 'GONZALEZ CORONEL', 'liduvinia.m57@gmail.com', '4146560315', '', '5297323', 'server', '1957-01-01', '2018-10-14', true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('947db020-c7be-4f1f-b9a0-4ff95f28e410', 'CESAR R.', 'SIVIRA GARCIA', '9928978@sionerp.local', '4246317523', 'SANTA MARIA CALLE 17 N 24', '9928978', 'server', '1967-12-08', NULL, true, false, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()),
  ('65f572be-fec4-465d-a0dd-8c742e9ee5c6', 'ANGEL GABRIEL', 'ACOSTA PIÑA', 'angeladosta29712@gmail.com', '0412693301', 'SECTOR ZUMURUCUARE CALLE PAEZ', '29712279', 'server', '2002-03-25', '2017-01-01', true, false, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()),
  ('ff2a5837-0f37-4e97-849e-8bd3c59c1831', 'YOSELYN ERNESTINA', 'MEDINA MEDINA', 'yoselynmedina03@gmail.com', '4125480468', 'CALLE AURORA, SECTOR CHIMPIRE', '25945349', 'server', '1996-03-07', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('c7cd28d5-c923-40c4-a97c-cf937297ccc7', 'GLEMY MARIELA', 'MARCHÁN QUINTERO', 'glemy04marchan@gmail.com', '412787970', 'LOS CLARITOS, CALLE RAÚL LEONI', '12181368', 'server', '1974-08-04', '2011-10-09', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('733d66c8-4c27-464d-9ea8-57a6aa3edf63', 'MARIA EUGENIA', 'CHIRINOS VARGAS', 'mariaeugeniachirinovargas@gmail.com', '4120528348', 'CALLE DEMOCRACIA CON ITURBE', '9511009', 'server', '1964-11-15', '2010-10-03', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1ca039ee-6322-4ad9-ae11-47d26fba4c0e', 'VIVIANA FRANCHESKA', 'GOMEZ CHIRINOS', '33508792@sionerp.local', '4121686114', 'CALLE DEMOCRACIA CON ITURBE N 2-2', '33508792', 'server', '2008-01-21', NULL, false, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3c451671-bd59-453d-a105-b97b6570f490', 'ABRAHAM G', 'GOMEZ NOGUERA', '34025599@sionerp.local', '4160155360', 'CALLE DEMOCRACIA CON ITURBE N 2-2', '34025599', 'server', '2011-11-17', NULL, false, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1e530082-69f1-465a-99f8-9c6535454600', 'MIGDELY SABINA', 'CHIRINO NAVEDA', 'valemar0903@gmail.com', '4127648444', 'CALLE MAPARARI CON FLORES. CHIMPIRE', '12523939', 'server', '1976-09-02', '2024-04-10', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d2181e3d-a625-4529-a5c1-6b7dd1cd1bf8', 'WILLIAM DANNIELL', 'CAPIELO NARANJO', 'williamcapielo@gmail.com', '4126853631', 'CALLEJON AURORA CON DEMOCRACIA, CABUDARE 1', '19928988', 'server', '1989-01-21', '2019-12-09', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1d183bb7-00a5-46a6-b18c-c3d1e37e3e53', 'MARITZA COROMOTO', 'CHIRINOS', 'marinesantonella20@gmail.com', '4127656103', 'CALLE CHURUGUARA ENTRE COLINA E ITURBE', '9504060', 'server', '1965-01-26', '2024-04-28', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('b2ecf9c9-ee37-47fa-bf47-2f5462a960a1', 'ENILDA', 'MEDINA', 'enildamedina7@gmail.com', '414497897', 'CALLE AURORA, SECTOR CHIMPIRE', '7499182', 'server', '1960-06-26', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('b720274e-61c1-4639-899c-3668f6c88395', 'MARIA FRANKSHESKA', 'PETIT FLORES', '34247174@sionerp.local', '4169683386', 'CALLEJON SIERRALTA CHIMPIRE', '34247174', 'server', '2010-02-18', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('8fdb0c28-d167-47d9-b1ec-1f67b51c6ae1', 'FRANK REINALDO', 'PETIT GARCIA', 'frankpetit901@gmail.com', '4246242486', 'CALLEJON SIERRALTA CHIMPIRE', '10479877', 'server', '1971-05-23', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('5be4f75a-f7fc-4e26-ac87-3fc4b82457b4', 'JUAN DE DIOS', 'PETIT FLORES', '34247157@sionerp.local', '4169683386', 'CALLEJON SIERRALTA CHIMPIRE', '34247157', 'server', '2011-11-03', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1b0b1745-e7f4-4f3f-9bf0-fe17aaf1f0a7', 'SARELY', 'FLORES DE PETIT', '11962743@sionerp.local', '4169683386', 'CALLEJON SIERRALTA CHIMPIRE', '11962743', 'server', '1973-11-15', '2014-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('4765174c-04ba-44eb-a872-eb54a5bab757', 'MARTHA', 'RIVERO', 'martharivero832@gmail.com', '', 'CALLE BUCHIVACOA CON ITURBE', '7490128', 'server', NULL, '2019-08-14', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('37f94a1f-f838-4472-b4ff-85f893ab178b', 'ALIDA MARÍA', 'JORDAN', 'alidajordan497@gmail.com', '', 'CALLE DEMOCRACIA CON AV MANAURE', '9931642', 'server', '1958-05-25', '2022-04-17', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3686bc6d-676a-4f2d-aa3c-f7fa548d83c5', 'ELVIS CANDELARIA', 'CALDERON ROJAS', 'elviscalderon0202@gmail.com', '4140585496', 'CR LAS BEGONIAS N 13', '4108978', 'server', '1957-02-02', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('39c6a97a-7233-480c-b2c1-0ea72e523f66', 'GLADYS MERCEDES', 'BARRENO DE REYES', 'gladysdereyes61@gmail.com', '4121732135', 'CALLE GARCES URB 450. ED. EL CARDON', '5585709', 'server', '1957-04-03', '1983-12-18', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('6dc15117-162a-4f0f-89af-433b94a41443', 'NAYLETH DEL ROSARIO', 'VELAZCO RIVAS', 'naylethvelazco72@gmail.com', '4128706175', 'CALLE GARCES URB 450. ED. DIVIDIVE', '11745140', 'server', '1972-08-25', '2024-04-28', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('573cf339-9846-4532-bedf-912012441f6e', 'IRELYS ELAINY', 'MEDINA GONZALEZ', 'irelysm@gmail.com', '56961545108', 'URB. MONSEÑOR ITURRIZA CALLE 2 N 100', '9927489', 'server', '1970-02-04', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f5b25760-20b8-46b0-a5e9-9092e3738c9c', 'VICMERVIS NATALI', 'ZAVALA CALDERON', 'zavalavicmervis@gmail.com', '4149905250', 'LAS BEGONIAS, CALLEJON JURADO N 13', '18199595', 'server', '1988-11-26', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f01b04eb-510c-4f97-aace-501f22eedaa0', 'LUIS EDUARDO', 'ILLAS VELAZCO', 'illasluis@gmail.com', '4128937761', 'URB. 450 ED. DIVIDIVE', '19890914', 'server', '1992-01-05', '2024-04-28', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d7254250-b399-4e0c-a4a8-5490c08b3c2e', 'DORIS GISELA', 'REYES BARRENO', 'reyes.dorisgisela@gmail.com', '4125353477', 'URB. 450. ED. CARDON', '15458659', 'server', '1979-01-04', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('07acf1ea-4a56-44e6-b14e-892272025aab', 'GLENNYS JOHANNA', 'PACHECO LEONES', 'pachecojohanna9@gmail.com', '4246112561', 'CALLE GARCES BOBARE', '14397977', 'server', '1979-07-26', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('7c39fa68-16d9-4d81-8b93-e030765867bd', 'KAREN KATIUSKA', 'VELASQUEZ VELAZCO', 'velasquez.karenk@gmail.com', '4128878312', 'CR 450 ED. DIVIDIVE', '27508203', 'server', '2000-03-02', '2025-03-08', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f61679e2-f542-4501-8c95-5196dffad8be', 'CRISTINA DE JESUS', 'GILSON SANCHEZ', 'cristipolgil@gmail.com', '4146822205', 'CR 450. ED. CARDON', '11805091', 'server', '1975-01-21', '1989-09-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('2429e2b0-7ff4-40cc-9820-d696fba75e67', 'GLADYS JOSEFINA', 'PACHECO LEONES', 'gladisdepacheco1952@gmail.com', '4124471007', 'CALLE GARCES BOBARE', '4104602', 'server', '1952-04-09', '2025-10-12', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d9fb3eb5-d423-476c-a244-6abc66045ced', 'RUPERTO G', 'CALDERON ROJAS', '9502923@sionerp.local', '4146845443', 'URB. MONSEÑOR ITURRIZA CALLE 2 N 100', '9502923', 'server', '1963-06-30', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('6e178d77-5086-4818-a8dc-4900d3f0a1f7', 'OSWALDO DANIEL', 'COLINA BRACHO', 'colinadaniel2@gmail.com', '4123983538', 'CARRETERA MORON CORO. LOS BOSTEROS', '22896184', 'server', '1993-07-02', '2009-08-08', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('89a4c9e4-e572-4170-99a4-17c2d2d525e5', 'ADRIANA CAROLINA', 'GUTIERREZ ARECHE', 'adrianacdr66@gmail.com', '4246212116', 'AV. ROMULO GALLEGOS N 29', '27543713', 'server', '1999-07-04', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('c52eaa91-68de-42fa-a013-3e3587eb30f1', 'JACKIE EYRETH', 'LUNA NAVAS', 'lunajackie24@gmail.com', '4144320697', 'CALLE BUCHIVACOA ENTRE ITURBE Y FLORES', '14795816', 'server', '1980-09-25', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f906fb5b-c006-4eb8-b611-d95ccc5a656c', 'MONICA ALEXANDRA', 'BATTISTA CHIRINO', 'monicaalexandrabattista@gmail.com', '4146579542', 'CALLE GONZALEZ CON DEMOCRACIA Y SUR', '31736471', 'server', '2006-05-11', '2018-07-12', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('ca9af605-82b9-49d1-9a3a-3dfe8d4e39dd', 'ARIANNE ESMERALDA', 'SANCHEZ REYES', 'arianneesmeralda406@gmail.com', '4246276314', 'CALLE MONZON ENTRE FLORES Y CABAÑA', '34247327', 'server', '2008-01-29', '2025-10-12', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('ac8ba817-99fc-4ce9-b6ae-c05cf24c734e', 'ZAIDIMAR SARAI', 'EGURROLA CUICAS', '19251744@sionerp.local', '4146820062', 'PROLONGACION AV. MANAURE', '19251744', 'server', '1989-02-23', '2010-02-28', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('83b01a6f-1793-4ea2-8675-b3cfb238313a', 'ALEXANDER JOSE', 'GUTIERREZ MORA', 'alegutierrez@gmail.com', '4127696245', 'AV. ROMULO GALLEGOS N 29', '14734015', 'server', '1978-09-04', '2025-03-09', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('e53c7db3-71fb-48fb-bf34-0f3c409f8e6d', 'ANYER VALOIS', 'GUTIERREZ ARECHE', 'anyergutierrez2001@gmail.com', '4246207543', 'AV. ROMULO GALLEGOS', '28251004', 'server', '2001-02-24', '2025-03-09', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('fbc23906-6e54-44fd-ad0b-191cc5ec16ac', 'LEIMARY DILCIBETH', 'CHIRINO BERMUDEZ', 'mariobattistavillalobos@gmail.com', '4125801847', 'CALLE GONZALEZ CON DEMOCRACIA Y SUR', '14654717', 'server', '1981-04-24', '2014-05-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('0feb7e8b-d47d-47d7-8f2b-356a0af42e44', 'JESUS DAVID', 'BATTISTA CHIRINO', '2419480000400430@sionerp.local', '4122520590', 'CALLE GONZALEZ', 'Sat Jul 24 1948 00:00:40 GMT-0430 (Venezuela Time)', 'server', '2011-02-08', '2025-10-12', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4004c5db-f018-4ae7-8e1c-1de7c70b1e13', 'ADELAIDA JOSEFINA', 'CHIRINOS DE GALICIA', 'adelsygalicia@gmail.com', '4146824536', 'CALLE MONZON CON ITURBE', '3361490', 'server', '1948-07-24', '2010-02-28', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d3cc25b9-da87-4874-89bb-f1f0bfe68b45', 'NAIDY MARIU', 'ESTUPIÑAN TREMONT', 'naidy1805@gmail.com', '4246345313', 'AV. ROMULO GALLEGOS', '25127912', 'server', '1995-05-18', '2025-03-09', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('15b1b44e-7f36-4ecc-baf7-dc5c4b206302', 'ZARAI VALENTINA', 'YORES EGURROLA', '32208906@sionerp.local', '4120606961', 'LOS CLARITOS', '32208906', 'server', '2008-04-03', '2025-03-09', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('84fe10ae-30f8-4ef6-9ff2-1a5533cf5805', 'JULIANNY TRINIDAD', 'SUAREZ OLIVARES', 'juliannysos1990@gmail.com', '4121230142', 'CALLE SUR CON ITURBE N 10', '20213012', 'server', '1990-09-09', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('402e90e1-cf99-4fd2-9b15-e1af94d4c870', 'ALBERT EDUARDO', 'GUTIERREZ ARECHE', 'gutierrezalbert188@gmail.com', '4246842636', 'AV ROMULO GALLEGOS', '31627532', 'server', '2005-08-27', '2019-12-10', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('536c10a1-b396-4bfa-a021-64b3ffce32d7', 'MAILYN ELENA', 'MENDEZ VASQUEZ', 'mendezmailyn70@gmail.com', '4127353455', 'CALLE MAPARARI .PARC. STA EDUVIGIS.SAN JOSE', '6021329', 'server', '1962-05-19', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('62a84649-48e5-4f47-8e66-f122719e7053', 'CARMEN VICTORIA', 'RUIZ RIVERO', 'carmenvictoriaruizrivero@gmail.com', '4125807243', 'URB. FRANCISCO DE MIRANDA CALLE 4 M 21', '21112888', 'server', '1991-08-16', '2007-03-25', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f167aaba-c7ab-472c-929e-23900ef32adc', 'ROLANDO LUIS', 'CRASTO CALLES', 'rolandonatsu77@gmail.com', '4121241975', 'SECTOR ALI PRIMERA', '27663124', 'server', '2000-09-26', '2018-05-01', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3aab8ac4-0b71-40b2-8ea2-05543a30888f', 'ELVIA ROSA', 'MEDINA CHIRINOS', 'roselvys.laguna02@gmail.com', '4246612603', 'SECTOR 5 DE JULIO, CALLE LAS PALMAS N 1', '7476105', 'server', '1951-12-19', '2009-06-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('56ff6247-d004-4d67-b61f-0eec73bebce7', 'ROSELVYS CANDELARIA', 'LAGUNA MEDINA', '19006961@sionerp.local', '4246326153', 'SECTOR 5 DE JULIO, CALLE LAS PALMAS N 1', '19006961', 'server', '1990-02-02', '2008-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1b5b86bb-41f0-4637-a5d6-042d7bc9156d', 'JESUS ADRIAN', 'MARTINEZ CORTEZ', 'doomsday037@gmail.com', '4128219706', 'CALLE TOLEDO DETRÁS DEL COMEDOR POPULAR', '29993763', 'server', '2003-03-20', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('51aaa9de-8b6e-436a-81b8-296ea49edf47', 'JOSE MANUEL', 'DAVALILLO REYES', 'davalilloreyes@gmail.com', '4246259685', 'CALLE TOLEDO N 36 CON URDANETA Y ZAMORA', '28769604', 'server', '2004-02-02', NULL, false, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('68fc3b64-dc4c-42aa-9cf0-655956ade02f', 'CECILIA ENGRACIA', 'GONZALEZ DIAZ', 'ceciliapor1966@gmail.com', '', 'INDEPENDENCIA PRIMERA ETAPA', '9523716', 'server', '1966-03-31', '1966-03-01', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3225be8c-c28e-4dc9-91fc-728645389835', 'MARIA FIDELINA', 'DIAZ DE GONZALEZ', '3543971@sionerp.local', '', 'URB. INDEPENDENCIA', '3543971', 'server', NULL, NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3c593c6d-fa78-44d1-bca8-61ec8950d720', 'ELVIRA JOSEFINA', 'COLINA ZARRAGA', 'elvikpanegra47@gmail.com', '4246975898', 'PARC. HILARIA DE MEDINA VRA 23 N 15-A', '9516329', 'server', '1966-07-05', NULL, false, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('aa2817c7-6feb-458e-9f93-268d486706b1', 'ALCIDES TADEO', 'OLLARVES FERRO', 'alcidesollarves@hotmail.com', '4120602082', 'URB. INDEPENDENCIA 1 ETAPA CALLE 3 V12', '9501154', 'server', '1965-02-10', '2005-03-06', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('dd136826-7dbf-41ad-b470-dce83435dda5', 'AURA', 'GONZALEZ DE OLLARVES', 'arero0406@gmail.com', '4120602080', 'URB. INDEPENDENCIA 1 ETAPA CALLE 3 V12', '4130693', 'server', '1953-06-04', '2005-03-06', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d2cdd6b4-d84c-4ceb-b967-9bda9a9cf9f6', 'YRIS JOSEFINA', 'HERNANDEZ TELLERIA', 'hernandezyris@gmail.com', '4246350325', '2 COMANDANTES', '9929236', 'server', '1969-07-10', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('54c38880-e4aa-443c-82bf-bf3c49bdf19e', 'IZAMAR CRISMARILYS', 'LOPEZ HERNANDEZ', 'hernandezcrismarilys@gmail.com', '4246351870', '2 COMANDANTES', '26537884', 'server', '1997-11-19', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('98b8c569-1779-40e7-bb0f-cdfcc5aa7d0e', 'MIGUEL ANTONIO', 'TROMPIZ MIRANDA', 'trompizmiguel@gmail.com', '4127998369', 'URB. INDEPENDENCIA 1 ETAPA.', '7488111', 'server', '1963-05-01', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('23d75e16-ce6e-476b-b624-2a9d9dc563d9', 'ERIKSON GABRIEL', 'GOMEZ CHIRINOS', 'maxchirino17@gmail.com', '', 'CALLE DEMOCRACIA CON ITURBE', '19252889', 'server', '1985-08-07', '2009-07-21', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('0f4f6c9d-f01d-4495-b32a-847033c6be51', 'INES MARGARET', 'LEDESMA', 'vladimir130263@gmail.com', '4168610565', 'CALLE DEMOCRACIA CON ZARAGOZA N 316', '6685057', 'server', '1943-10-11', '2022-04-17', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('bc160b73-a76e-4661-a8c4-d603abd4b3e8', 'REIMAR ESTER', 'GARCIA CAZORLA', 'reymar.reymar.garca@gmail.com', '4246245031', 'AV. EL TENIS. RES. LAS MOROCOTAS', '17923420', 'server', '1985-10-10', '2003-09-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4e6420da-e15f-4f57-a382-33b8087d3ba1', 'VALERIA ANGELIKA', 'UZCATEGUI AGUILAR', 'valeriauzcategui8@gmail.com', '4126674615', 'URB. LAS DELICIAS', '32704778', 'server', '2008-02-08', '2025-10-12', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d30191e2-1ca2-4a9c-806a-e95de85f928a', 'YOENIS JOSE', 'GOMEZ ALVARADO', 'yoenis59@gmail.com', '4127679270', 'PROLONGACION ITURBE', '11479159', 'server', '1973-06-17', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('a58e1ec3-c349-4070-9bd7-5262160bf225', 'MIREYA DE JESUS', 'YOBERA NAVEDA', 'myoobera@gmail.com', '4126626111', 'URB. LAS DELICIAS', '27663228', 'server', '1998-05-25', NULL, false, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('99c0140e-f2a2-4220-bad1-92cedd84c1b4', 'CARMEN VICTORIA', 'GOTOPO CHIRINO', 'gotopo.carmen@gmail.com', '4127754200', 'URB LAS DELICIAS CALLE PPAL N 159', '5286720', 'server', '1957-12-31', '2012-05-20', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('64673857-86f0-4f2d-b382-7d79ac0cc9e4', 'ASAEL OBED', 'EGURROLA ACOSTA', 'asaelehurrola20@gmail.com', '4146197156', 'AV. EL TENIS. RES. LAS MOROCOTAS', '17629224', 'server', '1983-09-20', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('5f3850a6-9122-486c-8ef2-c510a8e07482', 'ALDRIN JOSE', 'COLINA QUIÑONEZ', 'colina.aldrin@gmail.com', '4262651417', 'URB. LAS DELICIAS', '11138902', 'server', '1969-09-01', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4707a387-a30c-4de7-a44a-b5a5d0cabb2b', 'DANIELA ANDREINA', 'COLINA AGUILAR', 'danicolina15@gmail.com', '4261230451', 'URB. LAS DELICIAS', '28251070', 'server', '2000-02-25', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('93be4682-0d50-4bdf-ab80-7297e7dc9b38', 'DINEYDI DEL VALLE', 'AGUILAR ACOSTA', 'alquilar.dineydi@gmail.com', '4129092891', 'URB. LAS DELICIAS', '12732553', 'server', '1976-04-21', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('a7538234-f864-4ce2-ab7e-c00de6514b71', 'YBRAHIM JOSE', 'CASTRO ZARRAGA', 'castroybrahim84@gmail.com', '4146653904', 'CALLEJON LOS PROCERES, ARENALES', '11141176', 'server', '1971-07-03', '2011-01-23', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4904d8bb-2747-4c5c-8a7f-9f1bdf044f40', 'MAGALY JOSEFINA', 'GARMENDIA DE CASTRO', 'garmendiamagaly562@gmail.com', '4120829505', 'CALLEJON LOS PROCERES, ARENALES', '10700793', 'server', '1968-07-11', '2011-01-23', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('b8125e80-3a58-487c-9f53-cb5bc49942cb', 'DAMELIA DE LOS ANGELES', 'LUGO TORRES', 'lugoangeles181@gmail.com', '4149661803', 'INDEPENDENCIA 3 ETAPA CALLE 5', '34056359', 'server', '2009-09-02', '2021-07-21', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('50cf72e2-6c0d-4bfc-8d7c-bcb717eef95d', 'ANARGELIS SARAI', 'ZARRAGA PEROZO', 'anargeliszarraga@gmail.com', '4246890477', 'CALLE PPAL PARCELAMIENTO SUR IND.', '22600492', 'server', '1992-12-01', '2018-04-29', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('28aef68f-54e4-4b3d-b5d3-89b3e9e594a7', 'EDIXON ANTONIO', 'SANCHEZ MARTINEZ', 'edixonsanchez68@gmail.com', '4146872645', 'PARCELAMIENTO SUR INDEPENDENCIA', '20931011', 'server', '1991-01-29', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('b4d911bf-b6e7-4b7a-a24a-21c40b95c9a0', 'JUANA ALCADIA', 'ZARRAGA MEDINA', 'yosmanjesus07@gmail.com', '4246559239', 'CALLEJON LOS PROCERES, PARC. ARENALES', '5291504', 'server', '1952-11-13', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('8a695c2d-a21e-499f-83e7-47b658e479e2', 'JESUS RAFAEL', 'DAVILA ZAMBRANO', '13674507@sionerp.local', '4246314314', 'URB. INDEPENDENCIA VEREDA 17 N 5-3', '13674507', 'server', '1948-04-02', '2015-12-05', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('388a5f21-79ca-492e-9413-1431f95b4a08', 'ANA MERCEDES', 'MORALES', 'anamercedes24@gmail.com', '4221820175', 'CR. LOS ANTONIO. LOTE D, CASA D2', '3094645', 'server', '1945-09-24', '1971-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1ac4b4c2-a2e3-48ad-942f-6ba6dc68b181', 'ANA MARIA', 'MORALES', 'animarimorales@gmail.com', '4146921686', 'CR. LOS ANTONIO. LOTE D, CASA D2', '9510090', 'server', '1966-07-04', '2023-12-10', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('31597533-7a10-45ab-bb0e-b05b911b56c4', 'JOHANNA ELIZABETH', 'SANGRONIS SIERRA', 'johanasangroni1982@gmail.com', '4244287048', 'SAN JOSE CALLE RAFAEL GONZALEZ N 12', '15238944', 'server', '1982-04-02', '2012-02-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('9da9807b-0523-4be3-8120-3cdf586586ee', 'YELITZA JOSEFINA', 'SANCHEZ', 'yety79151@gmail.com', '4246662498', 'AV. BUCHIVACOA N 9', '10704547', 'server', '1967-12-31', '2014-07-27', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('8dfa8d48-5ce9-4089-a7e9-ee944e16114b', 'IRIS', 'VILLAEL', 'irisvillael56@gmail.com', '4122677225', 'CALLE LIBERTAD BOBARE', '10707816', 'server', '1968-10-09', '1980-04-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('02f257e3-016d-42e5-9c71-1e5c552d13bf', 'DEICY M', 'GARCIA DE M', 'deysimavarez0@gmail.com', '4269046740', 'PURURECHE', '3095270', 'server', '1950-01-20', '2012-01-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3417d16e-6aeb-4e0c-b1ce-a2050c4a1586', 'CARMEN ADELAIDA', 'GARCIA LOAIZA', 'carmenadelaidagarcia52@gmail.com', '4264612373', 'AV. BUCHIVACOA BOBARE', '4102441', 'server', '1952-07-14', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('83801af4-a920-448c-88f3-7d4b37b89e74', 'LIBIA DEL VALLE', 'ROBLES', '7497459@sionerp.local', '4246620172', 'CALLE GARCES CON AV. PINTO SALINAS', '7497459', 'server', '1963-06-02', '2023-12-10', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('896f7499-70c3-4355-a772-6cdab3904b20', 'INGRID MARGARITA', 'VARGAS ROSILLO', 'ingridvargas622@gmail.com', '4146692025', 'URB- 450 CALLE OSWALDO CASTELLANO', '9925912', 'server', '1970-06-21', '2017-03-04', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f01c8027-871c-4463-bd8f-d85ce87d15af', 'ALICIA JOSEFINA', 'DUNO PRADO', 'draaliciaprado@gmail.com', '4246044305', 'AV. BUCHIVACOA N 12-B', '11804364', 'server', '1973-05-12', '1990-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('c5146d6d-2b5e-46e3-94a9-2ca8012c252a', 'YEISMI JHOANA', 'GONZALEZ SANCHEZ', 'yeismyjhoana@gmail.com', '4127881172', 'AV, BUCHIVACOA CON SAN BOSCO', '21666382', 'server', '1993-01-24', '2014-07-27', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('79ed1421-17e4-4ba2-82c9-b2c6fd15acb1', 'MONICA MARIA', 'LOPEZ RIVERO', 'monica.andr19@gmail.com', '4124028259', 'URB. IGNACIO SARMIENTO. CALLE PEDRO PENSO', '17030328', 'server', '1985-05-25', '2012-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('add286c4-4180-4a87-96ab-51c0ff7b98a1', 'PRISCILLA DANIELA', 'CASTRO GONZALEZ', 'priscilladcg1@gmail.com', '4262328263', 'CALLE GARCES, CHIMPIRE', '34308935', 'server', '2007-07-31', '2024-04-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('55a1432e-cd7f-4b61-b0b9-5baa16479038', 'PERLA SOFIA', 'CASTRO GONZALEZ', '34308934@sionerp.local', '4246286787', 'CALLE GARCES. CHIMPIRE', '34308934', 'server', '2010-04-15', '2024-04-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('6f72a6c5-f900-4ca3-9ffb-88801412e123', 'PILL DANIEL', 'CASTRO LANDAETA', 'castropill88@gmail.com', '4246286787', 'CALLE GARCES ENTRE SIERRALTA Y CHEVROLET', '19252319', 'server', '1988-05-20', '2023-04-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('e393860d-d65c-4d6e-9b48-a09a107efa4d', 'CARMEN ZULAY', 'GONZALEZ', 'zulygonzalez3115@gmail.com', '4246286787', 'CALLE GARCES ENTRE SIERRALTA Y CHEVROLET', '15704175', 'server', '1980-09-22', '2023-04-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('403eaf2a-4d24-4853-aca6-d335bc8ea144', 'HARLAM GREGORIO', 'NAVAS OLLARVES', 'harlamnavas2016@gmail.com', '4126488833', 'CALLE BUCHIVACOA ENTRE ITURBE Y FLORES', '', 'server', '1975-01-11', '2017-03-04', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1af7f002-dd76-492a-8ade-03b6e143ef96', 'NORYS JOSEFINA', 'ACOSTA VILLAVICENCIO', 'acostanorys@gmail.com', '4246878262', 'CALLE URDANETA CON CHEVROLET', '7491081', 'server', '1962-10-30', '1977-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('65434ec6-98e1-4673-8ada-30ad495ea1ea', 'YOLLY MILAGROS', 'AÑEZ DE RODRIGUEZ', 'yolaida63@gmail.com', '4246269779', 'CALLE URDANETA ENTRE GONZALEZ Y COLINA', 'GMAIL.COM', 'server', '1963-11-26', '2005-12-11', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('3ce0be46-d3ae-4a0a-8008-36745a8d3a09', 'NELSON ANTONIO', 'COLINA', 'bateristanellson4000@gmail.com', '4246287358', 'CALLEJON SANTA INES, CASA 5 BOBARE', '13487618', 'server', '1974-12-28', '1991-07-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('0cc2a000-d56e-4029-b771-8d6427bafc54', 'KHATERINE ANYALY', 'MARCANO GONZALEZ', 'marcanokhaterine@mail.com', '4246985246', 'CALLE DEMOCRACIA CON ITURBE N 6-S', '24358700', 'server', '1993-10-16', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('085fc6c0-b864-4ae2-b15a-621f83dcde54', 'ENDER ANTONIO', 'SIERRALTA GALLARDO', '10705918@sionerp.local', '4246985246', 'CALLE DEMOCRACIA CON ITURBE N 6-S', '10705918', 'server', '1972-05-06', '2023-12-10', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('14189d63-16b9-40aa-b4d4-0eba799ef69c', 'MARIA JOSEFINA', 'MINDIOLA', 'mariamindiola1958@gmail.com', '', '', '5290437', 'server', '1958-09-12', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d634218e-4f90-415b-b008-fba1f0123fe2', 'HECCARLYAN RACHEL', 'RAMIREZ SILVA', '26937805@sionerp.local', '4126648615', 'EDF. 450', '26937805', 'server', '2000-01-22', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('06b45fb2-8378-4a45-b50b-a2adb41fe558', 'ZORYED GUADALUOPE', 'CHIRINOS SANCHEZ', 'zoryedchirinos@gmail.com', '4246092095', 'CR. LAS DELICIAS, 1 PORTON, CALLE 1 N 8', '17923279', 'server', '1988-01-07', '2007-10-21', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('9d42685b-dc8a-47fb-9425-f38680c6c355', 'MARINA', 'AMAYA RIERA', 'amayamarina17@gmail.com', '4146526045', 'CALLE UNION N 30', '24787570', 'server', '1995-02-20', '2022-05-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d7e10e61-f2b9-462d-9303-7c9c026d7afa', 'FRANNY', 'AMAYA RIERA', 'frannyamayariera@gmail.com', '4246745637', 'CALLE UNION N 30', '19927825', 'server', '1989-12-19', '2022-05-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('f2f63780-38a8-454a-85d9-77c229d7e3fd', 'LUIS GABRIEL', 'AMAYA RIERA', '21666295@sionerp.local', '4246954559', 'CALLE UNION N 30', '21666295', 'server', '1992-09-21', '2022-05-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('df56d2aa-cf74-41d2-8b83-067b0dd5e7cb', 'ALEXIS RAFAEL', 'DELGADO REYES', 'alexisdelgadoreyez7@gmail.com', '4121223041', 'CALLE DUVISI ENTRE RIERA Y MIRANDA 16-A', '15703194', 'server', '1980-08-20', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('ec186315-8ab6-4b73-b17e-d1638db37b66', 'CARMEN ELENA', 'AÑEZ LUGO', 'carmenañez25@gmail.com', '4246700774', 'CALLE UNION N 69. PANTANO ABAJO', '5291494', 'server', '1957-08-25', '2008-07-20', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4fab77b5-5a9f-4d36-bac0-bf5a8a601915', 'YSBELMAR DAYANA', 'SILVA MORALES', 'ydsm93@gmail.com', '4246064534', 'AV. MANAURE ED. CAQUETIO PISO 1 APTO B-02', '24308192', 'server', '1993-06-25', '2010-10-05', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('443aca57-7a0b-4832-b162-05efcff93b52', 'FRANKLYN ALEXANDER', 'RODRIGUEZ CHACON', 'farchacon@gmail.com', '4125380933', 'AV. MANAURE C CALLE UNION Y MIRANDA. CCR CIUDAD CAQUETIO APTO B-02', '16434460', 'server', '1983-05-23', '2022-08-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('1306f4a7-799c-4ecc-b32c-0c1592b54072', 'MARINA GUADALUPE', 'REIERA DE AMAYA', 'mrieradeamaya@gmail.com', '4264477786', '', '7473983', 'server', '1958-02-01', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d305b09f-5f7d-4c16-b535-2dd94b1e58b1', 'FRANCISCO JOSE', 'ALVAREZ SALAS', 'franco30962@hotmail.com', '4122451588', 'CALLE LOS NARDOS ENTRE ARAGUANEY Y SAMAN. PARCELAMIENTO SANTA ANA N 27', '15460995', 'server', '1982-11-25', '2003-10-24', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('74d1ab02-faa6-41e5-b2e5-15134c98c490', 'OLEIDYS B', 'FERNANDEZ', 'oleidysfer77@gmail.com', '4246003445', 'URB.450. BOBARE', '14654462', 'server', '1977-11-13', '2018-10-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('bad64c63-1394-45af-ae28-a1f4e8287500', 'AMBAR V', 'ARIAS FERNANDEZ', 'ambarvaleaf01@gmail.com', '4121234462', 'SECTOR LA CAÑADA', '29833544', 'server', '2001-09-01', '2018-10-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('80ebbef4-3f53-4513-a1d2-a621912eaa70', 'NATAN JAVIER', 'BONALDE PRADO', 'javinatan3@gmail.com', '4125801774', 'SECTOR LA CAÑADA', '29513842', 'server', '2001-10-22', '2017-09-15', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('fe591972-eef9-4c24-a92a-2b0197077036', 'INOCENCIA', 'HERNANDEZ', '3096954@sionerp.local', '', 'CALLEJON SANTA INESN 1', '3096954', 'server', '1942-12-28', '2009-06-28', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
  ('c62ad1dd-66fb-4168-9062-15ad32753e02', 'SORAYA GUADALUPE', 'PIRONA ROSALES', 'pironasoraya@gmail.com', '4121284738', 'CALLEJON BORREGALES SECTOR BOBARE', '11799680', 'server', '1970-08-29', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('48ba7ce6-3f72-4978-899c-793a8781697c', 'LUIS JOSE', 'SANCHEZ GOMEZ', 'abiransanchez2004@gmail.com', '4127256677', 'SECTOR BOBARE, CALLEJON BORREGALES', '31292965', 'server', '2004-05-03', '2019-12-08', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('feed6976-501a-46ca-bb50-c244efb0ceca', 'DAYMI', 'ILARRETA MEDINA', 'ilarretadaymo@gmail.com', '41251519320', 'SECTOR BOBARE, CALLEJON BORREGALES', '13901440', 'server', NULL, NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('9032a3c3-b012-4f36-a406-b661b694d652', 'HILDA', 'MORA DE GUTIERREZ', 'hildaorasegutierrez@gmail.com', '4125862947', 'EDIFICIOS MANAURE', '7522459', 'server', '1956-11-16', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('a5e33cd9-c323-4698-9cc5-639c139f890c', 'CARMEN GREGORIA', 'LOPEZ GARCIA', 'ilarretadaym@gmail.com', '4125159320', 'SECTOR BOBARE CALLE MAPARARI', '9516842', 'server', '1967-02-24', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('237fa8ce-d83d-462d-a697-157de31c04a8', 'DANIEL JESUS', 'ILARRETA QUERO', 'daniel05@gmail.com', '4126694920', 'CALLE MAPARARI  Nº84-7', '3831603', 'server', '1952-11-05', '2018-01-01', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('97f3057c-2789-4124-9513-62e9c4f9b2eb', 'SOLANGELA NAZARETH', 'GONZALEZ PRIMERA', 'solangelagonzalez2@gmail.com', '4246547196', 'PARC. SUR LA PAZ, CALLE PPAL.', '19253785', 'server', '1989-07-12', '2022-05-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('eacc4400-40a1-4216-a8d4-120d79acf305', 'GLADYS', 'PRIMERA MOLINA', 'gladysprimera329@gmail.com', '4124457754', 'PARC. SUR LA PAZ, CALLE PPAL.', '5286457', 'server', '1955-04-19', '2015-03-14', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('09b726ad-aad2-48c5-a68b-118abd59dcf5', 'LUISMY CAROLINA', 'CALLES', 'luismycalles14@gmail.com', '4246283490', 'GRAN REVOLUCION', '14027805', 'server', '1977-09-13', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('bbcbf016-f77c-42b8-9cc9-3f5c580fb4d3', 'ROGER ANTONIO', 'LOAIZA RODRIGUEZ', 'rogerloaiza@gmail.com', '4246048530', 'URB. LAS MARBELLAS N2', '3358617', 'server', '1947-04-15', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('0cf8b66f-af00-4d9c-a2a4-c772d865369d', 'ALBERTO JOSE', 'AREVALO ROSENDO', 'albertojar1976@gmail.com', '4146047984', 'CALLEJON BORREGALES N 22', '12733187', 'server', '1976-09-29', '2008-12-17', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('e6dfffc6-9518-4dfc-a24f-6545205b6a63', 'VICNELLY', 'AGUILAR ACOSTA', 'vicnelyaguilar@gmail.com', '4246272328', 'CALLE AMPIES N 88', '12732554', 'server', '1976-04-21', '1991-09-28', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('c5c42c67-05c3-4b4c-b24d-8fc76f10b019', 'DILIA JUSELYS', 'BARRIO SILVA', 'diliajbarrios@gmail.com', '4125481088', 'CALLE ITURBE ENTRE LIBERTAD Y MAPARARI', '11805714', 'server', '1974-10-16', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('23df1e8f-9851-4eb5-a9e7-f54d63e03cd9', 'LENIS', 'ESCOBAR', '11802623@sionerp.local', '4246334413', 'CALLE COLINA N 37', '11802623', 'server', '1971-01-31', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('fff2c8d0-2296-4a57-84a4-3a5a10c997b8', 'LEIDY', 'AGUILAR', 'leidyaguilar580@gmail.com', '4246069684', 'LAS DELICIAS N 257', '15310614', 'server', '1982-11-28', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('47a10ffe-f882-4f2d-beee-e836c0019d7a', 'WALTER R', 'FARFAN G', 'walterfarfrfarfang@gmail.com', '4127405329', 'LAS DELICIAS N 257', '6227287', 'server', '1966-12-30', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('67ae9bd9-2129-44b3-817b-d00356d33a79', 'SAMUEL DAVID', 'FARFAN AGUILAR', 'farfan.sam19@gmail.com', '4121411247', 'LAS DELICIAS N 257', '34489964', 'server', '2010-01-26', '2025-10-12', true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('d9474161-7808-499c-a649-6a568c55ffc7', 'GENESIS VANESSA', 'MOTA LADERA', 'genesismota579@gmail.com', '424360195', 'LAS DELICIAS APTO 434 D', '26874832', 'server', '1994-07-12', '2024-04-28', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('28e23586-928d-484b-876a-19865d5d92ef', 'HEIFRI LUIS', 'SANCHEZ OCHOA', '23578347@sionerp.local', '4243601965', 'LAS DELICIAS APTO 434 D', '23578347', 'server', '1992-09-07', '2024-04-28', true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('900aee34-0108-4a84-9334-2435e87d020e', 'HEIFRI ISAAC', 'SANCHEZ MOTA', '37007448@sionerp.local', '', 'URB. LAS DELICIAS APTO 434', '37007448', 'server', '2013-04-11', NULL, false, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('81b173f1-a080-4ff7-a1d1-2b959cbb7fe7', 'ELIZABETH', 'LADERA', '7999922@sionerp.local', '4141461657', 'LAS DELICIAS APTO 434 D', '7999922', 'server', '1967-03-08', NULL, true, true, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('4b887587-8f92-4c45-9660-65f071d6073b', 'NAZARETH DEL CARMEN', 'FUGUET GARCIA', 'nazafuguet@gmail.com', '4246514833', 'AV EL TENIS SECTOR LOS CLARITOS', '26874327', 'server', '1999-08-09', NULL, true, false, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()),
  ('b528382b-fd3e-44fc-a5c4-6a7ddad0f200', 'SAMUEL DAVID', 'MOTA HERNANDEZ', 'josemota0202@gmail.com', '4146812535', 'LAS EUGENIAS', '22608733', 'server', '1994-06-11', NULL, true, true, NULL, NULL, true, true, NOW(), NOW()),
  ('ac7ed5b0-7e2c-4f68-a17c-2e4cb0630d42', 'KEIDYS COROMOTO', 'CRESPO DE MOTA', 'keidyscoromoto01@gmail.com', '4224850070', 'LAS EUGENIAS', '20706537', 'server', '1992-03-31', NULL, true, true, NULL, NULL, true, true, NOW(), NOW()),
  ('f48dac7b-f8ea-4e1b-b6aa-b13fbabef97d', 'GEYRIS', 'BENELLÁN', 'geyrysbenellan@gmail.com', '4121652525', 'calle Cuba sector pantano abajo casa 11.', '19251801', 'server', '1990-12-01', '2003-12-28', true, false, NULL, NULL, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================
-- LÍDERES (84 únicos: 2 ya importados, 82 nuevos con placeholder)
-- ========================
INSERT INTO public.users (id, first_name, last_name, email, phone, address, id_number, role, is_active, is_active_member, created_at, updated_at) VALUES
  ('dba832d0-98c1-4359-b10d-1d21acc72ece', 'SUPERVISORA', '(Apellido pendiente)', 'lider.supervisora@sionerp.local', '', '', 'LIDER-dba832d0-98c1-4359-b10d-1d21acc72ece', 'server', true, true, NOW(), NOW()),
  ('3395c741-2620-4b2e-8e96-d3b58c65609e', 'JESUS', 'PINEREZ', 'lider.jesus.pinerez@sionerp.local', '', '', 'LIDER-3395c741-2620-4b2e-8e96-d3b58c65609e', 'server', true, true, NOW(), NOW()),
  ('d5e5d306-c266-4a9d-a6ad-d247ab771956', 'YILEINA', 'JIMENEZ', 'lider.yileina.jimenez@sionerp.local', '', '', 'LIDER-d5e5d306-c266-4a9d-a6ad-d247ab771956', 'server', true, true, NOW(), NOW()),
  ('75745f0e-d6f6-4f72-93b9-378d905f622a', 'ALEX', 'PINEREZ', 'lider.alex.pinerez@sionerp.local', '', '', 'LIDER-75745f0e-d6f6-4f72-93b9-378d905f622a', 'server', true, true, NOW(), NOW()),
  ('aaef1ecc-9405-4184-9d16-96f0a7713357', 'NOHEMI', 'LUGO', 'lider.nohemi.lugo@sionerp.local', '', '', 'LIDER-aaef1ecc-9405-4184-9d16-96f0a7713357', 'server', true, true, NOW(), NOW()),
  ('658f0530-0b6a-472b-bfba-0e202e746bec', 'ISMARI', 'GOMEZ', 'lider.ismari.gomez@sionerp.local', '', '', 'LIDER-658f0530-0b6a-472b-bfba-0e202e746bec', 'server', true, true, NOW(), NOW()),
  ('c5080a9e-b31b-4a9b-80d0-ef0bf88fc2d3', 'ROSA', 'COLINA', 'lider.rosa.colina@sionerp.local', '', '', 'LIDER-c5080a9e-b31b-4a9b-80d0-ef0bf88fc2d3', 'server', true, true, NOW(), NOW()),
  ('2f47609a-ac52-4c77-8af0-69e7925d23e9', 'CLASE', 'DOCTRINA', 'lider.clase.doctrina@sionerp.local', '', '', 'LIDER-2f47609a-ac52-4c77-8af0-69e7925d23e9', 'server', true, true, NOW(), NOW()),
  ('367ca68f-37e5-408d-8881-8b59e64825b3', 'JOCSIMAR', 'GARCIA', 'lider.jocsimar.garcia@sionerp.local', '', '', 'LIDER-367ca68f-37e5-408d-8881-8b59e64825b3', 'server', true, true, NOW(), NOW()),
  ('13c1f3fe-e331-4a72-bfb9-0d8439fe119d', 'MARITZA', 'SOTO', 'lider.maritza.soto@sionerp.local', '', '', 'LIDER-13c1f3fe-e331-4a72-bfb9-0d8439fe119d', 'server', true, true, NOW(), NOW()),
  ('6942708b-7e46-4df9-af0b-ec2dd3596061', 'JOSE', 'FERRER', 'lider.jose.ferrer@sionerp.local', '', '', 'LIDER-6942708b-7e46-4df9-af0b-ec2dd3596061', 'server', true, true, NOW(), NOW()),
  ('9c4ad653-9033-4762-9130-1976c0c25a2d', 'SUPERVISOR', 'Y LIDER', 'lider.supervisor.y.lider@sionerp.local', '', '', 'LIDER-9c4ad653-9033-4762-9130-1976c0c25a2d', 'server', true, true, NOW(), NOW()),
  ('9c1e3b2b-100d-4a51-97ae-b10ff2f6f3b0', 'YASMIRA', 'MARTINEZ', 'lider.yasmira.martinez@sionerp.local', '', '', 'LIDER-9c1e3b2b-100d-4a51-97ae-b10ff2f6f3b0', 'server', true, true, NOW(), NOW()),
  ('d38185f2-a311-4426-9c93-2c6ffe673b4f', 'SUPERVISOR', '(Apellido pendiente)', 'lider.supervisor@sionerp.local', '', '', 'LIDER-d38185f2-a311-4426-9c93-2c6ffe673b4f', 'server', true, true, NOW(), NOW()),
  ('c4af06c2-65a7-44f1-a85b-bf668e95d5d9', 'LUIS', 'DANIEL GARCIA', 'lider.luis.daniel.garcia@sionerp.local', '', '', 'LIDER-c4af06c2-65a7-44f1-a85b-bf668e95d5d9', 'server', true, true, NOW(), NOW()),
  ('910c981a-91b0-4683-b76a-a17373c7da4a', 'NO', 'TIENE', 'lider.no.tiene@sionerp.local', '', '', 'LIDER-910c981a-91b0-4683-b76a-a17373c7da4a', 'server', true, true, NOW(), NOW()),
  ('be30d15e-60b2-4d76-a564-1989a13f5cda', 'POR', 'ADIGNAR', 'lider.por.adignar@sionerp.local', '', '', 'LIDER-be30d15e-60b2-4d76-a564-1989a13f5cda', 'server', true, true, NOW(), NOW()),
  ('bee67c49-cb1d-4bd9-ab67-16516a9c0255', 'ELIZABETH', 'HEERNANDEZ', 'lider.elizabeth.heernandez@sionerp.local', '', '', 'LIDER-bee67c49-cb1d-4bd9-ab67-16516a9c0255', 'server', true, true, NOW(), NOW()),
  ('fcdd596f-54d5-44e2-829c-fb66f73132f0', 'MIRIAN', 'MIQUILENA', 'lider.mirian.miquilena@sionerp.local', '', '', 'LIDER-fcdd596f-54d5-44e2-829c-fb66f73132f0', 'server', true, true, NOW(), NOW()),
  ('50951a8f-f6fd-4a44-a617-d988f3da97cc', 'INDRA', 'RUJANO', 'lider.indra.rujano@sionerp.local', '', '', 'LIDER-50951a8f-f6fd-4a44-a617-d988f3da97cc', 'server', true, true, NOW(), NOW()),
  ('d2961692-7599-4553-b857-c4cbb6908936', 'MARLENE', 'VILLAVICENCIO', 'lider.marlene.villavicencio@sionerp.local', '', '', 'LIDER-d2961692-7599-4553-b857-c4cbb6908936', 'server', true, true, NOW(), NOW()),
  ('0daaad91-0d23-4843-b9fe-b41595c4e07e', 'RITA', 'GUTIERREZ', 'lider.rita.gutierrez@sionerp.local', '', '', 'LIDER-0daaad91-0d23-4843-b9fe-b41595c4e07e', 'server', true, true, NOW(), NOW()),
  ('6bdc0490-833b-4d27-85b4-73bf6809930f', 'NILZA', 'RAMIREZ', 'lider.nilza.ramirez@sionerp.local', '', '', 'LIDER-6bdc0490-833b-4d27-85b4-73bf6809930f', 'server', true, true, NOW(), NOW()),
  ('f8bb7c3d-fd5e-4b93-8edd-edc8639a2b80', 'ALEXIS', 'GUTIERREZ', 'lider.alexis.gutierrez@sionerp.local', '', '', 'LIDER-f8bb7c3d-fd5e-4b93-8edd-edc8639a2b80', 'server', true, true, NOW(), NOW()),
  ('4b50b9a2-d21c-4c15-9314-82e95115d0fa', 'JOSE', 'LARA', 'lider.jose.lara@sionerp.local', '', '', 'LIDER-4b50b9a2-d21c-4c15-9314-82e95115d0fa', 'server', true, true, NOW(), NOW()),
  ('60fe3855-552a-45f9-bb5c-d78694d13ca4', 'YOHANA', 'MOLINA', 'lider.yohana.molina@sionerp.local', '', '', 'LIDER-60fe3855-552a-45f9-bb5c-d78694d13ca4', 'server', true, true, NOW(), NOW()),
  ('ef73d442-8c99-4f32-bc80-405ae9a48b1a', 'IREXSI', 'SANCHEZ', 'lider.irexsi.sanchez@sionerp.local', '', '', 'LIDER-ef73d442-8c99-4f32-bc80-405ae9a48b1a', 'server', true, true, NOW(), NOW()),
  ('18a23669-dbdc-4818-9fb0-0cb8c7423530', 'JUANA', 'ROMERO', 'lider.juana.romero@sionerp.local', '', '', 'LIDER-18a23669-dbdc-4818-9fb0-0cb8c7423530', 'server', true, true, NOW(), NOW()),
  ('2bad7646-85ff-43a6-ae3a-fc3cdf7e4d3a', 'JANIS', 'ESPINOZA', 'lider.janis.espinoza@sionerp.local', '', '', 'LIDER-2bad7646-85ff-43a6-ae3a-fc3cdf7e4d3a', 'server', true, true, NOW(), NOW()),
  ('00127b30-3947-47e5-acb8-1b86f2cd0f6b', 'JOSUE', 'ARIAS', 'lider.josue.arias@sionerp.local', '', '', 'LIDER-00127b30-3947-47e5-acb8-1b86f2cd0f6b', 'server', true, true, NOW(), NOW()),
  ('35ae7375-51c6-4669-b08d-a576dd3b31b8', 'LIGIA', 'HERNANDEZ', 'lider.ligia.hernandez@sionerp.local', '', '', 'LIDER-35ae7375-51c6-4669-b08d-a576dd3b31b8', 'server', true, true, NOW(), NOW()),
  ('51844354-354f-49b0-9c99-33427479c964', 'DORALIS', 'PALMO', 'lider.doralis.palmo@sionerp.local', '', '', 'LIDER-51844354-354f-49b0-9c99-33427479c964', 'server', true, true, NOW(), NOW()),
  ('127b1a29-1ffe-4dff-a800-2f29d47419d0', 'JOSIERIKA', 'BRAVO', 'lider.josierika.bravo@sionerp.local', '', '', 'LIDER-127b1a29-1ffe-4dff-a800-2f29d47419d0', 'server', true, true, NOW(), NOW()),
  ('7aaa5913-c0e3-4c16-8b66-d1e095a0b783', 'ACILFREDO', 'OCANDO', 'lider.acilfredo.ocando@sionerp.local', '', '', 'LIDER-7aaa5913-c0e3-4c16-8b66-d1e095a0b783', 'server', true, true, NOW(), NOW()),
  ('55f210b5-0abd-4f62-98ba-78fcacfe3c04', 'ANA', 'SUAREZ', 'lider.ana.suarez@sionerp.local', '', '', 'LIDER-55f210b5-0abd-4f62-98ba-78fcacfe3c04', 'server', true, true, NOW(), NOW()),
  ('d5d2b4a0-e889-4ac5-8ff4-5f9de2943df5', 'MARYORIS', 'ARIAS', 'lider.maryoris.arias@sionerp.local', '', '', 'LIDER-d5d2b4a0-e889-4ac5-8ff4-5f9de2943df5', 'server', true, true, NOW(), NOW()),
  ('5292bd79-6349-4175-a3ba-61131a8ce280', 'XIOMARA', 'SANCHEZ', 'lider.xiomara.sanchez@sionerp.local', '', '', 'LIDER-5292bd79-6349-4175-a3ba-61131a8ce280', 'server', true, true, NOW(), NOW()),
  ('e0353089-3a31-4cd2-a45c-53facbe113b7', 'WILMER', 'MORALES', 'lider.wilmer.morales@sionerp.local', '', '', 'LIDER-e0353089-3a31-4cd2-a45c-53facbe113b7', 'server', true, true, NOW(), NOW()),
  ('f1afd011-5c1c-486e-bade-ff75a20edb94', 'JENIFER', 'ROMERO', 'lider.jenifer.romero@sionerp.local', '', '', 'LIDER-f1afd011-5c1c-486e-bade-ff75a20edb94', 'server', true, true, NOW(), NOW()),
  ('7e4ea5f7-f755-4d99-a1a0-e9af57ea0b26', 'LUIS', 'CORDERO', 'lider.luis.cordero@sionerp.local', '', '', 'LIDER-7e4ea5f7-f755-4d99-a1a0-e9af57ea0b26', 'server', true, true, NOW(), NOW()),
  ('d512497e-8b45-4dd0-8614-31197443c5a6', 'ENMANUEL', 'GARCIA', 'lider.enmanuel.garcia@sionerp.local', '', '', 'LIDER-d512497e-8b45-4dd0-8614-31197443c5a6', 'server', true, true, NOW(), NOW()),
  ('1e3a95f1-b359-40e9-b509-5ba0de02f236', 'DANUEL', 'AGUERO', 'lider.danuel.aguero@sionerp.local', '', '', 'LIDER-1e3a95f1-b359-40e9-b509-5ba0de02f236', 'server', true, true, NOW(), NOW()),
  ('b2a6bca1-1286-44c2-a351-16120ad40e58', 'NORMEDY', 'DE GARCIA', 'lider.normedy.de.garcia@sionerp.local', '', '', 'LIDER-b2a6bca1-1286-44c2-a351-16120ad40e58', 'server', true, true, NOW(), NOW()),
  ('bca27a63-b4b2-4f23-b4b8-214546f68f32', 'CAROLINA', 'SANGRONIS', 'lider.carolina.sangronis@sionerp.local', '', '', 'LIDER-bca27a63-b4b2-4f23-b4b8-214546f68f32', 'server', true, true, NOW(), NOW()),
  ('b2e9024e-1ba5-405f-a963-14c1bfd866a8', 'MARY', 'CHIRINO', 'lider.mary.chirino@sionerp.local', '', '', 'LIDER-b2e9024e-1ba5-405f-a963-14c1bfd866a8', 'server', true, true, NOW(), NOW()),
  ('a86afa57-ead4-46f7-b7dd-f107a7fdde4a', 'MARY', 'SECO', 'lider.mary.seco@sionerp.local', '', '', 'LIDER-a86afa57-ead4-46f7-b7dd-f107a7fdde4a', 'server', true, true, NOW(), NOW()),
  ('9cae572a-b0f7-4de9-bbc5-65599991ab59', 'NOHELIA', 'TOYO', 'lider.nohelia.toyo@sionerp.local', '', '', 'LIDER-9cae572a-b0f7-4de9-bbc5-65599991ab59', 'server', true, true, NOW(), NOW()),
  ('aa2d39ad-1f7a-4069-b318-76dcff83d271', 'LOAMMI', 'COELLO', 'lider.loammi.coello@sionerp.local', '', '', 'LIDER-aa2d39ad-1f7a-4069-b318-76dcff83d271', 'server', true, true, NOW(), NOW()),
  ('57fd04eb-8a3d-420d-afd6-48e79fc306a9', 'DAMARIS', 'TIGRERA', 'lider.damaris.tigrera@sionerp.local', '', '', 'LIDER-57fd04eb-8a3d-420d-afd6-48e79fc306a9', 'server', true, true, NOW(), NOW()),
  ('c5bf3872-22f6-473e-82ad-1900a8dc0f8f', 'YRIAN', 'DE BENELLAN', 'lider.yrian.de.benellan@sionerp.local', '', '', 'LIDER-c5bf3872-22f6-473e-82ad-1900a8dc0f8f', 'server', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, first_name, last_name, email, phone, address, id_number, role, is_active, is_active_member, created_at, updated_at) VALUES
  ('a5c68f6a-62ac-4b09-a27d-9a95917ba1ea', 'ARGELIA', 'CASTRO', 'lider.argelia.castro@sionerp.local', '', '', 'LIDER-a5c68f6a-62ac-4b09-a27d-9a95917ba1ea', 'server', true, true, NOW(), NOW()),
  ('f71c8b1b-ba74-4ff0-8762-2cdc5dfd5563', 'MAGNA', 'ARTEAGA', 'lider.magna.arteaga@sionerp.local', '', '', 'LIDER-f71c8b1b-ba74-4ff0-8762-2cdc5dfd5563', 'server', true, true, NOW(), NOW()),
  ('d9d08952-2e25-4f67-b896-43ba260901f7', 'FRANKLIN', 'SANCHEZ', 'lider.franklin.sanchez@sionerp.local', '', '', 'LIDER-d9d08952-2e25-4f67-b896-43ba260901f7', 'server', true, true, NOW(), NOW()),
  ('75f977e5-4bb5-4c9b-9914-1ac0d4695318', 'YOLIMAR', 'COLINA', 'lider.yolimar.colina@sionerp.local', '', '', 'LIDER-75f977e5-4bb5-4c9b-9914-1ac0d4695318', 'server', true, true, NOW(), NOW()),
  ('8eb16aaa-a033-488f-8100-9c52be0bf842', 'CLARA', 'ROMERO', 'lider.clara.romero@sionerp.local', '', '', 'LIDER-8eb16aaa-a033-488f-8100-9c52be0bf842', 'server', true, true, NOW(), NOW()),
  ('5b84cbbd-af0b-4c40-a885-32ffffee0dee', 'ELY', 'SIVIRA', 'lider.ely.sivira@sionerp.local', '', '', 'LIDER-5b84cbbd-af0b-4c40-a885-32ffffee0dee', 'server', true, true, NOW(), NOW()),
  ('7ab228ea-eb05-41b4-91ef-4cc49713d9e8', 'EMILYS', 'CALDERON', 'lider.emilys.calderon@sionerp.local', '', '', 'LIDER-7ab228ea-eb05-41b4-91ef-4cc49713d9e8', 'server', true, true, NOW(), NOW()),
  ('10707e46-ecca-48cc-853b-d86a4f1ab8d3', 'NO', 'ASISTE', 'lider.no.asiste@sionerp.local', '', '', 'LIDER-10707e46-ecca-48cc-853b-d86a4f1ab8d3', 'server', true, true, NOW(), NOW()),
  ('d2c86e18-3e6d-4888-b641-18bd0e3db152', 'FRACISCO', 'SANCHEZ', 'lider.fracisco.sanchez@sionerp.local', '', '', 'LIDER-d2c86e18-3e6d-4888-b641-18bd0e3db152', 'server', true, true, NOW(), NOW()),
  ('dad3bee8-c259-4a99-86be-1ae566c81c25', 'FRANCISCO', 'SANCHEZ', 'lider.francisco.sanchez@sionerp.local', '', '', 'LIDER-dad3bee8-c259-4a99-86be-1ae566c81c25', 'server', true, true, NOW(), NOW()),
  ('29aa5cf5-9a51-467e-8951-81c7b32cfdcb', 'WILLY', 'ALVARADO', 'lider.willy.alvarado@sionerp.local', '', '', 'LIDER-29aa5cf5-9a51-467e-8951-81c7b32cfdcb', 'server', true, true, NOW(), NOW()),
  ('93f852f1-c604-443e-b80d-3c2c5e0881a6', 'SUPER', '(Apellido pendiente)', 'lider.super@sionerp.local', '', '', 'LIDER-93f852f1-c604-443e-b80d-3c2c5e0881a6', 'server', true, true, NOW(), NOW()),
  ('c88a9fe5-b6b9-4a45-b8f7-c78169248730', 'CARMEN', 'PETIT', 'lider.carmen.petit@sionerp.local', '', '', 'LIDER-c88a9fe5-b6b9-4a45-b8f7-c78169248730', 'server', true, true, NOW(), NOW()),
  ('5a61194e-d8ff-4422-ab49-77757596bed1', 'YOSELIN', 'MEDINA', 'lider.yoselin.medina@sionerp.local', '', '', 'LIDER-5a61194e-d8ff-4422-ab49-77757596bed1', 'server', true, true, NOW(), NOW()),
  ('1869e9a3-8ac7-4071-82f2-070218e76043', 'MARIA', 'EUGENIA CHIRINOS', 'lider.maria.eugenia.chirinos@sionerp.local', '', '', 'LIDER-1869e9a3-8ac7-4071-82f2-070218e76043', 'server', true, true, NOW(), NOW()),
  ('270897fb-85b0-4548-9d88-21c8dde86447', 'BELEN', 'NOGUERA', 'lider.belen.noguera@sionerp.local', '', '', 'LIDER-270897fb-85b0-4548-9d88-21c8dde86447', 'server', true, true, NOW(), NOW()),
  ('fd3ee671-5f63-4a16-b6ea-69bb1bae404b', 'ELVIS', 'CALDERON', 'lider.elvis.calderon@sionerp.local', '', '', 'LIDER-fd3ee671-5f63-4a16-b6ea-69bb1bae404b', 'server', true, true, NOW(), NOW()),
  ('dcf2abfa-69bd-4ce2-aee0-e5876af7bfbb', 'ALBERT', 'GUTIERREZ', 'lider.albert.gutierrez@sionerp.local', '', '', 'LIDER-dcf2abfa-69bd-4ce2-aee0-e5876af7bfbb', 'server', true, true, NOW(), NOW()),
  ('ca008f30-e7d5-4697-8334-aeb0b94d5bcc', 'ROSELVYS', 'LAGUNA', 'lider.roselvys.laguna@sionerp.local', '', '', 'LIDER-ca008f30-e7d5-4697-8334-aeb0b94d5bcc', 'server', true, true, NOW(), NOW()),
  ('f9f1c951-969b-48bd-9ef4-cc40476f0e63', 'YRIS', 'HERNANDEZ', 'lider.yris.hernandez@sionerp.local', '', '', 'LIDER-f9f1c951-969b-48bd-9ef4-cc40476f0e63', 'server', true, true, NOW(), NOW()),
  ('a5df5563-e0e5-4f13-b6ea-bbeb94cd4e01', 'REIMAR', 'GARCIA', 'lider.reimar.garcia@sionerp.local', '', '', 'LIDER-a5df5563-e0e5-4f13-b6ea-bbeb94cd4e01', 'server', true, true, NOW(), NOW()),
  ('5db42321-6640-4684-9aa2-f9291da39f05', 'MAGALY', 'GARMENDIA', 'lider.magaly.garmendia@sionerp.local', '', '', 'LIDER-5db42321-6640-4684-9aa2-f9291da39f05', 'server', true, true, NOW(), NOW()),
  ('73e8c891-8edd-4c5c-b243-e23bf327194b', 'YELITZA', 'SANCHEZ', 'lider.yelitza.sanchez@sionerp.local', '', '', 'LIDER-73e8c891-8edd-4c5c-b243-e23bf327194b', 'server', true, true, NOW(), NOW()),
  ('05891d3a-84ed-4c89-a6b2-ed4d6a43d870', 'ALICIA', 'DUNO', 'lider.alicia.duno@sionerp.local', '', '', 'LIDER-05891d3a-84ed-4c89-a6b2-ed4d6a43d870', 'server', true, true, NOW(), NOW()),
  ('153e419a-dc51-4b06-8a7c-cc8c9384f21d', 'NORYS', 'ACOSTA', 'lider.norys.acosta@sionerp.local', '', '', 'LIDER-153e419a-dc51-4b06-8a7c-cc8c9384f21d', 'server', true, true, NOW(), NOW()),
  ('776006ce-7e55-4297-bd4a-1f0575681240', 'SUP.', 'AUXILIAR', 'lider.sup..auxiliar@sionerp.local', '', '', 'LIDER-776006ce-7e55-4297-bd4a-1f0575681240', 'server', true, true, NOW(), NOW()),
  ('31b43b9c-670c-4665-8e36-f0d358f26c7b', 'MARINA', 'AMAYA', 'lider.marina.amaya@sionerp.local', '', '', 'LIDER-31b43b9c-670c-4665-8e36-f0d358f26c7b', 'server', true, true, NOW(), NOW()),
  ('3e42c44c-d50f-4f75-b35f-6124742913bc', 'OLEYDIS', 'FERNANDEZ', 'lider.oleydis.fernandez@sionerp.local', '', '', 'LIDER-3e42c44c-d50f-4f75-b35f-6124742913bc', 'server', true, true, NOW(), NOW()),
  ('d1d3675c-ed40-4dd2-80c7-c5296d446a28', 'DAYMI', 'ILARRETA', 'lider.daymi.ilarreta@sionerp.local', '', '', 'LIDER-d1d3675c-ed40-4dd2-80c7-c5296d446a28', 'server', true, true, NOW(), NOW()),
  ('8c858a00-fd72-49ba-9148-af95a1f65774', 'SOLANGELA', 'GONZALEZ', 'lider.solangela.gonzalez@sionerp.local', '', '', 'LIDER-8c858a00-fd72-49ba-9148-af95a1f65774', 'server', true, true, NOW(), NOW()),
  ('22a2329c-3644-4b02-a6f5-b710f3748b7d', 'VICNELLY', 'AGUILAR', 'lider.vicnelly.aguilar@sionerp.local', '', '', 'LIDER-22a2329c-3644-4b02-a6f5-b710f3748b7d', 'server', true, true, NOW(), NOW()),
  ('e8f760d3-445e-4a0c-8083-7dc9715547dd', 'HECYARLI', 'LOPEZ', 'lider.hecyarli.lopez@sionerp.local', '', '', 'LIDER-e8f760d3-445e-4a0c-8083-7dc9715547dd', 'server', true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================
-- GRUPOS DE DISCIPULADO (84 grupos)
-- ========================
INSERT INTO public.discipleship_groups (id, group_name, leader_id, zone_id, zone_name, member_count, active_members, status, created_at, updated_at) VALUES
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'Grupo de SUPERVISORA', 'dba832d0-98c1-4359-b10d-1d21acc72ece', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 12, 12, 'active', NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', 'Grupo de JESUS PIÑEREZ', '3395c741-2620-4b2e-8e96-d3b58c65609e', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 8, 8, 'active', NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', 'Grupo de YILEINA JIMENEZ', 'd5e5d306-c266-4a9d-a6ad-d247ab771956', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 7, 7, 'active', NOW(), NOW()),
  ('261acade-fb7a-4ffe-82c9-c6acadcd2e17', 'Grupo de ALEX PIÑEREZ', '75745f0e-d6f6-4f72-93b9-378d905f622a', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, 1, 'active', NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', 'Grupo de NOHEMI LUGO', 'aaef1ecc-9405-4184-9d16-96f0a7713357', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 6, 6, 'active', NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', 'Grupo de ISMARI GOMEZ', '658f0530-0b6a-472b-bfba-0e202e746bec', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 6, 6, 'active', NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', 'Grupo de ROSA COLINA', 'c5080a9e-b31b-4a9b-80d0-ef0bf88fc2d3', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 15, 15, 'active', NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'Grupo de CLASE DOCTRINA', '2f47609a-ac52-4c77-8af0-69e7925d23e9', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 6, 6, 'active', NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', 'Grupo de JOCSIMAR GARCIA', '367ca68f-37e5-408d-8881-8b59e64825b3', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 14, 14, 'active', NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', 'Grupo de MARITZA SOTO', '13c1f3fe-e331-4a72-bfb9-0d8439fe119d', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 11, 11, 'active', NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', 'Grupo de JOSE FERRER', '6942708b-7e46-4df9-af0b-ec2dd3596061', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 5, 5, 'active', NOW(), NOW()),
  ('80bf5ad0-3cda-4056-bde5-19c8c8d6285a', 'Grupo de SUPERVISOR Y LIDER', '9c4ad653-9033-4762-9130-1976c0c25a2d', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, 1, 'active', NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', 'Grupo de MIGDALIA GARCIA', 'ebb6df49-d459-4e49-b5ea-14342279b8af', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 6, 6, 'active', NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'Grupo de YASMIRA MARTINEZ', '9c1e3b2b-100d-4a51-97ae-b10ff2f6f3b0', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 7, 7, 'active', NOW(), NOW()),
  ('5467bdc2-631f-4d2e-b8f4-e1a91a728ec5', 'Grupo de SUPERVISOR', 'd38185f2-a311-4426-9c93-2c6ffe673b4f', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, 1, 'active', NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', 'Grupo de LUIS DANIEL GARCIA', 'c4af06c2-65a7-44f1-a85b-bf668e95d5d9', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 7, 7, 'active', NOW(), NOW()),
  ('2d43d882-12b8-41b7-9bf8-44ab3e934749', 'Grupo de NO TIENE', '910c981a-91b0-4683-b76a-a17373c7da4a', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, 1, 'active', NOW(), NOW()),
  ('6c1c229d-242b-43ca-abb6-620d32a90aca', 'Grupo de POR ADIGNAR', 'be30d15e-60b2-4d76-a564-1989a13f5cda', 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, 1, 'active', NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', 'Grupo de ELIZABETH HEERNANDEZ', 'bee67c49-cb1d-4bd9-ab67-16516a9c0255', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 8, 8, 'active', NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', 'Grupo de MIRIAN MIQUILENA', 'fcdd596f-54d5-44e2-829c-fb66f73132f0', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 11, 11, 'active', NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'Grupo de INDRA RUJANO', '50951a8f-f6fd-4a44-a617-d988f3da97cc', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 10, 10, 'active', NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', 'Grupo de MARLENE VILLAVICENCIO', 'd2961692-7599-4553-b857-c4cbb6908936', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 9, 9, 'active', NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', 'Grupo de RITA GUTIERREZ', '0daaad91-0d23-4843-b9fe-b41595c4e07e', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', 'Grupo de NILZA RAMIREZ', '6bdc0490-833b-4d27-85b4-73bf6809930f', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 7, 7, 'active', NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', 'Grupo de ALEXIS GUTIERREZ', 'f8bb7c3d-fd5e-4b93-8edd-edc8639a2b80', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 7, 7, 'active', NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', 'Grupo de JOSE LARA', '4b50b9a2-d21c-4c15-9314-82e95115d0fa', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 8, 8, 'active', NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', 'Grupo de YOHANA MOLINA', '60fe3855-552a-45f9-bb5c-d78694d13ca4', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', 'Grupo de IREXSI SANCHEZ', 'ef73d442-8c99-4f32-bc80-405ae9a48b1a', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 10, 10, 'active', NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', 'Grupo de JUANA ROMERO', '18a23669-dbdc-4818-9fb0-0cb8c7423530', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 7, 7, 'active', NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', 'Grupo de JANIS ESPINOZA', '2bad7646-85ff-43a6-ae3a-fc3cdf7e4d3a', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 9, 9, 'active', NOW(), NOW()),
  ('942105f8-5198-4083-b30f-0fdcb04cfe56', 'Grupo de JOSUE ARIAS', '00127b30-3947-47e5-acb8-1b86f2cd0f6b', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 3, 3, 'active', NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', 'Grupo de LIGIA HERNANDEZ', '35ae7375-51c6-4669-b08d-a576dd3b31b8', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', 'Grupo de DORALIS PALMO', '51844354-354f-49b0-9c99-33427479c964', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 9, 9, 'active', NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', 'Grupo de JOSIERIKA BRAVO', '127b1a29-1ffe-4dff-a800-2f29d47419d0', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('9be74a25-b55c-43f0-8386-6a61ac55d276', 'Grupo de ACILFREDO OCANDO', '7aaa5913-c0e3-4c16-8b66-d1e095a0b783', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 3, 3, 'active', NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', 'Grupo de ANA SUAREZ', '55f210b5-0abd-4f62-98ba-78fcacfe3c04', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 5, 5, 'active', NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', 'Grupo de MARYORIS ARIAS', 'd5d2b4a0-e889-4ac5-8ff4-5f9de2943df5', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'Grupo de XIOMARA SANCHEZ', '5292bd79-6349-4175-a3ba-61131a8ce280', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 11, 11, 'active', NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'Grupo de WILMER MORALES', 'e0353089-3a31-4cd2-a45c-53facbe113b7', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 13, 13, 'active', NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', 'Grupo de JENIFER ROMERO', 'f1afd011-5c1c-486e-bade-ff75a20edb94', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 7, 7, 'active', NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', 'Grupo de LUIS CORDERO', '7e4ea5f7-f755-4d99-a1a0-e9af57ea0b26', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 7, 7, 'active', NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', 'Grupo de ENMANUEL GARCIA', 'd512497e-8b45-4dd0-8614-31197443c5a6', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', 'Grupo de DANUEL AGÜERO', '1e3a95f1-b359-40e9-b509-5ba0de02f236', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 5, 5, 'active', NOW(), NOW()),
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', 'Grupo de NORMEDY DE GARCIA', 'b2a6bca1-1286-44c2-a351-16120ad40e58', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 5, 5, 'active', NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'Grupo de CAROLINA SANGRONIS', 'bca27a63-b4b2-4f23-b4b8-214546f68f32', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 5, 5, 'active', NOW(), NOW()),
  ('e6f5ab58-a78b-4c9b-a7e6-e477ac9b89b1', 'Grupo de MARY CHIRINO', 'b2e9024e-1ba5-405f-a963-14c1bfd866a8', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 3, 3, 'active', NOW(), NOW()),
  ('1cd6095f-fb8b-4f10-8ef4-18308ba6246d', 'Grupo de MARY SECO', 'a86afa57-ead4-46f7-b7dd-f107a7fdde4a', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 4, 4, 'active', NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', 'Grupo de NOHELIA TOYO', '9cae572a-b0f7-4de9-bbc5-65599991ab59', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 9, 9, 'active', NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', 'Grupo de LOAMMI COELLO', 'aa2d39ad-1f7a-4069-b318-76dcff83d271', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 8, 8, 'active', NOW(), NOW()),
  ('5fc81e44-c0dc-4149-82ae-8fb69f3798b2', 'Grupo de DAMARIS TIGRERA', '57fd04eb-8a3d-420d-afd6-48e79fc306a9', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 4, 4, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.discipleship_groups (id, group_name, leader_id, zone_id, zone_name, member_count, active_members, status, created_at, updated_at) VALUES
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', 'Grupo de YRIAN DE BENELLAN', 'c5bf3872-22f6-473e-82ad-1900a8dc0f8f', 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 6, 6, 'active', NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', 'Grupo de ALIDA BRACHO', '131a075c-1b24-4e85-948c-e28f042fb6df', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 8, 8, 'active', NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', 'Grupo de ARGELIA CASTRO', 'a5c68f6a-62ac-4b09-a27d-9a95917ba1ea', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 9, 9, 'active', NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', 'Grupo de MAGNA ARTEAGA', 'f71c8b1b-ba74-4ff0-8762-2cdc5dfd5563', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 8, 8, 'active', NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'Grupo de FRANKLIN SANCHEZ', 'd9d08952-2e25-4f67-b896-43ba260901f7', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 8, 8, 'active', NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', 'Grupo de YOLIMAR COLINA', '75f977e5-4bb5-4c9b-9914-1ac0d4695318', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 6, 6, 'active', NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', 'Grupo de CLARA ROMERO', '8eb16aaa-a033-488f-8100-9c52be0bf842', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 6, 6, 'active', NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'Grupo de ELY SIVIRA', '5b84cbbd-af0b-4c40-a885-32ffffee0dee', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 8, 8, 'active', NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', 'Grupo de EMILYS CALDERON', '7ab228ea-eb05-41b4-91ef-4cc49713d9e8', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 9, 9, 'active', NOW(), NOW()),
  ('b1d9cb6e-e69b-49d8-affa-030da304f3ca', 'Grupo de NO ASISTE', '10707e46-ecca-48cc-853b-d86a4f1ab8d3', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, 1, 'active', NOW(), NOW()),
  ('387845d5-738d-43be-a680-0ff38d11e83e', 'Grupo de FRACISCO SANCHEZ', 'd2c86e18-3e6d-4888-b641-18bd0e3db152', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 2, 2, 'active', NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', 'Grupo de FRANCISCO SANCHEZ', 'dad3bee8-c259-4a99-86be-1ae566c81c25', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 5, 5, 'active', NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', 'Grupo de WILLY ALVARADO', '29aa5cf5-9a51-467e-8951-81c7b32cfdcb', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 5, 5, 'active', NOW(), NOW()),
  ('d7048441-1005-4ba8-96e7-da0205b41012', 'Grupo de SUPER', '93f852f1-c604-443e-b80d-3c2c5e0881a6', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, 1, 'active', NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', 'Grupo de CARMEN PETIT', 'c88a9fe5-b6b9-4a45-b8f7-c78169248730', 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 7, 7, 'active', NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', 'Grupo de YOSELIN MEDINA', '5a61194e-d8ff-4422-ab49-77757596bed1', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 9, 9, 'active', NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', 'Grupo de MARIA EUGENIA CHIRINOS', '1869e9a3-8ac7-4071-82f2-070218e76043', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 9, 9, 'active', NOW(), NOW()),
  ('3d9e8f00-9175-47e6-982c-eb39e420cbdd', 'Grupo de BELEN NOGUERA', '270897fb-85b0-4548-9d88-21c8dde86447', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, 1, 'active', NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'Grupo de ELVIS CALDERON', 'fd3ee671-5f63-4a16-b6ea-69bb1bae404b', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 12, 12, 'active', NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'Grupo de ALBERT GUTIERREZ', 'dcf2abfa-69bd-4ce2-aee0-e5876af7bfbb', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 17, 17, 'active', NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', 'Grupo de ROSELVYS LAGUNA', 'ca008f30-e7d5-4697-8334-aeb0b94d5bcc', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 6, 6, 'active', NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', 'Grupo de YRIS HERNANDEZ', 'f9f1c951-969b-48bd-9ef4-cc40476f0e63', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 8, 8, 'active', NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', 'Grupo de REIMAR GARCIA', 'a5df5563-e0e5-4f13-b6ea-bbeb94cd4e01', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 10, 10, 'active', NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', 'Grupo de MAGALY GARMENDIA', '5db42321-6640-4684-9aa2-f9291da39f05', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 7, 7, 'active', NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', 'Grupo de YELITZA SANCHEZ', '73e8c891-8edd-4c5c-b243-e23bf327194b', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 7, 7, 'active', NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', 'Grupo de ALICIA DUNO', '05891d3a-84ed-4c89-a6b2-ed4d6a43d870', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 8, 8, 'active', NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', 'Grupo de NORYS ACOSTA', '153e419a-dc51-4b06-8a7c-cc8c9384f21d', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 7, 7, 'active', NOW(), NOW()),
  ('8d2337cc-e485-43de-ad29-e26061ef5684', 'Grupo de SUP. AUXILIAR', '776006ce-7e55-4297-bd4a-1f0575681240', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, 1, 'active', NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', 'Grupo de MARINA AMAYA', '31b43b9c-670c-4665-8e36-f0d358f26c7b', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 8, 8, 'active', NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', 'Grupo de OLEYDIS FERNANDEZ', '3e42c44c-d50f-4f75-b35f-6124742913bc', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 5, 5, 'active', NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', 'Grupo de DAYMI ILARRETA', 'd1d3675c-ed40-4dd2-80c7-c5296d446a28', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 5, 5, 'active', NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', 'Grupo de SOLANGELA GONZALEZ', '8c858a00-fd72-49ba-9148-af95a1f65774', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 5, 5, 'active', NOW(), NOW()),
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', 'Grupo de VICNELLY AGUILAR', '22a2329c-3644-4b02-a6f5-b710f3748b7d', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 5, 5, 'active', NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', 'Grupo de HECYARLI LOPEZ', 'e8f760d3-445e-4a0c-8083-7dc9715547dd', 'c0000004-0000-0000-0000-000000000004', 'ESTE', 8, 8, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ========================
-- JERARQUÍA DE DISCIPULADO (líderes nivel 1)
-- ========================
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, active_groups_assigned, created_at, updated_at) VALUES
  ('dba832d0-98c1-4359-b10d-1d21acc72ece', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('3395c741-2620-4b2e-8e96-d3b58c65609e', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('d5e5d306-c266-4a9d-a6ad-d247ab771956', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('75745f0e-d6f6-4f72-93b9-378d905f622a', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('aaef1ecc-9405-4184-9d16-96f0a7713357', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('658f0530-0b6a-472b-bfba-0e202e746bec', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('c5080a9e-b31b-4a9b-80d0-ef0bf88fc2d3', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('2f47609a-ac52-4c77-8af0-69e7925d23e9', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('367ca68f-37e5-408d-8881-8b59e64825b3', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('13c1f3fe-e331-4a72-bfb9-0d8439fe119d', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('6942708b-7e46-4df9-af0b-ec2dd3596061', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('9c4ad653-9033-4762-9130-1976c0c25a2d', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('ebb6df49-d459-4e49-b5ea-14342279b8af', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('9c1e3b2b-100d-4a51-97ae-b10ff2f6f3b0', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('d38185f2-a311-4426-9c93-2c6ffe673b4f', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('c4af06c2-65a7-44f1-a85b-bf668e95d5d9', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('910c981a-91b0-4683-b76a-a17373c7da4a', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('be30d15e-60b2-4d76-a564-1989a13f5cda', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', 1, NOW(), NOW()),
  ('bee67c49-cb1d-4bd9-ab67-16516a9c0255', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('fcdd596f-54d5-44e2-829c-fb66f73132f0', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('50951a8f-f6fd-4a44-a617-d988f3da97cc', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('d2961692-7599-4553-b857-c4cbb6908936', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('0daaad91-0d23-4843-b9fe-b41595c4e07e', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('6bdc0490-833b-4d27-85b4-73bf6809930f', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('f8bb7c3d-fd5e-4b93-8edd-edc8639a2b80', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('4b50b9a2-d21c-4c15-9314-82e95115d0fa', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('60fe3855-552a-45f9-bb5c-d78694d13ca4', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('ef73d442-8c99-4f32-bc80-405ae9a48b1a', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('18a23669-dbdc-4818-9fb0-0cb8c7423530', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('2bad7646-85ff-43a6-ae3a-fc3cdf7e4d3a', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('00127b30-3947-47e5-acb8-1b86f2cd0f6b', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('35ae7375-51c6-4669-b08d-a576dd3b31b8', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('51844354-354f-49b0-9c99-33427479c964', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('127b1a29-1ffe-4dff-a800-2f29d47419d0', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('7aaa5913-c0e3-4c16-8b66-d1e095a0b783', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('55f210b5-0abd-4f62-98ba-78fcacfe3c04', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('d5d2b4a0-e889-4ac5-8ff4-5f9de2943df5', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('5292bd79-6349-4175-a3ba-61131a8ce280', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('e0353089-3a31-4cd2-a45c-53facbe113b7', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('f1afd011-5c1c-486e-bade-ff75a20edb94', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('7e4ea5f7-f755-4d99-a1a0-e9af57ea0b26', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('d512497e-8b45-4dd0-8614-31197443c5a6', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('1e3a95f1-b359-40e9-b509-5ba0de02f236', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('b2a6bca1-1286-44c2-a351-16120ad40e58', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('bca27a63-b4b2-4f23-b4b8-214546f68f32', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('b2e9024e-1ba5-405f-a963-14c1bfd866a8', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('a86afa57-ead4-46f7-b7dd-f107a7fdde4a', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('9cae572a-b0f7-4de9-bbc5-65599991ab59', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('aa2d39ad-1f7a-4069-b318-76dcff83d271', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('57fd04eb-8a3d-420d-afd6-48e79fc306a9', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, active_groups_assigned, created_at, updated_at) VALUES
  ('c5bf3872-22f6-473e-82ad-1900a8dc0f8f', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', 1, NOW(), NOW()),
  ('131a075c-1b24-4e85-948c-e28f042fb6df', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('a5c68f6a-62ac-4b09-a27d-9a95917ba1ea', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('f71c8b1b-ba74-4ff0-8762-2cdc5dfd5563', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('d9d08952-2e25-4f67-b896-43ba260901f7', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('75f977e5-4bb5-4c9b-9914-1ac0d4695318', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('8eb16aaa-a033-488f-8100-9c52be0bf842', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('5b84cbbd-af0b-4c40-a885-32ffffee0dee', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('7ab228ea-eb05-41b4-91ef-4cc49713d9e8', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('10707e46-ecca-48cc-853b-d86a4f1ab8d3', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('d2c86e18-3e6d-4888-b641-18bd0e3db152', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('dad3bee8-c259-4a99-86be-1ae566c81c25', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('29aa5cf5-9a51-467e-8951-81c7b32cfdcb', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('93f852f1-c604-443e-b80d-3c2c5e0881a6', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('c88a9fe5-b6b9-4a45-b8f7-c78169248730', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', 1, NOW(), NOW()),
  ('5a61194e-d8ff-4422-ab49-77757596bed1', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('1869e9a3-8ac7-4071-82f2-070218e76043', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('270897fb-85b0-4548-9d88-21c8dde86447', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('fd3ee671-5f63-4a16-b6ea-69bb1bae404b', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('dcf2abfa-69bd-4ce2-aee0-e5876af7bfbb', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('ca008f30-e7d5-4697-8334-aeb0b94d5bcc', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('f9f1c951-969b-48bd-9ef4-cc40476f0e63', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('a5df5563-e0e5-4f13-b6ea-bbeb94cd4e01', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('5db42321-6640-4684-9aa2-f9291da39f05', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('73e8c891-8edd-4c5c-b243-e23bf327194b', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('05891d3a-84ed-4c89-a6b2-ed4d6a43d870', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('153e419a-dc51-4b06-8a7c-cc8c9384f21d', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('776006ce-7e55-4297-bd4a-1f0575681240', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('31b43b9c-670c-4665-8e36-f0d358f26c7b', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('3e42c44c-d50f-4f75-b35f-6124742913bc', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('d1d3675c-ed40-4dd2-80c7-c5296d446a28', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('8c858a00-fd72-49ba-9148-af95a1f65774', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('22a2329c-3644-4b02-a6f5-b710f3748b7d', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW()),
  ('e8f760d3-445e-4a0c-8083-7dc9715547dd', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', 1, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- ========================
-- MIEMBROS POR GRUPO
-- ========================
INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '3317c478-1aab-458e-b5cd-bbdb89ffd5a1', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', '8474e7c8-9852-49f3-a3e5-fe03a6d4d72d', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', '6ad91586-9a41-4ed1-9817-5f316ebe4c29', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', '0610cf50-e42c-4c6d-9795-9d32a034c5ee', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', '0f220b5f-0ab1-4fe7-a909-63fb933298d0', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', '4facf838-ab76-48bf-8dac-09e75f311b4f', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', 'f52e6001-6498-45c7-8b3f-ab6ea725ac59', 'member', true, NOW(), NOW(), NOW()),
  ('f275a2cd-4646-4f59-bf26-e7ceccc8c099', 'afd44bc3-eddc-4d6b-a5ee-0481e0684aa5', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', 'fc0cd98c-56f3-4ded-82fa-2832905e3310', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', 'a8c49239-9191-4ff1-b625-e206dd75451a', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', '99638bc0-a5c8-44a2-9c1d-e8892b915e65', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', '0434bc6f-63ac-4627-b772-827b4766de0d', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', '66e2b0f9-b018-4f65-9c8a-adebdf86a0f1', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', '7cc2d5b2-b9fd-4967-a1c1-0419ae65380d', 'member', true, NOW(), NOW(), NOW()),
  ('41d1887a-9c6e-4008-87a9-1fa429d1250b', '3e1a85a3-a97e-4a48-80c1-66c591b6d004', 'member', true, NOW(), NOW(), NOW()),
  ('261acade-fb7a-4ffe-82c9-c6acadcd2e17', '7357f49a-a5d8-4f76-a097-9627a54050cd', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', '991d8b95-79bb-4fd7-8ecb-8c7ff798bb77', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', 'ea17e07b-1dd7-4ccc-b52c-35b35c162116', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', '641866b5-3173-460b-afbb-fffa9ab2f068', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', 'f26c9549-a844-4070-b4e9-757862374504', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', '58ac613e-42b0-4408-bc46-1eeef1b0a34b', 'member', true, NOW(), NOW(), NOW()),
  ('84594365-a596-4a11-90b1-77918cf2850b', '009694ab-37b0-48d0-91e0-051c3de877b3', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '2a6757ef-287c-4566-ac61-dbffe027b903', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', 'b4756620-2de1-410e-b757-c10c843d72d2', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', '8df93d8a-a2c4-4e56-85d1-4beda560a714', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', 'd12864b7-fe54-45cd-832c-4503d1d81d20', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', '8ccecd5e-c64a-4286-9132-ce662edffef8', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', '1c86bb9a-fb41-437a-9274-1fdb4124416e', 'member', true, NOW(), NOW(), NOW()),
  ('a535f441-5b5c-4c7b-afdc-b28abd8fb499', '68a53fea-9b14-4a7b-b57e-f54e2f1947ba', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '1c091f09-9f2c-455d-bc55-a2212753df32', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '1852127e-eafa-4683-8cfc-f15726e682aa', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '48970f0a-d3ed-4645-82fe-45d3674ff63b', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '01af9293-31d4-4c1c-9ffe-ce71b58403ff', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '66e79b1b-4046-450e-965f-f12727ddd9dd', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '3d7ff2d0-b2e5-41c6-a088-42fc0a5b6e74', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '618871d1-f355-411c-b7fe-e9eab632d625', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', 'd3cce20f-97a0-41a8-9112-74a1c218aaf1', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '7f505bdd-1317-494d-bf92-755cfa290908', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', 'eef04377-327f-4af7-b24f-de9fdc40e580', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '34628f78-8966-4ec6-a08e-35643b446177', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', 'd0e92471-d35f-4fdf-9aaf-6f9d114486ae', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '0cbb5da3-65df-4046-96c8-85cef8059bf3', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '88ce241a-c930-4c4c-b2f3-7b54d307c9ab', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'c80c1e1b-8f38-4f54-abaa-f0cf54969398', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'a2daf2ec-e2b2-4972-9fd1-e2e19803c113', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'b732c4ca-29e4-44ea-b6ba-db7e9e934248', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'f9f76e13-67c9-4670-a968-ba5bd1200273', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', 'c5cef399-a8c1-4353-98e6-f467a9521b79', 'member', true, NOW(), NOW(), NOW()),
  ('cb547382-42ad-4884-88ed-08bd926fd885', '7a930e46-da91-4149-94f0-a9a7470b7352', 'member', true, NOW(), NOW(), NOW()),
  ('95c29d54-fada-46cf-b1fe-cf76aa642a52', '8ce89860-6846-42b9-b879-d30f3b19c72c', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', 'c8903413-40cd-4684-90ca-92873420ed05', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '2d06edb4-ef7e-42fb-8aae-523b6b9bde61', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '6731d8fc-f419-4f6c-92b5-ae09d9a6af3d', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '4963e65b-53b5-4d08-9619-1d1a87f893de', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '3863cb44-320b-49ae-9c5c-517565d2941b', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', 'f494b0e6-8950-4b5c-bc20-d4c5492ca9b7', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '0e200ee4-e08e-43f8-9c22-c55e2fa143da', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', 'e3f2db0d-1479-46ed-b6ab-336d0f171dac', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '6113aa24-2efe-434b-8722-a1d8adae1207', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '3ad0bd60-0713-4ce5-9909-b5291db967b3', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', 'd36b5ae5-bde5-4778-9296-7af93621bde8', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '6521c2ac-0d6b-4eb3-ade5-c121a698eada', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '06022f21-a9af-423c-a1de-52d4bf77569b', 'member', true, NOW(), NOW(), NOW()),
  ('8e9d7c5a-8dcc-4e08-af29-da3c299bd737', '669a1b96-8762-49ad-b00c-fb951125482c', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '335f761c-b987-4109-b2a6-b16968d4c590', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', 'ddc049c1-9ff4-44d9-91ee-192e6db1a9da', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '5dfefbf6-3397-4294-bf7a-d6cab32d5ec0', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '9c06d5dd-5f38-43cb-8c79-c83bf65240c4', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '8f28eaa8-c640-43d2-a145-6636b3d8e776', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', 'e141a306-28c7-426b-b4c8-d4579275d7a3', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '5e6f12bc-2af3-4b04-a45c-70fe2858f760', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', 'b834510e-81d9-4707-917b-373b330cdbce', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '990ab7a4-0a9e-4b3a-a075-6f4ef2960491', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', 'bfa5fc3a-09d5-4129-9e44-ee587f01bc0d', 'member', true, NOW(), NOW(), NOW()),
  ('8650edca-c040-4cda-bdfa-d23f6ad9cdde', '83f9dd7d-3cc6-48cf-8121-d70bd71d0258', 'member', true, NOW(), NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', '0c4374de-4e99-4cdf-8b28-fa95f0558919', 'member', true, NOW(), NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', '25012525-b25f-4c82-9eca-7248bddc76d3', 'member', true, NOW(), NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', '66e5725c-3d9f-45e4-8aa5-83a37f4e2ef3', 'member', true, NOW(), NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', '28ec6091-9723-46c1-9b7c-79cbf584a007', 'member', true, NOW(), NOW(), NOW()),
  ('d7d05cd5-0464-4297-8301-8a7969d1c0d8', '793a66fa-500b-4482-9e92-b5b0f05937c8', 'member', true, NOW(), NOW(), NOW()),
  ('80bf5ad0-3cda-4056-bde5-19c8c8d6285a', '2202b255-1250-4ea6-b735-c80f29cac4a9', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', 'ebb6df49-d459-4e49-b5ea-14342279b8af', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', '71d7f9fd-7a06-4f6c-906e-629023a577a1', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', '13b33e5c-c40d-4af4-9e20-78a351266030', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', '0d3d0b0e-5163-45f0-a755-467e89fc57fd', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', '6a35a4fa-7dab-457f-909e-15532752dd33', 'member', true, NOW(), NOW(), NOW()),
  ('308df6eb-f22d-4bd4-9db8-fe2d164b1a97', '75305fd2-e5fb-467d-883f-c6c839601fb1', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'aa4cc09f-a51e-4dbb-aba7-7616ffeaa568', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', '6d6d4dc2-bd92-4722-9100-eda171660349', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', '9b847857-8a6b-4418-8d84-2d9606c15650', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'b9b80192-b7b3-4936-ba31-d03e313c9c6f', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'd24d82e2-b845-4481-bdef-58cb024ab40d', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'aefe65ca-8366-4ac6-9374-f7fdc132963c', 'member', true, NOW(), NOW(), NOW()),
  ('0b14ba76-4c61-4e17-be52-2a24997bc1a6', 'e3cb8131-5d50-4d63-959d-e164ea637ec4', 'member', true, NOW(), NOW(), NOW()),
  ('5467bdc2-631f-4d2e-b8f4-e1a91a728ec5', '62951a0f-00e9-48a9-a8ac-15c62ae44db3', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', '67c8b14a-be04-4b08-808b-40c2568cca36', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', '4376b1b3-3c46-4b99-a4d8-da2729355d11', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', 'ed8c33bc-4b75-43c4-8db3-39ec9e77edb7', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', '460ba03f-3973-4b9e-9d34-254fc74889e3', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', '623d3edc-e5d9-4e89-ae81-4d1daa1d0466', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('b39e0633-673b-452c-97fc-1d11f1837d51', '557c6a37-30ff-40b1-aa60-e18779b721f8', 'member', true, NOW(), NOW(), NOW()),
  ('b39e0633-673b-452c-97fc-1d11f1837d51', 'ac710b70-b7d3-4899-bed6-ba61d93555a4', 'member', true, NOW(), NOW(), NOW()),
  ('2d43d882-12b8-41b7-9bf8-44ab3e934749', 'c4f7b6ef-0da6-4c1c-864a-46cb0964be53', 'member', true, NOW(), NOW(), NOW()),
  ('6c1c229d-242b-43ca-abb6-620d32a90aca', '42160e9d-18bf-43b2-87a4-6fad553330e9', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', 'eb26d7d7-bbe3-43a8-aff2-7af26014788f', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', '34581a81-4838-409f-9924-3b8f38a07a06', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', 'fed5f96b-59f2-4f3a-87fd-37debc319164', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', '91700ea1-ce6d-4d58-ad00-060040263ec6', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', '3b924d4f-dfd2-4a14-8b88-c7108046fb4f', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', '0d9102ec-f107-4cde-82d2-46cb766659b6', 'member', true, NOW(), NOW(), NOW()),
  ('e46ed6b7-fa7a-4299-b7a0-264c01184a05', '73f5d454-f969-4fa1-9a0b-7c26f32f9bec', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '0dc2a0d2-f99e-4218-9211-3b6b9a57cdb8', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', 'a6857b3c-6c8e-4376-97f5-35c2d8f7cb6c', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '881dfe82-d9dc-476a-937d-3d53c861e541', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '7d1546d0-507f-4f81-9792-c9b13a045038', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', 'db83f3bb-aa77-4e3c-82ca-47b786746bbe', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '1a0eb8b6-eb33-44a9-9b20-d521cd330282', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '2aeeb4c5-35c6-47fa-9c9a-6394e6b17072', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '1053c191-62a2-4a4b-b6f7-77c07b422abc', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '10b0b2e9-5257-47ad-aedf-6040718cd702', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', 'c2f1f7cb-546a-42bc-a509-067a9ad73e01', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'b9614362-9acc-4f6b-b298-fcbedb7f3ed8', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'a70b14fd-62bf-49b8-9698-9fce3be7ee45', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', 'b13f3ff9-ec96-4939-8c37-52640cbf57e4', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', '0d142713-0de0-4229-a68a-548946579bd4', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', 'b0a87399-248b-4481-af37-38abf35ba581', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', '19d17a83-a199-49d3-ae85-c6226c909cec', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', '0d45624d-7d33-4283-9c25-bbfae1eb9a52', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', 'c78c9405-fd9b-4f0a-b6a0-007fddbef8b7', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', '0294c826-87d8-401e-a44b-8a8c46690ed7', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', '4286d71c-674e-4e63-9c39-12c34cb68000', 'member', true, NOW(), NOW(), NOW()),
  ('4e2340e2-93d4-4bde-92cb-64bf3b0372a4', 'a5dc8fca-fe46-4b52-a27b-68cb060e8fc0', 'member', true, NOW(), NOW(), NOW()),
  ('d4aa49f7-147c-4fbf-95df-254400aaf39b', '310dc8da-bd08-459c-b499-1bbb3153cf1f', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'c432cab4-cbdc-4cdb-8729-3e2a6b637b30', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', '0de74590-8c12-4091-bb09-59470f3ff9fe', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'f4d6ca47-3c7c-478d-ae8e-30c66d024981', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', '973b3f7a-6f73-402b-883a-895822561525', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'a4f5d149-002b-48ae-b9b9-454f339e3d1d', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', 'cd1ca2a8-32a0-414f-b1c8-d38fe6a59175', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', '6c9471f1-85bf-493e-b128-436ac099f963', 'member', true, NOW(), NOW(), NOW()),
  ('7d18e304-3283-4988-9b10-519664d2c64d', '3522c5f4-738e-4195-8da8-7a4f3d4650d7', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '73d7f185-e048-43b7-b75c-c9acf1d36135', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', 'ae9cfc3b-7277-4921-9f48-030a1d6a387e', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', '9a9071bf-7f7a-4d32-a286-076a7eb8f240', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', '674227ad-8b1d-477d-bf3e-77d8ed4940ab', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', 'b9f1b45a-2737-42f8-bf58-53f76035d0cb', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', 'e89b12fc-c427-47fb-8aac-cd68cdc04ce8', 'member', true, NOW(), NOW(), NOW()),
  ('ae5df48f-e6d0-4e30-a8bd-9dda44984417', 'c9f987fc-9c8e-4f32-bdf3-7fa062446bfc', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'edc97b7b-174b-4f24-9698-cd1c5ad19097', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', '425f374e-33d8-4df8-a3f0-180d623c64cd', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'dfa6f071-3667-4dbe-b49e-847d8c0fe03c', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', 'd86d7761-a0db-4252-ab6d-5814e578ca28', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', 'a1c541ea-6746-45dd-9d6b-b28b6bf69771', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', '435d4f19-7285-4c13-a450-f6ff607c502d', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', '8e3df9ac-f456-49f3-be8b-ed1a7bb92d7c', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', '71da5236-44b2-4de4-ac76-5aada04eaafa', 'member', true, NOW(), NOW(), NOW()),
  ('b36dc3c0-6eeb-449d-9d86-420996dc713a', 'c65c68b3-a77d-45e0-920c-bb33305ccdd1', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '11c66805-26da-4cc4-b89c-fb977a784b38', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '8638d972-2a8c-4577-9cbb-9b84a91991ee', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '5b75b405-58bd-4dbe-b0f7-3fa7d205408c', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', 'd63a67ff-5b30-41b4-9e9b-67d3f4980e29', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '305eaf45-2ce7-4d5c-a4d1-43d6aeeb82cd', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', 'fe0b52e4-ddbb-40a3-9b1a-6cc8e6c8be06', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', '450359db-6af6-4f00-94b1-23d6cf55182f', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', 'ffd628ca-7fea-4ef7-9b10-702682bec77f', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', '2d01ab6c-d0a7-426e-bf11-0132d764c740', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', 'b088653b-3368-452e-a648-744b06fcb0d7', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', 'bb278817-e9b9-43b2-9684-f16027046051', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', '65981f9f-27d3-4142-bcb9-4e5970760d2a', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '1bf87527-1dca-44f6-bf2c-aa9614ae9253', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '1a324ac1-1d23-45db-8579-e81e0857eb3a', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '11a8e201-d95f-44e7-b2bb-73ebe4abf7e8', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '8d7e7b57-51af-4348-97ef-0493b8952ec7', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '93eeb619-c5e4-440d-a5ef-c20d1e744f63', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '2cc8dd2b-3d4c-4555-a8d9-7b2cd644cb95', 'member', true, NOW(), NOW(), NOW()),
  ('8c081c1f-9c9c-496b-8827-a080eb1d5fb8', '50653a7c-30a0-4e1f-bf55-5a7acafbaeca', 'member', true, NOW(), NOW(), NOW()),
  ('62d74ff6-d1da-490f-ad4a-39f5fd9b410a', '08c294de-6dbe-4df8-a2ec-f8a23a217973', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '9f5210e3-0e09-4b64-b3be-4b4c52f3e292', 'member', true, NOW(), NOW(), NOW()),
  ('700763a2-ad12-409e-a5a8-e30be7549c60', '7a351c6e-d3c5-4b9f-8fd3-76e56fd4c96f', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', 'cd062ba5-38b4-4fb2-b73d-48b45ed0caf8', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '112704b1-0751-4995-8130-56f6afff7cd6', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', 'b1ce1c58-ce3d-479f-9e1b-5ba64e706ec3', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '6ae81e1f-7eb5-4a18-af93-981fbd617705', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '704b24ae-a137-434c-a925-f5bcb1451cca', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', 'dbfb078f-c7a7-4cd2-9d8b-ef08c322ec54', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '5fbfebc5-e159-43f0-b843-39cc99e50292', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '7513a565-f9b5-4d67-afe7-be2c3ae3be0d', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '58000025-0745-4d91-8976-0ad19d4ec06c', 'member', true, NOW(), NOW(), NOW()),
  ('7c8fe168-042d-4a24-80be-fb34963e0bb2', '2f6872e8-8041-4fd9-9009-6b24b995c070', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '4d365aa9-2c7f-403b-8b47-8a5127b7f126', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '997aadf5-407d-47e1-b4df-f20459ef379e', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '9ae1c75f-0249-4bec-89de-ea244cd3be78', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '6e1166f8-3de8-47c3-b7b6-4b3470435d23', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '640f3ba0-d175-49a3-ba47-97657056573b', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', 'c60fc251-dd9e-4841-bb05-55784437aa86', 'member', true, NOW(), NOW(), NOW()),
  ('ffbdf621-f95a-4d66-a32d-ca884cef8aec', '58b3a426-b165-4318-875a-3253a4a6ebbc', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', 'e01be2e2-b406-4e35-b8be-fcbb5468b652', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', 'b92ee586-413c-43fe-b1a4-ac1dffba47fd', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', '58542b15-388c-4770-be8e-0f2d6d11aae7', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', '2309535b-d2f4-4836-8b33-6444e9036420', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', '34def62a-8fad-41df-bc51-f1a243ff27c2', 'member', true, NOW(), NOW(), NOW()),
  ('942105f8-5198-4083-b30f-0fdcb04cfe56', '1d82e035-65f3-43b8-81b2-d8c5f84a5f91', 'member', true, NOW(), NOW(), NOW()),
  ('942105f8-5198-4083-b30f-0fdcb04cfe56', 'ed65d3c9-72be-41d9-bc32-da8c5f70167b', 'member', true, NOW(), NOW(), NOW()),
  ('942105f8-5198-4083-b30f-0fdcb04cfe56', '3d9fb279-5dd1-4752-a230-9821b14d29ed', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', 'f5ee692c-5d51-4a8d-a0e6-e008a078515f', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', '36520892-9205-41ed-8af0-94042a4e6776', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', '8e29b204-181d-4623-957e-bdd49ae21686', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', 'eaee3dc8-4964-4e25-9578-53f6bcfdbc6d', 'member', true, NOW(), NOW(), NOW()),
  ('0210c094-9e9f-4e7c-9926-78e80bbf7bb2', 'f5a80a40-78d1-4893-bba7-1c4de4b837ec', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', '352cfb60-65af-4425-8652-969c1cc0f06e', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '0157f92a-3e3f-443c-ac8b-9370bad2f14f', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', 'e7444fbb-07f8-42ed-b9ba-7d40f13ab790', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', 'dc514442-5ca4-476b-b7a5-5275ed48a3ea', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '5a69f4d1-b97e-40df-9b4e-eae231c02cb2', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '6a24f830-f506-4609-971b-e3fb96b921ed', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '5521da47-428d-4cc8-b569-577d1294abe5', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '45415390-8a65-4b90-89e5-8a887aa58131', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '7de8f58b-50c0-4b6b-92da-6c624522c77b', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '5f46220a-e89c-4c1b-8eaa-4b94b5548d57', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '2baafbc6-b16e-4e1c-9e4e-6412c802a2c2', 'member', true, NOW(), NOW(), NOW()),
  ('dec5db4d-4c82-4724-838d-e5c938bb11ee', '7002e2ea-ecda-45ab-b554-c00834818606', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '0a36c0c2-0614-4d57-930e-6d9b2aba6736', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '96783b22-1172-41a1-90d4-894510d8b753', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', '3e7d0bfa-b775-4525-a8ed-8b7fdc4b0b36', 'member', true, NOW(), NOW(), NOW()),
  ('96b4ba13-34bd-400c-bf1b-c668f322fd29', 'b5bdba82-a1c1-4a78-b3b4-ea6e2d22b94e', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '58fb0017-721c-4db8-87e5-e7a0cc4bd729', 'member', true, NOW(), NOW(), NOW()),
  ('9be74a25-b55c-43f0-8386-6a61ac55d276', 'cf71c2a9-ab6d-4114-8e2a-1d5fc429b5e3', 'member', true, NOW(), NOW(), NOW()),
  ('9be74a25-b55c-43f0-8386-6a61ac55d276', 'b6206f30-c474-40bb-894a-9f78317b6445', 'member', true, NOW(), NOW(), NOW()),
  ('9be74a25-b55c-43f0-8386-6a61ac55d276', '4072b66d-6336-49e5-b9dd-dce95c243dae', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'aa34f744-8acb-4e6e-80a0-b4b4e6b925c4', 'member', true, NOW(), NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', '56d7d5e7-e4a1-41d5-9b3d-02952781c8c0', 'member', true, NOW(), NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', '213c4147-c57e-4ca1-82f7-f04223cd3275', 'member', true, NOW(), NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', 'cd9a60e4-ef57-479c-9621-dc5c3fb29fc3', 'member', true, NOW(), NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', '29ba472a-6ba1-4b86-9af9-7c190e148fb4', 'member', true, NOW(), NOW(), NOW()),
  ('3ee75fb5-160f-41f2-b66e-bb2fdf944358', '7b54f1b2-78fb-43d7-a197-df29f9e94b9c', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', '20c86a2f-3da9-4a14-b81e-f0b7d8d20281', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', '410eed61-b3cf-4306-a533-281c6e46b7ef', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', 'fa256959-fc17-4efd-b1f6-8ecdf92f832b', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', 'cefca380-ae28-4d65-a54f-6ccb53673e36', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', '75d313eb-ad6f-4c7f-8a2d-40a35ba42202', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', '8ccb3088-a958-4515-81d5-a12000b93508', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'a7d4a128-96a5-4c60-84e2-78852c057e81', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'fc1469cb-5958-41be-ac07-2c8cfc89e3d4', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'ff3b0bf5-a4eb-4ec9-82d6-68bbefcdb984', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', '40e868b9-18b8-4121-b243-81755bd884af', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', '44eee0ef-129c-456c-a6c9-721b89b193a0', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'ca9f7443-d5f4-4679-b0d6-27550c541371', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', '7f30f85d-d65a-41f1-be8d-bf0266ee05d3', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'a61b7b56-8e5a-4330-8b44-4d3ae2e5112c', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'fa8d6401-612f-44f3-a83c-8b2fef39cbfd', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', 'b33b0517-0fac-4801-8427-bd82f0034c98', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', '81d813f0-4de6-4bbd-9940-379002eaa920', 'member', true, NOW(), NOW(), NOW()),
  ('f58c4016-8c7b-49fe-9b32-d171dc02ca4a', '80097157-4211-4481-a249-1037aadda36e', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'cafebc92-108a-4143-893f-7d8dcffa1af8', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '8e8c1419-cef1-4c23-af0b-904f92d1da3b', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'c16d0585-fbfd-4364-9c22-23684905b7f2', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '023087b3-b494-4502-8b5b-96eb63f3614f', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '8ee1c0a8-3538-4ca0-b5ed-59029b0d7e9e', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'deb30ebc-1ab5-4c2b-b579-2e77da755ad3', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '54d25586-3201-4957-a84d-6af0c87c41db', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'f745536a-a97a-456f-855f-69148b871e1d', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '987b16e9-bc27-43db-a65c-f4eda109b352', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '039fc6d0-42bc-41d8-a6c6-8f24fee9f8cc', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', 'd5837593-fa53-43cc-b640-8fadc28a9ba9', 'member', true, NOW(), NOW(), NOW()),
  ('3dba9271-25b2-4a66-a591-3d33429b5117', '33564917-e9d9-4e35-a4e1-513874d679bc', 'member', true, NOW(), NOW(), NOW()),
  ('050c8ac7-f1e6-4d66-badf-93a2b7352baa', '60526eff-40b4-46db-9e4b-0170e33ec966', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', '051ed486-1003-4a50-bbdf-1a531459f979', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', 'ef26b8b3-8f1a-417f-8382-af3f3a642969', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', 'c1a7be0a-4022-43c5-85a5-1013c9387446', 'member', true, NOW(), NOW(), NOW()),
  ('9fb17a26-93eb-46c2-85f3-2b98821a0132', 'a01a0fd5-6962-4115-b9a3-5f20fa4d6b06', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', '5ba23cb1-4ad5-47b8-a832-66d61019cab1', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', '434d3cc3-c393-4a0e-bada-e14a2fcf26ad', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', 'dc2af481-7734-4673-9ece-6fbdf6207cfa', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', 'a64e4254-89f2-42a4-b36f-cdbb829980df', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', '872888d1-32fe-46c0-bf00-4fe2795ba9be', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', '1f0bf72b-b431-4ea6-8232-5cf2eb7f742e', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', 'e9eae14d-4113-423a-839b-07656b437ccd', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', 'd1a2dba6-c34e-4cd0-85ed-54ccfe7d0439', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', '52597c30-2ec8-4d96-bb83-b3420020ca58', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', 'e5780bf8-0a1c-4b31-99ba-a5f7512da6cc', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', 'a7795354-efca-4481-af30-f171400992d4', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', '6ae9b1ef-5be6-47ac-ac21-d5f249f3e516', 'member', true, NOW(), NOW(), NOW()),
  ('6b54f1fc-9695-4aac-ae4c-c34625e91a6c', '1ce95080-eae3-4707-b5c7-ce7cf1ae497b', 'member', true, NOW(), NOW(), NOW()),
  ('5a8519a4-065c-487a-be92-9458e2b61c2d', '50b9c4bf-79a5-445d-8fa6-8db610b820c1', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'd48b5403-6ad0-4059-83db-132fd27a8556', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', '43de3f55-92e4-4b70-ae00-29ec5446649d', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', 'a3c39d7c-fdbe-485f-9306-d14036b54375', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', '4dd99bf8-5689-4ee9-9153-a0cdbddd4a43', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', 'e99ad15b-bd63-4a5e-914d-fbcc9b6a48e4', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', '85913bad-c48a-483f-a184-9981159043e0', 'member', true, NOW(), NOW(), NOW()),
  ('053c3ba3-ffde-4765-953f-b9bf2dff5466', 'ce1a19e6-461d-4c06-8270-72a828122b80', 'member', true, NOW(), NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', '2ca28156-7605-49ba-abbf-cfab8b6e42ad', 'member', true, NOW(), NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', 'd2d9b04b-d1c5-4915-9621-9d694ed8b17b', 'member', true, NOW(), NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', 'a88e8ca1-b96e-4e85-b8a8-c9f730bf8e2d', 'member', true, NOW(), NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', '1db9bc6a-dea2-475a-bfe6-e35ddc114793', 'member', true, NOW(), NOW(), NOW()),
  ('f2ecbac3-e9fd-4bc3-9c53-4f4b3db8a1b2', 'a83adb55-f600-4748-a1d9-498081e789ec', 'member', true, NOW(), NOW(), NOW()),
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', 'e13bf650-b28c-4795-be89-b15d090506a0', 'member', true, NOW(), NOW(), NOW()),
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', '5e2ece6b-af9d-4155-aefc-bce99ca56254', 'member', true, NOW(), NOW(), NOW()),
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', '5f3adcad-9608-4dfd-8fb3-a39284f1238f', 'member', true, NOW(), NOW(), NOW()),
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', 'bb79c2b6-565f-4684-bd7d-9c20fd603658', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('9580b450-b851-42aa-bf44-a4f7ecabc3f9', '9a7c8c97-d2ab-4421-8502-924abb621eec', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'a5ea240c-cd2a-494d-ab7c-7bc5dd162c7f', 'member', true, NOW(), NOW(), NOW()),
  ('e6f5ab58-a78b-4c9b-a7e6-e477ac9b89b1', 'f33e85be-876b-49c6-bc0a-2c58f0d7cdcb', 'member', true, NOW(), NOW(), NOW()),
  ('e6f5ab58-a78b-4c9b-a7e6-e477ac9b89b1', '756c4977-6665-4625-af24-4bb47b2cfdbc', 'member', true, NOW(), NOW(), NOW()),
  ('e6f5ab58-a78b-4c9b-a7e6-e477ac9b89b1', 'f27a8d17-791d-4adc-b8fd-0b4a688f8100', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'e4b0199a-6d21-4157-b234-db24792b7faa', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'e08cdd23-cb54-4be2-a46a-08599f22b4a0', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', '0684043a-53f4-4e80-8d2d-77bdc3e729a7', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', '39940a29-8eca-4d7e-b952-3fa7dde784d7', 'member', true, NOW(), NOW(), NOW()),
  ('1cd6095f-fb8b-4f10-8ef4-18308ba6246d', '0717a73b-f4aa-4c62-8640-58d0a4774ea8', 'member', true, NOW(), NOW(), NOW()),
  ('1cd6095f-fb8b-4f10-8ef4-18308ba6246d', '7901c288-af4a-43a6-a82e-a52a7ef60435', 'member', true, NOW(), NOW(), NOW()),
  ('1cd6095f-fb8b-4f10-8ef4-18308ba6246d', '976f23df-7112-47ba-b741-66b42116e63a', 'member', true, NOW(), NOW(), NOW()),
  ('1cd6095f-fb8b-4f10-8ef4-18308ba6246d', 'a291ec9c-e6d4-45f4-9dc1-6674acb71d6a', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '73a2bd54-755f-4b3f-998e-2c308da251eb', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', 'e9578e8f-67a6-4680-ad38-35d490644d7f', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '3b0ec5b1-79c0-42ce-a8ae-d338bbd28425', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '100270a4-1735-47c6-91ae-49f2e1852363', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', 'efb9638e-3753-4790-8b0e-9c29f3608c79', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', '534169e6-f9a2-416a-aebf-88ac837b852f', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', 'c0fdaa81-b9be-4e72-a54b-2df4128d67b8', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', '9d664015-9a95-46ff-918d-c123345ef206', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', 'faa8d6a5-b5af-4486-acd0-467b8bc91314', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', '2d5966ed-c3a0-43f9-90b6-5297032bedb6', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', 'ff0ea892-e83f-4f35-a2f7-31aa75f83bef', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', '93451faa-23cc-4ac2-8729-66ce08b34457', 'member', true, NOW(), NOW(), NOW()),
  ('844a2aa6-1d54-4277-892f-c7f2f1c5e54c', '55153a8d-0357-4d89-bb96-80e33bb1f6d6', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '468d1638-8c72-4e3d-b3d9-bb1f347da54c', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', 'b508e259-b5c8-442a-90c0-1bf555802379', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '14afa408-3b78-4670-a6b7-e9b2f9367ff2', 'member', true, NOW(), NOW(), NOW()),
  ('d91dade7-45a6-4bb9-97fc-065699fa739a', '0ab2606f-e7ee-487d-bb22-acef6f0caf1f', 'member', true, NOW(), NOW(), NOW()),
  ('5fc81e44-c0dc-4149-82ae-8fb69f3798b2', '3bc8abee-5af2-4666-92eb-903628a1d5f3', 'member', true, NOW(), NOW(), NOW()),
  ('5fc81e44-c0dc-4149-82ae-8fb69f3798b2', '11a049a0-14bf-4285-9ee6-e0b5bc9050bc', 'member', true, NOW(), NOW(), NOW()),
  ('5fc81e44-c0dc-4149-82ae-8fb69f3798b2', '6ddf33c7-ae31-4cc5-a780-a42c611dae60', 'member', true, NOW(), NOW(), NOW()),
  ('5fc81e44-c0dc-4149-82ae-8fb69f3798b2', '7a8c9a9b-921f-4556-915c-74906ece638c', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', '150bc7c0-8bab-44f2-a6f1-3ea06c3cb1af', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', '287019a8-80eb-4c46-b336-d21854c4051d', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', '7ac0c6c5-310b-47c8-9422-3b4dbebdfef5', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', '8f44be5b-28bd-473f-8e06-919591d64150', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', 'e7fd47fa-2570-492d-9725-e498abb03f41', 'member', true, NOW(), NOW(), NOW()),
  ('89cd7e0c-87f7-4202-8c0a-0d08bd7d75bf', '5fac6d6f-6be5-4809-91a2-8be485472c88', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', 'ed327b85-0890-4127-a33e-1327adb8859c', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', 'addc2adc-0566-49d7-8bd3-0610a767dff0', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', '27d20b12-3440-4c56-92e2-8884a4d143db', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', 'f756dea7-d7fa-43d2-bda2-29a2df65f752', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', 'c888c8d8-7156-4579-9c54-01c10bef6588', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', '38870850-6c67-4fac-81e0-154f7cdf2c6b', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', 'afbbca05-7e59-45d8-a2ad-23787671cdc1', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '54727faf-cad1-44ef-83ca-e2157aaf0700', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', 'bdbd9f93-c357-4a93-b122-b30dac073181', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '4aa8bbbe-1a36-4009-b7c9-78093fcc8fb8', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '970c787f-908e-4994-83cf-c0cdff9e0fc0', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', 'fec9f42e-b81a-4e4d-943e-cac1f348923d', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', 'f4b20aff-e39d-4953-bdab-1f60dec18f22', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', '2896936f-ebce-45c9-9b2d-3ebf26bacc77', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', '056530e1-a69b-486a-add1-4d27340af7b1', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', '7370e158-4899-4ea8-8aaf-dc35e57aba14', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', 'c78d8a66-3f0a-4196-8c40-d0f9a4af3994', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '95f8b2ff-92ec-4a42-a7d4-6435fc01b5dc', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', 'd4fe1239-9d8a-46ad-a3c8-326f5cebf2dc', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', '1db89f66-f860-4122-96ce-60241588fd2e', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', '131a075c-1b24-4e85-948c-e28f042fb6df', 'member', true, NOW(), NOW(), NOW()),
  ('58cb25ce-0ee8-4386-8561-3c8a58463534', '4b2a02ff-aaea-4401-b88e-abc8a91a2491', 'member', true, NOW(), NOW(), NOW()),
  ('78a11915-95db-4db3-9545-22f8c64e2723', 'f5227c6b-d0cf-4d09-81f2-10da33aab4cf', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'e561b550-6f89-4bd6-a6f8-752a366b91f6', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '010bd325-62fd-4f80-b086-e7b13513bb3d', 'member', true, NOW(), NOW(), NOW()),
  ('16cf444b-0893-4cf8-9a4e-02aa7f403e58', '93fe54c0-d61a-4ff4-993f-1c630b7f2aa0', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'ed4a4d2d-da98-40c5-b081-124ad421826f', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'b7828f96-96db-4344-8376-0487d9442e94', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'e0965daf-eb4d-4ee8-a190-8cd8e5f850bf', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', '3fd2c3c8-22da-4e9e-98bd-8942b70d577a', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'ab5a1497-032b-4394-b081-37b7ed6e2030', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'fb4f6c61-bc85-4ce6-92e3-d95ba07a873c', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', '2bb2e9c0-34c9-45a4-bd17-1d736a60a4f5', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', 'e166b4ea-2c5d-4ff5-9d13-0805b85313c1', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', 'fa220d2a-8c2f-4d1b-8ec5-3bc7d192e35a', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', '35a44203-1094-4830-b805-2a268a8b5e27', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', 'c7712a41-fa83-4b77-91ad-95b35eb2694c', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', '6ceb23ca-9b6c-4ae4-bd31-2367d49146df', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', '0061654e-79e3-4ed0-baef-8790bd69db36', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', '1f75cf2f-ef6b-46a8-8d14-2ac1abb7f449', 'member', true, NOW(), NOW(), NOW()),
  ('2681e610-af57-4a11-85b3-a8f936b04d09', 'fd4baa48-9983-4f6d-9fb2-295ced3082ac', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', 'df17d1eb-ec42-477b-a6e1-79208a512dd0', 'member', true, NOW(), NOW(), NOW()),
  ('67f24880-0eb5-4889-968e-b8433d05bb53', '8223eb19-3247-4f63-b461-c316c37be24e', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', '8ffe3527-973c-4bda-b8e1-015a351d0587', 'member', true, NOW(), NOW(), NOW()),
  ('20c66bb8-ac08-4222-951e-1f79cfec7408', 'add54e4b-93fc-4e06-a6a5-ee54e21c16b9', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'fa5d50e5-0edb-4e7e-9240-d6798f134bd4', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'd6f86eb1-9193-46b7-b3b3-10b4ebfd8f7b', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', '3ca967ef-b389-4651-a462-ebbac0da0204', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'ef3b099b-e99e-455f-8748-dd14dc96e4b7', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', '8cb9ae2b-0086-4b91-8927-1d70fc2785c7', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', 'b49db6bf-1778-40ad-a36c-f599c79ca1f4', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', 'c0164c0a-208d-41a0-add5-97fb8dff74d6', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', 'ad08200c-74be-4a7b-acc8-b11f4dc20e72', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', 'fd4e1e8e-28be-45be-bb18-407960c382e7', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', '4ce19157-4a60-473b-b1e8-4ae5de8f9b8e', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', '1c8dc706-3fac-4cab-ab88-5d289c1246d4', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', '05a77ebe-019d-4e36-93ab-97d2e1cfb4f1', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'd0dfa104-431f-4ae0-bf65-eccaa04f81c3', 'member', true, NOW(), NOW(), NOW()),
  ('a0b3cce4-89fd-4ae1-ae76-398316efac9d', '68c32884-1f25-4acc-aac3-a97eba85a842', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'bc0fea53-83bd-46de-a73e-398014691a6b', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', '48037ca4-4c1c-47f4-a409-cadd3c8f6c8d', 'member', true, NOW(), NOW(), NOW()),
  ('417c92de-b9ad-49d2-9a8a-74a9cf4ae7e3', 'fa1bdd39-012b-46b1-9fab-54803a107b57', 'member', true, NOW(), NOW(), NOW()),
  ('b1d9cb6e-e69b-49d8-affa-030da304f3ca', 'd3b3099a-77f9-411d-8db1-55f1b0580c05', 'member', true, NOW(), NOW(), NOW()),
  ('387845d5-738d-43be-a680-0ff38d11e83e', '486a3c0d-cd63-4327-b31f-fb317d7fa3e7', 'member', true, NOW(), NOW(), NOW()),
  ('08d9d6d3-1522-4a38-be3e-bb43022b5e08', 'e81e8816-a780-493b-be56-aaf36cb47e13', 'member', true, NOW(), NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', 'e99852fb-b22b-4826-8fa8-84e3fb8c22e0', 'member', true, NOW(), NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', 'a165a9a3-82b6-448a-9d52-4827155e03fc', 'member', true, NOW(), NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', '1f5ba5eb-b68c-494a-8938-2f12ad4de14a', 'member', true, NOW(), NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', '75c1cf56-3d80-4ba9-ad47-b1de31f6197b', 'member', true, NOW(), NOW(), NOW()),
  ('75661f9b-6d89-4c51-b194-53fee3ad1997', '8d631223-5ff6-46c2-ad7f-a06e49868425', 'member', true, NOW(), NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', '3c27e727-1eff-4fd2-b2d9-d4a2e1670a4d', 'member', true, NOW(), NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', '5a38e746-6a1d-4661-b5ca-e92616983f27', 'member', true, NOW(), NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', '71c9a855-1279-4da2-8a9c-5be9bdb12e60', 'member', true, NOW(), NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', '9d63d0ee-deac-459e-9d9f-a31bc3b7438a', 'member', true, NOW(), NOW(), NOW()),
  ('ec24ea51-9a83-4db5-9ace-c8ca3026cb11', '593bb990-178e-4562-a0ee-3861af3566df', 'member', true, NOW(), NOW(), NOW()),
  ('387845d5-738d-43be-a680-0ff38d11e83e', '59eea718-1f14-47e2-8e44-1740789265a9', 'member', true, NOW(), NOW(), NOW()),
  ('d7048441-1005-4ba8-96e7-da0205b41012', '44b81616-6510-4eef-ad41-030e5e27746f', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', 'cee0c6ac-cd17-48c5-8124-150afe6f6aca', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', 'f5275b85-161b-4ff5-a7da-404b3c3ab694', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', '9b9211b0-16ef-45fb-9563-7fb9edacd7e1', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', '2583d715-1594-446b-a4fa-fe252699cbed', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', '2e92af8f-4298-42de-8e9c-c8711395bfd8', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', '74dcb90f-4825-461c-86a3-0b519dee850b', 'member', true, NOW(), NOW(), NOW()),
  ('b372b1ee-1d5c-436f-a674-97f029a027e2', '947db020-c7be-4f1f-b9a0-4ff95f28e410', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', 'ff2a5837-0f37-4e97-849e-8bd3c59c1831', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', 'c7cd28d5-c923-40c4-a97c-cf937297ccc7', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '733d66c8-4c27-464d-9ea8-57a6aa3edf63', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '1ca039ee-6322-4ad9-ae11-47d26fba4c0e', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '3c451671-bd59-453d-a105-b97b6570f490', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '1e530082-69f1-465a-99f8-9c6535454600', 'member', true, NOW(), NOW(), NOW()),
  ('3d9e8f00-9175-47e6-982c-eb39e420cbdd', 'd2181e3d-a625-4529-a5c1-6b7dd1cd1bf8', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '1d183bb7-00a5-46a6-b18c-c3d1e37e3e53', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', 'b2ecf9c9-ee37-47fa-bf47-2f5462a960a1', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', 'b720274e-61c1-4639-899c-3668f6c88395', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '8fdb0c28-d167-47d9-b1ec-1f67b51c6ae1', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '5be4f75a-f7fc-4e26-ac87-3fc4b82457b4', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '1b0b1745-e7f4-4f3f-9bf0-fe17aaf1f0a7', 'member', true, NOW(), NOW(), NOW()),
  ('6f344258-ab1d-4124-8d17-199b7f3c5ce8', '4765174c-04ba-44eb-a872-eb54a5bab757', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '37f94a1f-f838-4472-b4ff-85f893ab178b', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '3686bc6d-676a-4f2d-aa3c-f7fa548d83c5', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '39c6a97a-7233-480c-b2c1-0ea72e523f66', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '6dc15117-162a-4f0f-89af-433b94a41443', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '573cf339-9846-4532-bedf-912012441f6e', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'f5b25760-20b8-46b0-a5e9-9092e3738c9c', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'f01b04eb-510c-4f97-aace-501f22eedaa0', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'd7254250-b399-4e0c-a4a8-5490c08b3c2e', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '07acf1ea-4a56-44e6-b14e-892272025aab', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '7c39fa68-16d9-4d81-8b93-e030765867bd', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'f61679e2-f542-4501-8c95-5196dffad8be', 'member', true, NOW(), NOW(), NOW()),
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', '2429e2b0-7ff4-40cc-9820-d696fba75e67', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('6ab94b93-6a22-4568-9289-1ca48b8e77de', 'd9fb3eb5-d423-476c-a244-6abc66045ced', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '6e178d77-5086-4818-a8dc-4900d3f0a1f7', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '89a4c9e4-e572-4170-99a4-17c2d2d525e5', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'c52eaa91-68de-42fa-a013-3e3587eb30f1', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'f906fb5b-c006-4eb8-b611-d95ccc5a656c', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'ca9af605-82b9-49d1-9a3a-3dfe8d4e39dd', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'ac8ba817-99fc-4ce9-b6ae-c05cf24c734e', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '83b01a6f-1793-4ea2-8675-b3cfb238313a', 'member', true, NOW(), NOW(), NOW()),
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', 'e53c7db3-71fb-48fb-bf34-0f3c409f8e6d', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', 'fbc23906-6e54-44fd-ad0b-191cc5ec16ac', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '0feb7e8b-d47d-47d7-8f2b-356a0af42e44', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '4004c5db-f018-4ae7-8e1c-1de7c70b1e13', 'member', true, NOW(), NOW(), NOW()),
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', 'd3cc25b9-da87-4874-89bb-f1f0bfe68b45', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '15b1b44e-7f36-4ecc-baf7-dc5c4b206302', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '84fe10ae-30f8-4ef6-9ff2-1a5533cf5805', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '402e90e1-cf99-4fd2-9b15-e1af94d4c870', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', '536c10a1-b396-4bfa-a021-64b3ffce32d7', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', '62a84649-48e5-4f47-8e66-f122719e7053', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', 'f167aaba-c7ab-472c-929e-23900ef32adc', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', '3aab8ac4-0b71-40b2-8ea2-05543a30888f', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', '56ff6247-d004-4d67-b61f-0eec73bebce7', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '1b5b86bb-41f0-4637-a5d6-042d7bc9156d', 'member', true, NOW(), NOW(), NOW()),
  ('7296c780-8df4-4b4e-a1a1-255011940df7', '51aaa9de-8b6e-436a-81b8-296ea49edf47', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', '68fc3b64-dc4c-42aa-9cf0-655956ade02f', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', '3225be8c-c28e-4dc9-91fc-728645389835', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', '3c593c6d-fa78-44d1-bca8-61ec8950d720', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', 'aa2817c7-6feb-458e-9f93-268d486706b1', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', 'dd136826-7dbf-41ad-b470-dce83435dda5', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', 'd2cdd6b4-d84c-4ceb-b967-9bda9a9cf9f6', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', '54c38880-e4aa-443c-82bf-bf3c49bdf19e', 'member', true, NOW(), NOW(), NOW()),
  ('21046f9c-4650-4464-b03c-56685dd05f05', '98b8c569-1779-40e7-bb0f-cdfcc5aa7d0e', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '23d75e16-ce6e-476b-b624-2a9d9dc563d9', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '0f4f6c9d-f01d-4495-b32a-847033c6be51', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', 'bc160b73-a76e-4661-a8c4-d603abd4b3e8', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '4e6420da-e15f-4f57-a382-33b8087d3ba1', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', 'd30191e2-1ca2-4a9c-806a-e95de85f928a', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', 'a58e1ec3-c349-4070-9bd7-5262160bf225', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '99c0140e-f2a2-4220-bad1-92cedd84c1b4', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '64673857-86f0-4f2d-b382-7d79ac0cc9e4', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '5f3850a6-9122-486c-8ef2-c510a8e07482', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '4707a387-a30c-4de7-a44a-b5a5d0cabb2b', 'member', true, NOW(), NOW(), NOW()),
  ('3fcc5ca0-eb7b-4273-8feb-6a1745828970', '93be4682-0d50-4bdf-ab80-7297e7dc9b38', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', 'a7538234-f864-4ce2-ab7e-c00de6514b71', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', '4904d8bb-2747-4c5c-8a7f-9f1bdf044f40', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', 'b8125e80-3a58-487c-9f53-cb5bc49942cb', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', '50cf72e2-6c0d-4bfc-8d7c-bcb717eef95d', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', '28aef68f-54e4-4b3d-b5d3-89b3e9e594a7', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', 'b4d911bf-b6e7-4b7a-a24a-21c40b95c9a0', 'member', true, NOW(), NOW(), NOW()),
  ('b26ef61e-11a7-4cd4-9cca-53b3c9be69fb', '8a695c2d-a21e-499f-83e7-47b658e479e2', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '388a5f21-79ca-492e-9413-1431f95b4a08', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '1ac4b4c2-a2e3-48ad-942f-6ba6dc68b181', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '31597533-7a10-45ab-bb0e-b05b911b56c4', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '9da9807b-0523-4be3-8120-3cdf586586ee', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '8dfa8d48-5ce9-4089-a7e9-ee944e16114b', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '02f257e3-016d-42e5-9c71-1e5c552d13bf', 'member', true, NOW(), NOW(), NOW()),
  ('236663cd-3d58-4cc3-9d9e-2b35a29bd6d2', '3417d16e-6aeb-4e0c-b1ce-a2050c4a1586', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', '83801af4-a920-448c-88f3-7d4b37b89e74', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', '896f7499-70c3-4355-a772-6cdab3904b20', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', 'f01c8027-871c-4463-bd8f-d85ce87d15af', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', 'c5146d6d-2b5e-46e3-94a9-2ca8012c252a', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', '79ed1421-17e4-4ba2-82c9-b2c6fd15acb1', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', 'add286c4-4180-4a87-96ab-51c0ff7b98a1', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', '55a1432e-cd7f-4b61-b0b9-5baa16479038', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', '6f72a6c5-f900-4ca3-9ffb-88801412e123', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', 'e393860d-d65c-4d6e-9b48-a09a107efa4d', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', '403eaf2a-4d24-4853-aca6-d335bc8ea144', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', '1af7f002-dd76-492a-8ade-03b6e143ef96', 'member', true, NOW(), NOW(), NOW()),
  ('31f2a9cd-bf5d-4c19-b5d9-5b1de8e1ea01', '65434ec6-98e1-4673-8ada-30ad495ea1ea', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', '3ce0be46-d3ae-4a0a-8008-36745a8d3a09', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '0cc2a000-d56e-4029-b771-8d6427bafc54', 'member', true, NOW(), NOW(), NOW()),
  ('b88f8cc0-bd4f-423b-b1c4-145ec7a2c6f7', '085fc6c0-b864-4ae2-b15a-621f83dcde54', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', '14189d63-16b9-40aa-b4d4-0eba799ef69c', 'member', true, NOW(), NOW(), NOW()),
  ('d723885e-fa1e-4ee5-913c-489f62280d9f', 'd634218e-4f90-415b-b008-fba1f0123fe2', 'member', true, NOW(), NOW(), NOW()),
  ('8d2337cc-e485-43de-ad29-e26061ef5684', '06b45fb2-8378-4a45-b50b-a2adb41fe558', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', '9d42685b-dc8a-47fb-9425-f38680c6c355', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', 'd7e10e61-f2b9-462d-9303-7c9c026d7afa', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', 'f2f63780-38a8-454a-85d9-77c229d7e3fd', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', 'df56d2aa-cf74-41d2-8b83-067b0dd5e7cb', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', 'ec186315-8ab6-4b73-b17e-d1638db37b66', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', '4fab77b5-5a9f-4d36-bac0-bf5a8a601915', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', '443aca57-7a0b-4832-b162-05efcff93b52', 'member', true, NOW(), NOW(), NOW()),
  ('f80cc419-41bf-4354-9bdc-caf0137c01e6', '1306f4a7-799c-4ecc-b32c-0c1592b54072', 'member', true, NOW(), NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', 'd305b09f-5f7d-4c16-b535-2dd94b1e58b1', 'member', true, NOW(), NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', '74d1ab02-faa6-41e5-b2e5-15134c98c490', 'member', true, NOW(), NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', 'bad64c63-1394-45af-ae28-a1f4e8287500', 'member', true, NOW(), NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', '80ebbef4-3f53-4513-a1d2-a621912eaa70', 'member', true, NOW(), NOW(), NOW()),
  ('e25f87e2-78d2-4493-961a-eb83ced7524b', 'fe591972-eef9-4c24-a92a-2b0197077036', 'member', true, NOW(), NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', 'c62ad1dd-66fb-4168-9062-15ad32753e02', 'member', true, NOW(), NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', '48ba7ce6-3f72-4978-899c-793a8781697c', 'member', true, NOW(), NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', 'feed6976-501a-46ca-bb50-c244efb0ceca', 'member', true, NOW(), NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', '9032a3c3-b012-4f36-a406-b661b694d652', 'member', true, NOW(), NOW(), NOW()),
  ('0ffea819-f528-4340-90bc-ef516963b5ff', 'a5e33cd9-c323-4698-9cc5-639c139f890c', 'member', true, NOW(), NOW(), NOW()),
  ('f72a514b-78cb-4903-b36f-9b73a64020d9', '237fa8ce-d83d-462d-a697-157de31c04a8', 'member', true, NOW(), NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', '97f3057c-2789-4124-9513-62e9c4f9b2eb', 'member', true, NOW(), NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', 'eacc4400-40a1-4216-a8d4-120d79acf305', 'member', true, NOW(), NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', '09b726ad-aad2-48c5-a68b-118abd59dcf5', 'member', true, NOW(), NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', 'bbcbf016-f77c-42b8-9cc9-3f5c580fb4d3', 'member', true, NOW(), NOW(), NOW()),
  ('74c4f183-6874-475d-838d-4a62a4337178', '0cf8b66f-af00-4d9c-a2a4-c772d865369d', 'member', true, NOW(), NOW(), NOW()),
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', 'e6dfffc6-9518-4dfc-a24f-6545205b6a63', 'member', true, NOW(), NOW(), NOW()),
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', 'c5c42c67-05c3-4b4c-b24d-8fc76f10b019', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
  ('5405a406-3df9-4e53-94e7-ef7d4a78449f', '23df1e8f-9851-4eb5-a9e7-f54d63e03cd9', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', 'fff2c8d0-2296-4a57-84a4-3a5a10c997b8', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '47a10ffe-f882-4f2d-beee-e836c0019d7a', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '67ae9bd9-2129-44b3-817b-d00356d33a79', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', 'd9474161-7808-499c-a649-6a568c55ffc7', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '28e23586-928d-484b-876a-19865d5d92ef', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '900aee34-0108-4a84-9334-2435e87d020e', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '81b173f1-a080-4ff7-a1d1-2b959cbb7fe7', 'member', true, NOW(), NOW(), NOW()),
  ('4151ffff-fe2d-4a91-aac2-2e92db9de828', '4b887587-8f92-4c45-9660-65f071d6073b', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'b528382b-fd3e-44fc-a5c4-6a7ddad0f200', 'member', true, NOW(), NOW(), NOW()),
  ('355eb4f0-6583-4102-94e8-e92eda272a5b', 'ac7ed5b0-7e2c-4f68-a17c-2e4cb0630d42', 'member', true, NOW(), NOW(), NOW())
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ========================
-- JERARQUÍA DE SUPERVISORES (4 coordinadores + 95 del sheet DATOS SUPERVISORES)
-- ========================
-- María del Valle Ollarves | nivel 4 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9507199', 'María del Valle', 'Ollarves', '04121603266', '', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'coordinadora.ollarves@sionerp.local') THEN '9507199@sionerp.local' ELSE 'coordinadora.ollarves@sionerp.local' END, 'server', false, NULL, NULL, 4, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9507199');
UPDATE public.users SET
  discipleship_level = 4, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '04121603266' ELSE phone END,
  address = CASE WHEN address = '' THEN '' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR false, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9507199';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 4, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9507199'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 4, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- Alilia Josefina Sánchez de Gómez | nivel 4 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7356713', 'Alilia Josefina', 'Sánchez de Gómez', '04126815571', 'Calle Ralcocer, Casco Histórico, Coro, Parroquia San Gabriel, Municipio Miranda, Estado Falcón, Venezuela', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'alilia@gmail.com') THEN '7356713@sionerp.local' ELSE 'alilia@gmail.com' END, 'server', false, NULL, NULL, 4, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7356713');
UPDATE public.users SET
  discipleship_level = 4, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04126815571' ELSE phone END,
  address = CASE WHEN address = '' THEN 'Calle Ralcocer, Casco Histórico, Coro, Parroquia San Gabriel, Municipio Miranda, Estado Falcón, Venezuela' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR false, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7356713';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 4, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7356713'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 4, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- Ruthdy Esther Lameda Gómez | nivel 4 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '16709124', 'Ruthdy Esther', 'Lameda Gómez', '04120601377', '', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'coordinadora.lameda@sionerp.local') THEN '16709124@sionerp.local' ELSE 'coordinadora.lameda@sionerp.local' END, 'server', false, NULL, NULL, 4, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16709124');
UPDATE public.users SET
  discipleship_level = 4, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '04120601377' ELSE phone END,
  address = CASE WHEN address = '' THEN '' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR false, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '16709124';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 4, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16709124'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 4, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- Elvis Rafael Laguna Medina | nivel 4 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '19617387', 'Elvis Rafael', 'Laguna Medina', '04246327629', '', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'coordinador.laguna@sionerp.local') THEN '19617387@sionerp.local' ELSE 'coordinador.laguna@sionerp.local' END, 'server', false, NULL, NULL, 4, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19617387');
UPDATE public.users SET
  discipleship_level = 4, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '04246327629' ELSE phone END,
  address = CASE WHEN address = '' THEN '' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR false, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '19617387';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 4, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19617387'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 4, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ZULEIMA DEL VALLE MAIMO DIAZ | nivel 3 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9521496', 'ZULEIMA DEL VALLE', 'MAIMO DIAZ', '4141645370', 'CALLE COLON ENTRE LIBERTAD Y MONZON N 65-1', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'vallemaimo@gmail.com') THEN '9521496@sionerp.local' ELSE 'vallemaimo@gmail.com' END, 'server', true, '2013-11-13', '1967-01-09', 3, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9521496');
UPDATE public.users SET
  discipleship_level = 3, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4141645370' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE COLON ENTRE LIBERTAD Y MONZON N 65-1' ELSE address END,
  birth_date   = COALESCE(birth_date, '1967-01-09'),
  baptism_date = COALESCE(baptism_date, '2013-11-13'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9521496';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 3, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9521496'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 3, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- CLENNY DEL VALLE SIRA ORIA | nivel 2 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '13202178', 'CLENNY DEL VALLE', 'SIRA ORIA', '4127899614', 'URB. VELITA 4 AV. 1 N 30', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '13202178@sionerp.local') THEN '13202178@sionerp.local' ELSE '13202178@sionerp.local' END, 'server', true, '2014-07-27', '1975-08-13', 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13202178');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4127899614' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. VELITA 4 AV. 1 N 30' ELSE address END,
  birth_date   = COALESCE(birth_date, '1975-08-13'),
  baptism_date = COALESCE(baptism_date, '2014-07-27'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '13202178';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13202178'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- JOSE GREGORIO FERRER PAZ | nivel 2 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12588794', 'JOSE GREGORIO', 'FERRER PAZ', '4128480073', 'CALLE COLON N 91 ENTRE DEMOCRACUA Y SOL, CURAZAITO', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'dabajuro1973@gmail.com') THEN '12588794@sionerp.local' ELSE 'dabajuro1973@gmail.com' END, 'server', true, '1994-12-05', '1973-12-20', 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12588794');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4128480073' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE COLON N 91 ENTRE DEMOCRACUA Y SOL, CURAZAITO' ELSE address END,
  birth_date   = COALESCE(birth_date, '1973-12-20'),
  baptism_date = COALESCE(baptism_date, '1994-12-05'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12588794';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12588794'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- EDGAR CHIRINOS | nivel 2 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12733299', 'EDGAR', 'CHIRINOS', '', 'CASTULO MARMOL FERRER CALLE PPAL', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'edgarchirino879@gmail.com') THEN '12733299@sionerp.local' ELSE 'edgarchirino879@gmail.com' END, 'server', true, '1901-02-27', '1973-10-07', 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12733299');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CASTULO MARMOL FERRER CALLE PPAL' ELSE address END,
  birth_date   = COALESCE(birth_date, '1973-10-07'),
  baptism_date = COALESCE(baptism_date, '1901-02-27'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12733299';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12733299'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- REIMAR BRIZUELA | nivel 2 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25945469', 'REIMAR', 'BRIZUELA', '4246849574', 'Urb. Cruz Verde, vereda 14', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'reymarbrizuela@gmail.com') THEN '25945469@sionerp.local' ELSE 'reymarbrizuela@gmail.com' END, 'server', true, '2015-03-15', '1996-07-18', 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25945469');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4246849574' ELSE phone END,
  address = CASE WHEN address = '' THEN 'Urb. Cruz Verde, vereda 14' ELSE address END,
  birth_date   = COALESCE(birth_date, '1996-07-18'),
  baptism_date = COALESCE(baptism_date, '2015-03-15'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25945469';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25945469'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- ROSMARY QUERO | nivel 2 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12734324', 'ROSMARY', 'QUERO', '4161122446', 'SECTOR 28 DE JULIO CALLE BOGOTA C/C PALMASOLA Y LA PAZ', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'rossantil18@gmail.com') THEN '12734324@sionerp.local' ELSE 'rossantil18@gmail.com' END, 'server', true, '2010-10-01', '1976-09-18', 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12734324');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4161122446' ELSE phone END,
  address = CASE WHEN address = '' THEN 'SECTOR 28 DE JULIO CALLE BOGOTA C/C PALMASOLA Y LA PAZ' ELSE address END,
  birth_date   = COALESCE(birth_date, '1976-09-18'),
  baptism_date = COALESCE(baptism_date, '2010-10-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12734324';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12734324'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- JESÚS ALEXANDER PIÑEREZ ZAVALA | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '13496864', 'JESÚS ALEXANDER', 'PIÑEREZ ZAVALA', '4122802712', 'PUEBLO NUEVO CALLE BUCHIVACOA ENTRE SUCRE Y MARA N 24', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'alexlaley13@gmail.com') THEN '13496864@sionerp.local' ELSE 'alexlaley13@gmail.com' END, 'server', true, '2014-07-27', '1977-07-23', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13496864');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4122802712' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PUEBLO NUEVO CALLE BUCHIVACOA ENTRE SUCRE Y MARA N 24' ELSE address END,
  birth_date   = COALESCE(birth_date, '1977-07-23'),
  baptism_date = COALESCE(baptism_date, '2014-07-27'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '13496864';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13496864'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- YILEINA ENCARNACIÓN JIMÉNEZ DÍAZ | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7497122', 'YILEINA ENCARNACIÓN', 'JIMÉNEZ DÍAZ', '4146800428', '', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yileinajdiaz@gmail.com') THEN '7497122@sionerp.local' ELSE 'yileinajdiaz@gmail.com' END, 'server', true, NULL, '1962-05-22', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7497122');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4146800428' ELSE phone END,
  address = CASE WHEN address = '' THEN '' ELSE address END,
  birth_date   = COALESCE(birth_date, '1962-05-22'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7497122';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7497122'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- YASMIRA LISBETH MARTINEZ | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '15777250', 'YASMIRA LISBETH', 'MARTINEZ', '', 'PARCELMAIENTO CASTULO MARMOL FERRER', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '2021gerardo.20@gmail.com') THEN '15777250@sionerp.local' ELSE '2021gerardo.20@gmail.com' END, 'server', true, '2018-04-29', '1981-10-01', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15777250');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PARCELMAIENTO CASTULO MARMOL FERRER' ELSE address END,
  birth_date   = COALESCE(birth_date, '1981-10-01'),
  baptism_date = COALESCE(baptism_date, '2018-04-29'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '15777250';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15777250'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- NOHEMI MARGARITA LUGO | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7499576', 'NOHEMI MARGARITA', 'LUGO', '4129540953', 'CALLE LIBERTAD CON LEON FARIAS', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '7499576@sionerp.local') THEN '7499576@sionerp.local' ELSE '7499576@sionerp.local' END, 'server', true, NULL, '1963-07-30', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7499576');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4129540953' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE LIBERTAD CON LEON FARIAS' ELSE address END,
  birth_date   = COALESCE(birth_date, '1963-07-30'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7499576';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7499576'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- ISMARY GÓMEZ | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '20295113', 'ISMARY', 'GÓMEZ', '4246476469', 'CALLE COLON ENTRE MONZON Y LIBERTAD', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ismaridesibada@gmail.com') THEN '20295113@sionerp.local' ELSE 'ismaridesibada@gmail.com' END, 'server', true, NULL, '1988-03-23', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20295113');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4246476469' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE COLON ENTRE MONZON Y LIBERTAD' ELSE address END,
  birth_date   = COALESCE(birth_date, '1988-03-23'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '20295113';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20295113'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- ROSA COLINA | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11474700', 'ROSA', 'COLINA', '', 'CALLE MONZON N 93 ENTRE FEDERACION Y COLON', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '11474700@sionerp.local') THEN '11474700@sionerp.local' ELSE '11474700@sionerp.local' END, 'server', true, '2007-05-15', '1969-10-24', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11474700');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE MONZON N 93 ENTRE FEDERACION Y COLON' ELSE address END,
  birth_date   = COALESCE(birth_date, '1969-10-24'),
  baptism_date = COALESCE(baptism_date, '2007-05-15'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11474700';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11474700'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- JOCSIMAR JEANNETTE DE LA CHIQUINQUIRA GARCÍA GÓMEZ | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '32148887', 'JOCSIMAR JEANNETTE DE LA CHIQUINQUIRA', 'GARCÍA GÓMEZ', '4121257457', 'CALLE MILLAR ENTRE BRION Y NUEVA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'jocsymar1010@gmail.com') THEN '32148887@sionerp.local' ELSE 'jocsymar1010@gmail.com' END, 'server', true, '2024-03-29', '2006-11-18', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '32148887');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4121257457' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE MILLAR ENTRE BRION Y NUEVA' ELSE address END,
  birth_date   = COALESCE(birth_date, '2006-11-18'),
  baptism_date = COALESCE(baptism_date, '2024-03-29'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '32148887';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '32148887'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- MARITZA SOTO | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '74803239', 'MARITZA', 'SOTO', '4146885206', 'CALLE EL TENIS CASA # 52', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '74803239@sionerp.local') THEN '74803239@sionerp.local' ELSE '74803239@sionerp.local' END, 'server', true, '1980-08-01', '1962-07-03', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '74803239');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4146885206' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE EL TENIS CASA # 52' ELSE address END,
  birth_date   = COALESCE(birth_date, '1962-07-03'),
  baptism_date = COALESCE(baptism_date, '1980-08-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '74803239';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '74803239'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- MIGDALIA GARCÍA | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12735725', 'MIGDALIA', 'GARCÍA', '4246468024', 'CALLE PROYECTO CON PALMASOLA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'migdaliag26g@gmail.com') THEN '12735725@sionerp.local' ELSE 'migdaliag26g@gmail.com' END, 'server', true, '2012-04-16', '1974-12-26', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12735725');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4246468024' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE PROYECTO CON PALMASOLA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1974-12-26'),
  baptism_date = COALESCE(baptism_date, '2012-04-16'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12735725';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12735725'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- LUIS DANIEL GARCÍA | nivel 1 | OESTE 1
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '21113689', 'LUIS DANIEL', 'GARCÍA', '4126853823', 'UCV. SECTOR 5 V14 N 11', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'luigy2410@gmail.com') THEN '21113689@sionerp.local' ELSE 'luigy2410@gmail.com' END, 'server', true, '2006-05-21', '1991-10-24', 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '21113689');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 1', zone_id = 'c0000001-0000-0000-0000-000000000001',
  phone   = CASE WHEN phone = '' THEN '4126853823' ELSE phone END,
  address = CASE WHEN address = '' THEN 'UCV. SECTOR 5 V14 N 11' ELSE address END,
  birth_date   = COALESCE(birth_date, '1991-10-24'),
  baptism_date = COALESCE(baptism_date, '2006-05-21'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '21113689';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000001-0000-0000-0000-000000000001', 'OESTE 1', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '21113689'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000001-0000-0000-0000-000000000001', zone_name = 'OESTE 1', updated_at = NOW();

-- CRIZALIDA MARGARITA SANCHEZ GONZALEZ | nivel 3 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9923269', 'CRIZALIDA MARGARITA', 'SANCHEZ GONZALEZ', '04246542038', 'URB. LAS EUGENIAS 6TA ETAPA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'crizalidamariposa71@gmail.com') THEN '9923269@sionerp.local' ELSE 'crizalidamariposa71@gmail.com' END, 'server', true, '2005-06-03', '1967-08-27', 3, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9923269');
UPDATE public.users SET
  discipleship_level = 3, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246542038' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. LAS EUGENIAS 6TA ETAPA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1967-08-27'),
  baptism_date = COALESCE(baptism_date, '2005-06-03'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9923269';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 3, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9923269'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 3, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JOSEFINA VARGAS GUTIÉRREZ | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11140668', 'JOSEFINA', 'VARGAS GUTIÉRREZ', '4246043933', 'PARCELAMIENTO CRUZ VERDE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'finavargas.2020@gmail.com') THEN '11140668@sionerp.local' ELSE 'finavargas.2020@gmail.com' END, 'server', true, NULL, '1969-03-12', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11140668');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246043933' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PARCELAMIENTO CRUZ VERDE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1969-03-12'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11140668';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11140668'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- OSIRIS EMILIA VENTURA | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7497207', 'OSIRIS EMILIA', 'VENTURA', '4246825093', 'CALLE MONZON CON AV. SUCRE LA FLORIDA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'osirisemiliaventuravelasquez@gmail.com') THEN '7497207@sionerp.local' ELSE 'osirisemiliaventuravelasquez@gmail.com' END, 'server', true, '2008-07-20', '1963-09-16', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7497207');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246825093' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE MONZON CON AV. SUCRE LA FLORIDA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1963-09-16'),
  baptism_date = COALESCE(baptism_date, '2008-07-20'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7497207';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7497207'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- CARMEN JULIA COLINA MORA | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11805120', 'CARMEN JULIA', 'COLINA MORA', '4124490374', 'URB. EL ENCANTO CALLE 1', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'carmencolinamora@gmail.com') THEN '11805120@sionerp.local' ELSE 'carmencolinamora@gmail.com' END, 'server', true, '1996-11-16', '1974-09-11', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11805120');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4124490374' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. EL ENCANTO CALLE 1' ELSE address END,
  birth_date   = COALESCE(birth_date, '1974-09-11'),
  baptism_date = COALESCE(baptism_date, '1996-11-16'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11805120';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11805120'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- DAILY COROMOTO PIÑA CASTRO | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9930073', 'DAILY COROMOTO', 'PIÑA CASTRO', '4140708092', 'U.C.V CALLE 11 SECTOR 8', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'dailycastro@gmail.com') THEN '9930073@sionerp.local' ELSE 'dailycastro@gmail.com' END, 'server', true, '2006-06-03', '1967-07-01', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9930073');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4140708092' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 11 SECTOR 8' ELSE address END,
  birth_date   = COALESCE(birth_date, '1967-07-01'),
  baptism_date = COALESCE(baptism_date, '2006-06-03'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9930073';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9930073'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ROSA RAMONA VERGARA ACOSTA | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9520759', 'ROSA RAMONA', 'VERGARA ACOSTA', '4126893572', 'URB.  LAS EUGENIAS 5 ETP CALLE 10 Nº10', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'drosavergara@gmail.com') THEN '9520759@sionerp.local' ELSE 'drosavergara@gmail.com' END, 'server', true, '1999-04-05', '1965-11-02', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9520759');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4126893572' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB.  LAS EUGENIAS 5 ETP CALLE 10 Nº10' ELSE address END,
  birth_date   = COALESCE(birth_date, '1965-11-02'),
  baptism_date = COALESCE(baptism_date, '1999-04-05'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9520759';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9520759'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ANA DUBIZ HERNANDEZ GARCIA | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14397236', 'ANA DUBIZ', 'HERNANDEZ GARCIA', '04146508082', 'CALLE NUEVANº15', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'dubiz2012@gmail.com') THEN '14397236@sionerp.local' ELSE 'dubiz2012@gmail.com' END, 'server', true, '2020-12-20', '1977-05-28', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14397236');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04146508082' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE NUEVANº15' ELSE address END,
  birth_date   = COALESCE(birth_date, '1977-05-28'),
  baptism_date = COALESCE(baptism_date, '2020-12-20'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14397236';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14397236'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ELEIDA ESTHER DIAZ QUEIPO | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '15917326', 'ELEIDA ESTHER', 'DIAZ QUEIPO', '04129616324', 'U.C.V CALLE 4 SECTOR 4 Nº20', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'eleunidiaz@gmail.com') THEN '15917326@sionerp.local' ELSE 'eleunidiaz@gmail.com' END, 'server', true, '2002-12-01', '1984-02-13', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15917326');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04129616324' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 4 SECTOR 4 Nº20' ELSE address END,
  birth_date   = COALESCE(birth_date, '1984-02-13'),
  baptism_date = COALESCE(baptism_date, '2002-12-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '15917326';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15917326'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- YONELA COROMOTO SÁNCHEZ | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14490743', 'YONELA COROMOTO', 'SÁNCHEZ', '04246949022', 'U.C.V CALLE 19 S/7 V/8 Nº2', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'sanchezyonela@gmail.com') THEN '14490743@sionerp.local' ELSE 'sanchezyonela@gmail.com' END, 'server', true, '1997-01-01', '1979-04-02', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14490743');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246949022' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 19 S/7 V/8 Nº2' ELSE address END,
  birth_date   = COALESCE(birth_date, '1979-04-02'),
  baptism_date = COALESCE(baptism_date, '1997-01-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14490743';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14490743'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- RITA DEL CARMEN GUTIERREZ SALGUEIRO | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12180101', 'RITA DEL CARMEN', 'GUTIERREZ SALGUEIRO', '4124288847', 'URB. LIBERTADORES DE AMERICA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ritagutierrez281@gmail.com') THEN '12180101@sionerp.local' ELSE 'ritagutierrez281@gmail.com' END, 'server', true, NULL, '1973-02-13', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12180101');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4124288847' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. LIBERTADORES DE AMERICA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1973-02-13'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12180101';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12180101'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JUDITH CAZOLA | nivel 2 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9925972', 'JUDITH', 'CAZOLA', '04120763772', 'URB.SANTA MARIA AV 2. #6', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'judithcasola@gmail.com') THEN '9925972@sionerp.local' ELSE 'judithcasola@gmail.com' END, 'server', true, '2010-02-26', '1970-04-25', 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9925972');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04120763772' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB.SANTA MARIA AV 2. #6' ELSE address END,
  birth_date   = COALESCE(birth_date, '1970-04-25'),
  baptism_date = COALESCE(baptism_date, '2010-02-26'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9925972';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9925972'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ALEXIS JOSÉ GUTIERREZ MIQUILENA | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '20680940', 'ALEXIS JOSÉ', 'GUTIERREZ MIQUILENA', '4121271019', 'SECTOR CRUZ VERDE, CALLE COLOMBIA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '20680940@sionerp.local') THEN '20680940@sionerp.local' ELSE '20680940@sionerp.local' END, 'server', true, '2010-10-01', '1991-06-02', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20680940');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4121271019' ELSE phone END,
  address = CASE WHEN address = '' THEN 'SECTOR CRUZ VERDE, CALLE COLOMBIA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1991-06-02'),
  baptism_date = COALESCE(baptism_date, '2010-10-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '20680940';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20680940'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- YOANA JESUS MOLINA CHIRINO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14794089', 'YOANA JESUS', 'MOLINA CHIRINO', '4246100576', 'PARCELAMIENTO CRUZ VERDE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yihanamolina@gmail.com') THEN '14794089@sionerp.local' ELSE 'yihanamolina@gmail.com' END, 'server', true, '2016-06-01', '1981-12-06', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14794089');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246100576' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PARCELAMIENTO CRUZ VERDE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1981-12-06'),
  baptism_date = COALESCE(baptism_date, '2016-06-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14794089';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14794089'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JOSE JULIAN LARA CATARI | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '26991221', 'JOSE JULIAN', 'LARA CATARI', '4120666576', 'UCV CALLE 2, SECTOR 3 N 20', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'josejulianlaracatari@gmail.com') THEN '26991221@sionerp.local' ELSE 'josejulianlaracatari@gmail.com' END, 'server', true, '2015-12-05', '1999-07-22', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '26991221');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4120666576' ELSE phone END,
  address = CASE WHEN address = '' THEN 'UCV CALLE 2, SECTOR 3 N 20' ELSE address END,
  birth_date   = COALESCE(birth_date, '1999-07-22'),
  baptism_date = COALESCE(baptism_date, '2015-12-05'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '26991221';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '26991221'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ELIZABETH DEL VALLE HERNANDEZ | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '16520887', 'ELIZABETH DEL VALLE', 'HERNANDEZ', '4129793831', 'CALLE CHURUGUARA CON AV. SUCRE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'eliedi1984@gmail.com') THEN '16520887@sionerp.local' ELSE 'eliedi1984@gmail.com' END, 'server', true, '2017-12-24', '1984-02-17', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16520887');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4129793831' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE CHURUGUARA CON AV. SUCRE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1984-02-17'),
  baptism_date = COALESCE(baptism_date, '2017-12-24'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '16520887';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16520887'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- MIRIAN MARBELLA MIQUILENA ARGUELLOS | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9925776', 'MIRIAN MARBELLA', 'MIQUILENA ARGUELLOS', '4246124754', 'CALLE COLOMBIA, BARRIO CRUZ VERDE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'mirianmiquilena2@gmail.com') THEN '9925776@sionerp.local' ELSE 'mirianmiquilena2@gmail.com' END, 'server', true, '2013-05-26', '1969-03-25', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9925776');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246124754' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE COLOMBIA, BARRIO CRUZ VERDE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1969-03-25'),
  baptism_date = COALESCE(baptism_date, '2013-05-26'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9925776';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9925776'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- INDRA VALENTINA RUJANA FERRER | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14027295', 'INDRA VALENTINA', 'RUJANA FERRER', '4246225784', 'CALLE NUEVA N 11 LA FLORIDA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'indraruja76@gmail.com') THEN '14027295@sionerp.local' ELSE 'indraruja76@gmail.com' END, 'server', true, NULL, '1976-05-07', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14027295');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246225784' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE NUEVA N 11 LA FLORIDA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1976-05-07'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14027295';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14027295'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- MARLENE JOSEFINA VILLAVICENCIO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '10705661', 'MARLENE JOSEFINA', 'VILLAVICENCIO', '4126828144', 'CALLE EL SOL CON AV. SUCRE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'jv1781721@gmail.com') THEN '10705661@sionerp.local' ELSE 'jv1781721@gmail.com' END, 'server', true, NULL, '1967-02-15', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10705661');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4126828144' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE EL SOL CON AV. SUCRE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1967-02-15'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '10705661';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10705661'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- NILZA JOSEFINA RAMIREZ BRAVO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11293157', 'NILZA JOSEFINA', 'RAMIREZ BRAVO', '4126817143', 'URB. EL BOSQUE CALLE 3', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'nilzajramirezb@gmail.com') THEN '11293157@sionerp.local' ELSE 'nilzajramirezb@gmail.com' END, 'server', true, '2021-12-04', '1971-10-19', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11293157');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4126817143' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. EL BOSQUE CALLE 3' ELSE address END,
  birth_date   = COALESCE(birth_date, '1971-10-19'),
  baptism_date = COALESCE(baptism_date, '2021-12-04'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11293157';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11293157'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ENMANUEL JESUS GARCIA CHIRINO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25784232', 'ENMANUEL JESUS', 'GARCIA CHIRINO', '4246008461', 'UCV', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'enmanueljg163@gmail.com') THEN '25784232@sionerp.local' ELSE 'enmanueljg163@gmail.com' END, 'server', true, NULL, '1995-03-19', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25784232');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4246008461' ELSE phone END,
  address = CASE WHEN address = '' THEN 'UCV' ELSE address END,
  birth_date   = COALESCE(birth_date, '1995-03-19'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25784232';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25784232'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- DANIEL JOSUE AGÜERO SUAREZ | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14792185', 'DANIEL JOSUE', 'AGÜERO SUAREZ', '4126308707', 'UVC CALLE 11 SECTOR 8 N 41', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'visipoldaniel@gmail.com') THEN '14792185@sionerp.local' ELSE 'visipoldaniel@gmail.com' END, 'server', true, '2011-01-12', '1979-03-02', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14792185');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4126308707' ELSE phone END,
  address = CASE WHEN address = '' THEN 'UVC CALLE 11 SECTOR 8 N 41' ELSE address END,
  birth_date   = COALESCE(birth_date, '1979-03-02'),
  baptism_date = COALESCE(baptism_date, '2011-01-12'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14792185';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14792185'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- NORMEDY LOURDES RAMIREZ DE GARCIA | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '15238321', 'NORMEDY LOURDES', 'RAMIREZ DE GARCIA', '4120744042', 'VELITA 2 CALLE 25', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'normedydegarcia@gmail.com') THEN '15238321@sionerp.local' ELSE 'normedydegarcia@gmail.com' END, 'server', true, '2007-10-01', '1981-04-13', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15238321');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '4120744042' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 2 CALLE 25' ELSE address END,
  birth_date   = COALESCE(birth_date, '1981-04-13'),
  baptism_date = COALESCE(baptism_date, '2007-10-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '15238321';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15238321'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JANIS  DEL  VALLE ESPINOZA DE PEREIRA | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11139547', 'JANIS  DEL  VALLE', 'ESPINOZA DE PEREIRA', '', 'URB. FRANCISCO  DE MIRANDA CALLE 7 M/7 Nº11', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'juniesponoza@gmail.com') THEN '11139547@sionerp.local' ELSE 'juniesponoza@gmail.com' END, 'server', false, NULL, NULL, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11139547');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. FRANCISCO  DE MIRANDA CALLE 7 M/7 Nº11' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR false, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11139547';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11139547'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JOSUE DAVID ARIAS | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25370891', 'JOSUE DAVID', 'ARIAS', '04264885578', 'URB.  ARISTIDES CALVAN  CALLE 9 5ETPA Nº22', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ariasjosue25@gmail.com') THEN '25370891@sionerp.local' ELSE 'ariasjosue25@gmail.com' END, 'server', true, '2011-12-11', '1997-07-23', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25370891');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04264885578' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB.  ARISTIDES CALVAN  CALLE 9 5ETPA Nº22' ELSE address END,
  birth_date   = COALESCE(birth_date, '1997-07-23'),
  baptism_date = COALESCE(baptism_date, '2011-12-11'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25370891';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25370891'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- LIGIA GREGORIA HERNANDEZ | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9503112', 'LIGIA GREGORIA', 'HERNANDEZ', '04246682116', 'ARISTIDES CALVANI C/1 Nº9', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ligiagregoriahernandez@gmail.com') THEN '9503112@sionerp.local' ELSE 'ligiagregoriahernandez@gmail.com' END, 'server', true, '1990-04-30', '1963-08-15', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9503112');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246682116' ELSE phone END,
  address = CASE WHEN address = '' THEN 'ARISTIDES CALVANI C/1 Nº9' ELSE address END,
  birth_date   = COALESCE(birth_date, '1963-08-15'),
  baptism_date = COALESCE(baptism_date, '1990-04-30'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9503112';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9503112'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- DORALIS  YAJAIRA PALMO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12184131', 'DORALIS  YAJAIRA', 'PALMO', '04146279237', 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº5', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'doralispalmo@hotmail.com') THEN '12184131@sionerp.local' ELSE 'doralispalmo@hotmail.com' END, 'server', true, '1991-03-15', '1975-09-04', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12184131');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04146279237' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB FRANCISCO  DE MIRANDA CALLE  6 Nº5' ELSE address END,
  birth_date   = COALESCE(birth_date, '1975-09-04'),
  baptism_date = COALESCE(baptism_date, '1991-03-15'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12184131';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12184131'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JOSIERIKA SINAI BRAVO IGLESIAS | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25371060', 'JOSIERIKA SINAI', 'BRAVO IGLESIAS', '04127855587', 'URB FRANCISCO  DE MIRANDA CALLE  13 Nº120', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'josierikabravo@gmail.com') THEN '25371060@sionerp.local' ELSE 'josierikabravo@gmail.com' END, 'server', true, '2013-03-21', '1997-01-15', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25371060');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04127855587' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB FRANCISCO  DE MIRANDA CALLE  13 Nº120' ELSE address END,
  birth_date   = COALESCE(birth_date, '1997-01-15'),
  baptism_date = COALESCE(baptism_date, '2013-03-21'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25371060';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25371060'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ALCIFREDO ANTONIO OCANDO  RIVERO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7478667', 'ALCIFREDO ANTONIO', 'OCANDO  RIVERO', '04126866853', 'RES.  POLICIAL JOSEFA  C CALLE 2 Nº14', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'alcifredo747@gmail.com') THEN '7478667@sionerp.local' ELSE 'alcifredo747@gmail.com' END, 'server', true, '2014-07-07', '1996-07-17', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7478667');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04126866853' ELSE phone END,
  address = CASE WHEN address = '' THEN 'RES.  POLICIAL JOSEFA  C CALLE 2 Nº14' ELSE address END,
  birth_date   = COALESCE(birth_date, '1996-07-17'),
  baptism_date = COALESCE(baptism_date, '2014-07-07'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7478667';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7478667'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- ANA DEL CARMEN SUAREZ PEROZO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9529125', 'ANA DEL CARMEN', 'SUAREZ PEROZO', '04246896871', 'U.C.V S/2 c/5', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'anasuarezperozo40@gmail.com') THEN '9529125@sionerp.local' ELSE 'anasuarezperozo40@gmail.com' END, 'server', true, NULL, '1966-11-13', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9529125');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246896871' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V S/2 c/5' ELSE address END,
  birth_date   = COALESCE(birth_date, '1966-11-13'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9529125';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9529125'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- MARYORIS TEODORA ARIAS MANZANO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '10705286', 'MARYORIS TEODORA', 'ARIAS MANZANO', '04161292117', 'U.C.V CALLE 9 S/4 Nº3', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ariasmaryoris@gmail.com') THEN '10705286@sionerp.local' ELSE 'ariasmaryoris@gmail.com' END, 'server', true, NULL, '1971-05-12', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10705286');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04161292117' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 9 S/4 Nº3' ELSE address END,
  birth_date   = COALESCE(birth_date, '1971-05-12'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '10705286';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10705286'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- XIOMARA JOSEFINA SANCHEZ CHIRINOS | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9517319', 'XIOMARA JOSEFINA', 'SANCHEZ CHIRINOS', '04246327926', 'U.C.V CALLE 2 S/5 Nº32', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'no@gmail.com') THEN '9517319@sionerp.local' ELSE 'no@gmail.com' END, 'server', true, NULL, '1968-04-01', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9517319');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246327926' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 2 S/5 Nº32' ELSE address END,
  birth_date   = COALESCE(birth_date, '1968-04-01'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9517319';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9517319'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- WILMER TADEO MORALES SIRAX | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '19253822', 'WILMER TADEO', 'MORALES SIRAX', '04121023323', 'U.C.V B/14 A-02-04', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'willmorales149@gmail.com') THEN '19253822@sionerp.local' ELSE 'willmorales149@gmail.com' END, 'server', true, '2013-02-03', '1989-04-01', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19253822');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04121023323' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V B/14 A-02-04' ELSE address END,
  birth_date   = COALESCE(birth_date, '1989-04-01'),
  baptism_date = COALESCE(baptism_date, '2013-02-03'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '19253822';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19253822'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JENIFFER DAVIANA ROMERO FALCON | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '19006902', 'JENIFFER DAVIANA', 'ROMERO FALCON', '04246215020', 'U.C.V CALLE 2 SECTOR 4', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'romerojeniffer4@gmail.com') THEN '19006902@sionerp.local' ELSE 'romerojeniffer4@gmail.com' END, 'server', true, '2021-12-05', NULL, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19006902');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04246215020' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 2 SECTOR 4' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, '2021-12-05'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '19006902';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19006902'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- LUIS SEGUNDO CORDERO | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9506762', 'LUIS SEGUNDO', 'CORDERO', '04140378692', 'U.C.V CALLE 11 S/5', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'luiscordero@gmail.com') THEN '9506762@sionerp.local' ELSE 'luiscordero@gmail.com' END, 'server', true, '1983-02-26', '2026-03-04', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9506762');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04140378692' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V CALLE 11 S/5' ELSE address END,
  birth_date   = COALESCE(birth_date, '2026-03-04'),
  baptism_date = COALESCE(baptism_date, '1983-02-26'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9506762';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9506762'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- IREXSI YANIRA SANCHEZ  HERRERA | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '17628947', 'IREXSI YANIRA', 'SANCHEZ  HERRERA', '04121067892', 'U. C.V CALLE 4 SECTOR 4 ·Nº 22', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'irexsis@gmail.com') THEN '17628947@sionerp.local' ELSE 'irexsis@gmail.com' END, 'server', true, '2021-01-01', '1985-02-07', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17628947');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04121067892' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U. C.V CALLE 4 SECTOR 4 ·Nº 22' ELSE address END,
  birth_date   = COALESCE(birth_date, '1985-02-07'),
  baptism_date = COALESCE(baptism_date, '2021-01-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '17628947';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17628947'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- JUANA PETRONILA ROMERO  MARTINEZ | nivel 1 | OESTE 2
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9509997', 'JUANA PETRONILA', 'ROMERO  MARTINEZ', '04124285297', 'U.C.V SECTOR 4 CALLE 9 V/15 Nº12', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'juanaprm88@gmail.com') THEN '9509997@sionerp.local' ELSE 'juanaprm88@gmail.com' END, 'server', true, NULL, '1966-11-11', 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9509997');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 2', zone_id = 'c0000002-0000-0000-0000-000000000002',
  phone   = CASE WHEN phone = '' THEN '04124285297' ELSE phone END,
  address = CASE WHEN address = '' THEN 'U.C.V SECTOR 4 CALLE 9 V/15 Nº12' ELSE address END,
  birth_date   = COALESCE(birth_date, '1966-11-11'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9509997';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000002-0000-0000-0000-000000000002', 'OESTE 2', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9509997'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000002-0000-0000-0000-000000000002', zone_name = 'OESTE 2', updated_at = NOW();

-- GIORENNY COLINA | nivel 3 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '18770281', 'GIORENNY', 'COLINA', '4221143048', 'VELITA 1, BLOQUE 10', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'giorenny@gmail.com') THEN '18770281@sionerp.local' ELSE 'giorenny@gmail.com' END, 'server', true, '2012-06-01', '1989-05-04', 3, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '18770281');
UPDATE public.users SET
  discipleship_level = 3, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4221143048' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 1, BLOQUE 10' ELSE address END,
  birth_date   = COALESCE(birth_date, '1989-05-04'),
  baptism_date = COALESCE(baptism_date, '2012-06-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '18770281';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 3, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '18770281'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 3, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- ANA AUXILIADORA COLINA CHIRINOS | nivel 2 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '5295103', 'ANA AUXILIADORA', 'COLINA CHIRINOS', '4126454744', 'LA VELITA 1 BLOQUE 14 APTO 0002', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'anaauxiliadoracolina@gmail.com') THEN '5295103@sionerp.local' ELSE 'anaauxiliadoracolina@gmail.com' END, 'server', true, '2002-06-09', '1960-10-28', 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '5295103');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4126454744' ELSE phone END,
  address = CASE WHEN address = '' THEN 'LA VELITA 1 BLOQUE 14 APTO 0002' ELSE address END,
  birth_date   = COALESCE(birth_date, '1960-10-28'),
  baptism_date = COALESCE(baptism_date, '2002-06-09'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '5295103';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '5295103'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- MARIA ANA LEAL GUTIERREZ | nivel 2 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9507185', 'MARIA ANA', 'LEAL GUTIERREZ', '4124270366', 'VELITA 4 CALLE 6 N 10', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'lealgutierrezmariana@gmail.com') THEN '9507185@sionerp.local' ELSE 'lealgutierrezmariana@gmail.com' END, 'server', true, NULL, '1965-08-29', 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9507185');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4124270366' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 4 CALLE 6 N 10' ELSE address END,
  birth_date   = COALESCE(birth_date, '1965-08-29'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9507185';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9507185'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- GEYRIS BENELLÁN | nivel 2 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '19251801', 'GEYRIS', 'BENELLÁN', '4121652525', 'calle Cuba sector pantano abajo casa 11.', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'geyrysbenellan@gmail.com') THEN '19251801@sionerp.local' ELSE 'geyrysbenellan@gmail.com' END, 'server', true, '2003-12-28', '1990-12-01', 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19251801');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4121652525' ELSE phone END,
  address = CASE WHEN address = '' THEN 'calle Cuba sector pantano abajo casa 11.' ELSE address END,
  birth_date   = COALESCE(birth_date, '1990-12-01'),
  baptism_date = COALESCE(baptism_date, '2003-12-28'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '19251801';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19251801'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- ELIA YAMILET BERMUDEZ MORALES | nivel 2 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11801318', 'ELIA YAMILET', 'BERMUDEZ MORALES', '4146627549', 'ZUMURUCUARE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'sofia.val19@gmail.com') THEN '11801318@sionerp.local' ELSE 'sofia.val19@gmail.com' END, 'server', true, '1989-02-10', '1970-07-21', 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11801318');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4146627549' ELSE phone END,
  address = CASE WHEN address = '' THEN 'ZUMURUCUARE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1970-07-21'),
  baptism_date = COALESCE(baptism_date, '1989-02-10'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11801318';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11801318'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- GENNY JOSE MORENO MEDINA | nivel 2 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '17027598', 'GENNY JOSE', 'MORENO MEDINA', '4124674171', 'LAS EUGENIAS, 8 ETAPA, MANZANA 46-28', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'gennymoreno2005@mail.com') THEN '17027598@sionerp.local' ELSE 'gennymoreno2005@mail.com' END, 'server', true, NULL, '1980-02-23', 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17027598');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4124674171' ELSE phone END,
  address = CASE WHEN address = '' THEN 'LAS EUGENIAS, 8 ETAPA, MANZANA 46-28' ELSE address END,
  birth_date   = COALESCE(birth_date, '1980-02-23'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '17027598';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17027598'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- ALIDA BRACHO | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '5284077', 'ALIDA', 'BRACHO', '4121583935', 'LAS VELITAS BLOQUE 32 APTO 0208', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'alidabracho@gmail.com') THEN '5284077@sionerp.local' ELSE 'alidabracho@gmail.com' END, 'server', true, NULL, '1955-05-02', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '5284077');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4121583935' ELSE phone END,
  address = CASE WHEN address = '' THEN 'LAS VELITAS BLOQUE 32 APTO 0208' ELSE address END,
  birth_date   = COALESCE(birth_date, '1955-05-02'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '5284077';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '5284077'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- ARGELIA SARAIS CASTRO DE VERIS | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '28251068', 'ARGELIA SARAIS', 'CASTRO DE VERIS', '4149629777', 'VELITA 1', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'argeliadv@outlook.com') THEN '28251068@sionerp.local' ELSE 'argeliadv@outlook.com' END, 'server', true, NULL, '1997-09-22', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '28251068');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4149629777' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 1' ELSE address END,
  birth_date   = COALESCE(birth_date, '1997-09-22'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '28251068';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '28251068'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- MAGNA ELIZABETH ARTEAGA DE PORTILLO | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '16438200', 'MAGNA ELIZABETH', 'ARTEAGA DE PORTILLO', '4246192628', 'LAS VELITAS CALLE PRINCIPAL BLOQUE 40', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'magnaarteaga2017@gmail.com') THEN '16438200@sionerp.local' ELSE 'magnaarteaga2017@gmail.com' END, 'server', true, '1999-05-01', '1987-05-13', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16438200');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4246192628' ELSE phone END,
  address = CASE WHEN address = '' THEN 'LAS VELITAS CALLE PRINCIPAL BLOQUE 40' ELSE address END,
  birth_date   = COALESCE(birth_date, '1987-05-13'),
  baptism_date = COALESCE(baptism_date, '1999-05-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '16438200';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16438200'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- FRANKLIN ANTONIO SANCHEZ CHIRINOS | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11473249', 'FRANKLIN ANTONIO', 'SANCHEZ CHIRINOS', '4241451927', 'VELITA 2 AV PPAL', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'sanchezfranklin572@gmail.com') THEN '11473249@sionerp.local' ELSE 'sanchezfranklin572@gmail.com' END, 'server', true, '2012-08-11', '1972-12-05', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11473249');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4241451927' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 2 AV PPAL' ELSE address END,
  birth_date   = COALESCE(birth_date, '1972-12-05'),
  baptism_date = COALESCE(baptism_date, '2012-08-11'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11473249';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11473249'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- YOLIMAR MARIA COLINA LEAL | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '20931721', 'YOLIMAR MARIA', 'COLINA LEAL', '4146949411', 'VELITA 1 BLOQUE 20 APTO 0205', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yolimarcolina10@gmail.com') THEN '20931721@sionerp.local' ELSE 'yolimarcolina10@gmail.com' END, 'server', true, '2021-12-05', '1990-03-10', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20931721');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4146949411' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 1 BLOQUE 20 APTO 0205' ELSE address END,
  birth_date   = COALESCE(birth_date, '1990-03-10'),
  baptism_date = COALESCE(baptism_date, '2021-12-05'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '20931721';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '20931721'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- CLARA RAFAELA ROMERO SANGRONIS | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7495787', 'CLARA RAFAELA', 'ROMERO SANGRONIS', '4124897291', 'VELITA 4 CALLE 3 N 17', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'clararafaelaromero@gmail.com') THEN '7495787@sionerp.local' ELSE 'clararafaelaromero@gmail.com' END, 'server', true, NULL, '1962-05-12', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7495787');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4124897291' ELSE phone END,
  address = CASE WHEN address = '' THEN 'VELITA 4 CALLE 3 N 17' ELSE address END,
  birth_date   = COALESCE(birth_date, '1962-05-12'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7495787';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7495787'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- ELY Y SIVIRA G | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7474107', 'ELY Y', 'SIVIRA G', '4126877787', 'MONSEÑOR ITURRIZA CALLE 2 N 131', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'elysivira385@gmail.com') THEN '7474107@sionerp.local' ELSE 'elysivira385@gmail.com' END, 'server', true, NULL, '1959-12-16', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7474107');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4126877787' ELSE phone END,
  address = CASE WHEN address = '' THEN 'MONSEÑOR ITURRIZA CALLE 2 N 131' ELSE address END,
  birth_date   = COALESCE(birth_date, '1959-12-16'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7474107';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7474107'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- EMILYS EDITHA CALDERON MEDINA | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '29641085', 'EMILYS EDITHA', 'CALDERON MEDINA', '4146973392', 'MONSEÑOR ITURRIZA ETAPA 1 CALLE 2 N 100', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'elimyscalderon@gmail.com') THEN '29641085@sionerp.local' ELSE 'elimyscalderon@gmail.com' END, 'server', true, NULL, '2002-08-15', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '29641085');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4146973392' ELSE phone END,
  address = CASE WHEN address = '' THEN 'MONSEÑOR ITURRIZA ETAPA 1 CALLE 2 N 100' ELSE address END,
  birth_date   = COALESCE(birth_date, '2002-08-15'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '29641085';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '29641085'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- FRANCISCO ELIEZER SANCHEZ CHIRINOS | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9510274', 'FRANCISCO ELIEZER', 'SANCHEZ CHIRINOS', '4120754895', 'ZUMURUCUARE SECTOR 5 CALLE NEGRO P.', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'feschi9510@gmail.com') THEN '9510274@sionerp.local' ELSE 'feschi9510@gmail.com' END, 'server', true, '1964-09-14', '1964-09-28', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9510274');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4120754895' ELSE phone END,
  address = CASE WHEN address = '' THEN 'ZUMURUCUARE SECTOR 5 CALLE NEGRO P.' ELSE address END,
  birth_date   = COALESCE(birth_date, '1964-09-28'),
  baptism_date = COALESCE(baptism_date, '1964-09-14'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9510274';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9510274'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- WILLY JOSE ALVARADO ARIAS | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '17923932', 'WILLY JOSE', 'ALVARADO ARIAS', '4124963322', 'SECTOR 1 ZUMIRUCUARE, CALLE SAN JUAN', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'portrabajo83@gmail.com') THEN '17923932@sionerp.local' ELSE 'portrabajo83@gmail.com' END, 'server', true, NULL, '1972-05-05', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17923932');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4124963322' ELSE phone END,
  address = CASE WHEN address = '' THEN 'SECTOR 1 ZUMIRUCUARE, CALLE SAN JUAN' ELSE address END,
  birth_date   = COALESCE(birth_date, '1972-05-05'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '17923932';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17923932'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- CARMEN ZORAIDA PETIT QUINTERO | nivel 1 | OESTE 3
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '8775946', 'CARMEN ZORAIDA', 'PETIT QUINTERO', '4120607616', 'URB. STA MARIA CALLE 16 N 15', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'drchirino49@gmail.com') THEN '8775946@sionerp.local' ELSE 'drchirino49@gmail.com' END, 'server', true, NULL, '1970-10-22', 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '8775946');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'OESTE 3', zone_id = 'c0000003-0000-0000-0000-000000000003',
  phone   = CASE WHEN phone = '' THEN '4120607616' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. STA MARIA CALLE 16 N 15' ELSE address END,
  birth_date   = COALESCE(birth_date, '1970-10-22'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '8775946';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000003-0000-0000-0000-000000000003', 'OESTE 3', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '8775946'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000003-0000-0000-0000-000000000003', zone_name = 'OESTE 3', updated_at = NOW();

-- NERIA JOSEFINA CUICAS DE EGURROLA | nivel 3 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7491778', 'NERIA JOSEFINA', 'CUICAS DE EGURROLA', '4246588032', 'RESIDENCIA VILLA PALMAR', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'cuicasneria@gmail.com') THEN '7491778@sionerp.local' ELSE 'cuicasneria@gmail.com' END, 'server', true, '1981-06-01', '1963-06-06', 3, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7491778');
UPDATE public.users SET
  discipleship_level = 3, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246588032' ELSE phone END,
  address = CASE WHEN address = '' THEN 'RESIDENCIA VILLA PALMAR' ELSE address END,
  birth_date   = COALESCE(birth_date, '1963-06-06'),
  baptism_date = COALESCE(baptism_date, '1981-06-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7491778';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 3, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7491778'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 3, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- LISBETH ANDERSON | nivel 3 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '10706514', 'LISBETH', 'ANDERSON', '', 'CALLE JANSEN #6', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'lisbethandersonuptag@gmail.com') THEN '10706514@sionerp.local' ELSE 'lisbethandersonuptag@gmail.com' END, 'server', true, '1996-06-01', '1971-10-09', 3, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10706514');
UPDATE public.users SET
  discipleship_level = 3, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE JANSEN #6' ELSE address END,
  birth_date   = COALESCE(birth_date, '1971-10-09'),
  baptism_date = COALESCE(baptism_date, '1996-06-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '10706514';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 3, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10706514'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 3, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ENEIDA MARGARITA ARECHE CHIRINOS | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '16170410', 'ENEIDA MARGARITA', 'ARECHE CHIRINOS', '4246108849', 'AV ROMULO GALLEGOS', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'arecheeneida@gmail.com') THEN '16170410@sionerp.local' ELSE 'arecheeneida@gmail.com' END, 'server', true, '2006-12-10', '1978-01-22', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16170410');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246108849' ELSE phone END,
  address = CASE WHEN address = '' THEN 'AV ROMULO GALLEGOS' ELSE address END,
  birth_date   = COALESCE(birth_date, '1978-01-22'),
  baptism_date = COALESCE(baptism_date, '2006-12-10'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '16170410';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16170410'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- BELÉN DEL CARMEN NOGUERA DE GÓMEZ | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '17629840', 'BELÉN DEL CARMEN', 'NOGUERA DE GÓMEZ', '4160155360', 'CALLE DEMOCRACIA CON ITURBE SECTOR CABUDARIO', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'belendegomez602@gmail.com') THEN '17629840@sionerp.local' ELSE 'belendegomez602@gmail.com' END, 'server', true, '2009-06-21', '1985-12-10', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17629840');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4160155360' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE DEMOCRACIA CON ITURBE SECTOR CABUDARIO' ELSE address END,
  birth_date   = COALESCE(birth_date, '1985-12-10'),
  baptism_date = COALESCE(baptism_date, '2009-06-21'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '17629840';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17629840'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- DAVID DORANTE VARGAS | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '16348671', 'DAVID', 'DORANTE VARGAS', '4122424765', 'URB. LAS DELICIAS CASA 305', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'dmlmarketca@gmail.com') THEN '16348671@sionerp.local' ELSE 'dmlmarketca@gmail.com' END, 'server', true, NULL, '1983-12-15', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16348671');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4122424765' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. LAS DELICIAS CASA 305' ELSE address END,
  birth_date   = COALESCE(birth_date, '1983-12-15'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '16348671';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '16348671'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- YESSICA BEATRIZ GUTIERREZ MORA | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '24590147', 'YESSICA BEATRIZ', 'GUTIERREZ MORA', '4246810496', 'EDIFICIOS MANAURE. AV.MARACAIBO', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yessikacdr13@gmail.com') THEN '24590147@sionerp.local' ELSE 'yessikacdr13@gmail.com' END, 'server', true, NULL, '1995-09-15', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '24590147');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246810496' ELSE phone END,
  address = CASE WHEN address = '' THEN 'EDIFICIOS MANAURE. AV.MARACAIBO' ELSE address END,
  birth_date   = COALESCE(birth_date, '1995-09-15'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '24590147';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '24590147'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ELISA MARIA DORANTE VARGAS | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12181505', 'ELISA MARIA', 'DORANTE VARGAS', '4246559239', 'PARCELAMIENTO ARENALES', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yosmanjesus07@gmail.com') THEN '12181505@sionerp.local' ELSE 'yosmanjesus07@gmail.com' END, 'server', true, '2012-01-23', '1976-03-03', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12181505');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246559239' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PARCELAMIENTO ARENALES' ELSE address END,
  birth_date   = COALESCE(birth_date, '1976-03-03'),
  baptism_date = COALESCE(baptism_date, '2012-01-23'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12181505';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12181505'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ZORYED GUADALUOPE CHIRINOS SANCHEZ | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '17923279', 'ZORYED GUADALUOPE', 'CHIRINOS SANCHEZ', '4246092095', 'CR. LAS DELICIAS, 1 PORTON, CALLE 1 N 8', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '17923279@sionerp.local') THEN '17923279@sionerp.local' ELSE '17923279@sionerp.local' END, 'server', true, '2007-10-21', '1988-01-07', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17923279');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246092095' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CR. LAS DELICIAS, 1 PORTON, CALLE 1 N 8' ELSE address END,
  birth_date   = COALESCE(birth_date, '1988-01-07'),
  baptism_date = COALESCE(baptism_date, '2007-10-21'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '17923279';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '17923279'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- MARÍA ELENA PERNALETE DE DORANTE | nivel 2 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '15917942', 'MARÍA ELENA', 'PERNALETE DE DORANTE', '4121256795', 'URB. LAS DELICIAS CASA 305', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'pernaletemaria48@gmail.com') THEN '15917942@sionerp.local' ELSE 'pernaletemaria48@gmail.com' END, 'server', true, NULL, '1983-04-10', 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15917942');
UPDATE public.users SET
  discipleship_level = 2, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4121256795' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. LAS DELICIAS CASA 305' ELSE address END,
  birth_date   = COALESCE(birth_date, '1983-04-10'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '15917942';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 2, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '15917942'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 2, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ALBERT EDUARDO GUTIERREZ ARECHE | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '31627532', 'ALBERT EDUARDO', 'GUTIERREZ ARECHE', '4246842636', 'AV ROMULO GALLEGOS', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'gutierrezalbert188@gmail.com') THEN '31627532@sionerp.local' ELSE 'gutierrezalbert188@gmail.com' END, 'server', true, '2019-12-10', '2005-08-27', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '31627532');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246842636' ELSE phone END,
  address = CASE WHEN address = '' THEN 'AV ROMULO GALLEGOS' ELSE address END,
  birth_date   = COALESCE(birth_date, '2005-08-27'),
  baptism_date = COALESCE(baptism_date, '2019-12-10'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '31627532';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '31627532'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- LENIS ESCOBAR | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11802623', 'LENIS', 'ESCOBAR', '4246334413', 'CALLE COLINA N 37', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = '11802623@sionerp.local') THEN '11802623@sionerp.local' ELSE '11802623@sionerp.local' END, 'server', true, NULL, '1971-01-31', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11802623');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246334413' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE COLINA N 37' ELSE address END,
  birth_date   = COALESCE(birth_date, '1971-01-31'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11802623';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11802623'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- MARIA EUGENIA CHIRINOS VARGAS | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9511009', 'MARIA EUGENIA', 'CHIRINOS VARGAS', '4120528348', 'CALLE DEMOCRACIA CON ITURBE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'mariaeugeniachirinovargas@gmail.com') THEN '9511009@sionerp.local' ELSE 'mariaeugeniachirinovargas@gmail.com' END, 'server', true, '2010-10-03', '1964-11-15', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9511009');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4120528348' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE DEMOCRACIA CON ITURBE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1964-11-15'),
  baptism_date = COALESCE(baptism_date, '2010-10-03'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9511009';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9511009'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- YOSELYN ERNESTINA MEDINA MEDINA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25945349', 'YOSELYN ERNESTINA', 'MEDINA MEDINA', '4125480468', 'CALLE AURORA, SECTOR CHIMPIRE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yoselynmedina03@gmail.com') THEN '25945349@sionerp.local' ELSE 'yoselynmedina03@gmail.com' END, 'server', true, NULL, '1996-03-07', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25945349');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4125480468' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE AURORA, SECTOR CHIMPIRE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1996-03-07'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25945349';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25945349'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- HECYARLI LÓPEZ | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '25127640', 'HECYARLI', 'LÓPEZ', '4146369572', 'URB. DOÑA ROSA', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yayilopez7@gmail.com') THEN '25127640@sionerp.local' ELSE 'yayilopez7@gmail.com' END, 'server', true, '2011-05-16', '1996-07-11', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25127640');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4146369572' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. DOÑA ROSA' ELSE address END,
  birth_date   = COALESCE(birth_date, '1996-07-11'),
  baptism_date = COALESCE(baptism_date, '2011-05-16'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '25127640';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '25127640'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- CARMEN VICTORIA RUIZ RIVERO | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '21112888', 'CARMEN VICTORIA', 'RUIZ RIVERO', '4125807243', 'URB. FRANCISCO DE MIRANDA CALLE 4 M 21', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'carmenvictoriaruizrivero@gmail.com') THEN '21112888@sionerp.local' ELSE 'carmenvictoriaruizrivero@gmail.com' END, 'server', true, '2007-03-25', '1991-08-16', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '21112888');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4125807243' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB. FRANCISCO DE MIRANDA CALLE 4 M 21' ELSE address END,
  birth_date   = COALESCE(birth_date, '1991-08-16'),
  baptism_date = COALESCE(baptism_date, '2007-03-25'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '21112888';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '21112888'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- DAYMI ILARRETA MEDINA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '13901440', 'DAYMI', 'ILARRETA MEDINA', '41251519320', 'SECTOR BOBARE, CALLEJON BORREGALES', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'ilarretadaymo@gmail.com') THEN '13901440@sionerp.local' ELSE 'ilarretadaymo@gmail.com' END, 'server', true, NULL, NULL, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13901440');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '41251519320' ELSE phone END,
  address = CASE WHEN address = '' THEN 'SECTOR BOBARE, CALLEJON BORREGALES' ELSE address END,
  birth_date   = COALESCE(birth_date, NULL),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '13901440';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '13901440'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- OLEIDYS B FERNANDEZ | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '14654462', 'OLEIDYS B', 'FERNANDEZ', '4246003445', 'URB.450. BOBARE', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'oleidysfer77@gmail.com') THEN '14654462@sionerp.local' ELSE 'oleidysfer77@gmail.com' END, 'server', true, '2018-10-14', '1977-11-13', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14654462');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246003445' ELSE phone END,
  address = CASE WHEN address = '' THEN 'URB.450. BOBARE' ELSE address END,
  birth_date   = COALESCE(birth_date, '1977-11-13'),
  baptism_date = COALESCE(baptism_date, '2018-10-14'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '14654462';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '14654462'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- MAGALY JOSEFINA GARMENDIA DE CASTRO | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '10700793', 'MAGALY JOSEFINA', 'GARMENDIA DE CASTRO', '4120829505', 'CALLEJON LOS PROCERES, ARENALES', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'garmendiamagaly562@gmail.com') THEN '10700793@sionerp.local' ELSE 'garmendiamagaly562@gmail.com' END, 'server', true, '2011-01-23', '1968-07-11', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10700793');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4120829505' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLEJON LOS PROCERES, ARENALES' ELSE address END,
  birth_date   = COALESCE(birth_date, '1968-07-11'),
  baptism_date = COALESCE(baptism_date, '2011-01-23'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '10700793';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10700793'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- SOLANGELA NAZARETH GONZALEZ PRIMERA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '19253785', 'SOLANGELA NAZARETH', 'GONZALEZ PRIMERA', '4246547196', 'PARC. SUR LA PAZ, CALLE PPAL.', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'solangelagonzalez2@gmail.com') THEN '19253785@sionerp.local' ELSE 'solangelagonzalez2@gmail.com' END, 'server', true, '2022-05-14', '1989-07-12', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19253785');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246547196' ELSE phone END,
  address = CASE WHEN address = '' THEN 'PARC. SUR LA PAZ, CALLE PPAL.' ELSE address END,
  birth_date   = COALESCE(birth_date, '1989-07-12'),
  baptism_date = COALESCE(baptism_date, '2022-05-14'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '19253785';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '19253785'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- YRIS JOSEFINA HERNANDEZ TELLERIA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '9929236', 'YRIS JOSEFINA', 'HERNANDEZ TELLERIA', '4246350325', '2 COMANDANTES', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'hernandezyris@gmail.com') THEN '9929236@sionerp.local' ELSE 'hernandezyris@gmail.com' END, 'server', true, NULL, '1969-07-10', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9929236');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246350325' ELSE phone END,
  address = CASE WHEN address = '' THEN '2 COMANDANTES' ELSE address END,
  birth_date   = COALESCE(birth_date, '1969-07-10'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '9929236';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '9929236'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ELVIS CANDELARIA CALDERON ROJAS | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '4108978', 'ELVIS CANDELARIA', 'CALDERON ROJAS', '4140585496', 'CR LAS BEGONIAS N 13', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'elviscalderon0202@gmail.com') THEN '4108978@sionerp.local' ELSE 'elviscalderon0202@gmail.com' END, 'server', true, NULL, '1957-02-02', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '4108978');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4140585496' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CR LAS BEGONIAS N 13' ELSE address END,
  birth_date   = COALESCE(birth_date, '1957-02-02'),
  baptism_date = COALESCE(baptism_date, NULL),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '4108978';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '4108978'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ALICIA JOSEFINA DUNO PRADO | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '11804364', 'ALICIA JOSEFINA', 'DUNO PRADO', '4246044305', 'AV. BUCHIVACOA N 12-B', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'draaliciaprado@gmail.com') THEN '11804364@sionerp.local' ELSE 'draaliciaprado@gmail.com' END, 'server', true, '1990-07-01', '1973-05-12', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11804364');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246044305' ELSE phone END,
  address = CASE WHEN address = '' THEN 'AV. BUCHIVACOA N 12-B' ELSE address END,
  birth_date   = COALESCE(birth_date, '1973-05-12'),
  baptism_date = COALESCE(baptism_date, '1990-07-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '11804364';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '11804364'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- YELITZA JOSEFINA SANCHEZ | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '10704547', 'YELITZA JOSEFINA', 'SANCHEZ', '4246662498', 'AV. BUCHIVACOA N 9', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'yety79151@gmail.com') THEN '10704547@sionerp.local' ELSE 'yety79151@gmail.com' END, 'server', true, '2014-07-27', '1967-12-31', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10704547');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246662498' ELSE phone END,
  address = CASE WHEN address = '' THEN 'AV. BUCHIVACOA N 9' ELSE address END,
  birth_date   = COALESCE(birth_date, '1967-12-31'),
  baptism_date = COALESCE(baptism_date, '2014-07-27'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '10704547';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '10704547'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- MARINA AMAYA RIERA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '24787570', 'MARINA', 'AMAYA RIERA', '4146526045', 'CALLE UNION N 30', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'amayamarina17@gmail.com') THEN '24787570@sionerp.local' ELSE 'amayamarina17@gmail.com' END, 'server', true, '2022-05-14', '1995-02-20', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '24787570');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4146526045' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE UNION N 30' ELSE address END,
  birth_date   = COALESCE(birth_date, '1995-02-20'),
  baptism_date = COALESCE(baptism_date, '2022-05-14'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '24787570';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '24787570'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- VICNELLY AGUILAR ACOSTA | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '12732554', 'VICNELLY', 'AGUILAR ACOSTA', '4246272328', 'CALLE AMPIES N 88', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'vicnelyaguilar@gmail.com') THEN '12732554@sionerp.local' ELSE 'vicnelyaguilar@gmail.com' END, 'server', true, '1991-09-28', '1976-04-21', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12732554');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246272328' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE AMPIES N 88' ELSE address END,
  birth_date   = COALESCE(birth_date, '1976-04-21'),
  baptism_date = COALESCE(baptism_date, '1991-09-28'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '12732554';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '12732554'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- NORYS JOSEFINA ACOSTA VILLAVICENCIO | nivel 1 | ESTE
INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)
SELECT '7491081', 'NORYS JOSEFINA', 'ACOSTA VILLAVICENCIO', '4246878262', 'CALLE URDANETA CON CHEVROLET', CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'acostanorys@gmail.com') THEN '7491081@sionerp.local' ELSE 'acostanorys@gmail.com' END, 'server', true, '1977-07-01', '1962-10-30', 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7491081');
UPDATE public.users SET
  discipleship_level = 1, zone_name = 'ESTE', zone_id = 'c0000004-0000-0000-0000-000000000004',
  phone   = CASE WHEN phone = '' THEN '4246878262' ELSE phone END,
  address = CASE WHEN address = '' THEN 'CALLE URDANETA CON CHEVROLET' ELSE address END,
  birth_date   = COALESCE(birth_date, '1962-10-30'),
  baptism_date = COALESCE(baptism_date, '1977-07-01'),
  baptized = baptized OR true, updated_at = NOW()
WHERE regexp_replace(id_number, '\D', '', 'g') = '7491081';
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)
SELECT id, 1, 'c0000004-0000-0000-0000-000000000004', 'ESTE', NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\D', '', 'g') = '7491081'
ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = 1, zone_id = 'c0000004-0000-0000-0000-000000000004', zone_name = 'ESTE', updated_at = NOW();

-- ========================
-- CABLEADO DE SUPERVISIÓN
-- generales → coordinador de su zona; auxiliares → general (solo si es único en la zona)
-- ========================
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '9507199')
WHERE h.hierarchy_level = 3 AND h.zone_id = 'c0000001-0000-0000-0000-000000000001' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '7356713')
WHERE h.hierarchy_level = 3 AND h.zone_id = 'c0000002-0000-0000-0000-000000000002' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '16709124')
WHERE h.hierarchy_level = 3 AND h.zone_id = 'c0000003-0000-0000-0000-000000000003' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '19617387')
WHERE h.hierarchy_level = 3 AND h.zone_id = 'c0000004-0000-0000-0000-000000000004' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '9521496')
WHERE h.hierarchy_level = 2 AND h.zone_id = 'c0000001-0000-0000-0000-000000000001' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '9923269')
WHERE h.hierarchy_level = 2 AND h.zone_id = 'c0000002-0000-0000-0000-000000000002' AND h.supervisor_id IS NULL;
UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\D','','g') = '18770281')
WHERE h.hierarchy_level = 2 AND h.zone_id = 'c0000003-0000-0000-0000-000000000003' AND h.supervisor_id IS NULL;

SET session_replication_role = DEFAULT;