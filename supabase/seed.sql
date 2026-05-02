-- ============================================================
-- SionERP - Clean Seed Data
-- ============================================================
-- This seed provides a minimal, consistent dataset for local development.
-- It intentionally excludes:
--   - auth.* tables (managed by Supabase, never seed auth internals)
--   - users_new / users_old (legacy tables)
--   - discipleship_metrics (dropped - analytics now use report_data)
--   - audit_logs / sessions / tokens (runtime data, not seed data)
--
-- To apply: psql -h 127.0.0.1 -p 54321 -U postgres -d postgres -f seed.sql
-- ============================================================

SET session_replication_role = replica;

-- ========================
-- ZONES
-- ========================
INSERT INTO public.zones (id, name, description, color, center_lat, center_lng) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Zona Norte', 'Sectores del norte de la ciudad', '#3b82f6', 10.2580, -67.5910),
  ('a0000002-0000-0000-0000-000000000002', 'Zona Sur', 'Sectores del sur de la ciudad', '#ef4444', 10.2050, -67.5870),
  ('a0000003-0000-0000-0000-000000000003', 'Zona Este', 'Sectores del este de la ciudad', '#10b981', 10.2300, -67.5700),
  ('a0000004-0000-0000-0000-000000000004', 'Zona Oeste', 'Sectores del oeste de la ciudad', '#f59e0b', 10.2300, -67.6200)
ON CONFLICT (name) DO NOTHING;

-- ========================
-- USERS
-- ========================
-- NOTE: These public.users rows need matching auth.users entries to login.
-- Use Supabase Dashboard or CLI to create auth users with the same IDs.
-- ========================
INSERT INTO public.users (id, id_number, first_name, last_name, phone, address, email, role, is_active, discipleship_level, active_groups_count, zone_name, territory, is_super_admin) VALUES
  -- Pastor (level 1)
  ('b0000001-0000-0000-0000-000000000001', 'PASTOR-001', 'Daniel', 'Rodriguez', '+58-412-555-0001', 'Iglesia Central', 'pastor@sionerp.local', 'pastor', true, NULL, 0, NULL, NULL, false),
  -- Zone Supervisors (level 2)
  ('b0000002-0000-0000-0000-000000000002', 'SUP-N-001', 'Maria', 'Gomez', '+58-412-555-0002', 'Zona Norte', 'supervisor-norte@sionerp.local', 'staff', true, 2, 0, 'Zona Norte', 'Sector Norte', false),
  ('b0000003-0000-0000-0000-000000000003', 'SUP-S-001', 'Carlos', 'Lopez', '+58-412-555-0003', 'Zona Sur', 'supervisor-sur@sionerp.local', 'staff', true, 2, 0, 'Zona Sur', 'Sector Sur', false),
  -- Cell Leaders (level 4) - Norte
  ('b0000004-0000-0000-0000-000000000004', 'LDR-N-001', 'Ana', 'Martinez', '+58-412-555-0004', 'Casa Oracion Norte', 'lider-norte1@sionerp.local', 'server', true, 4, 0, 'Zona Norte', NULL, false),
  ('b0000005-0000-0000-0000-000000000005', 'LDR-N-002', 'Pedro', 'Hernandez', '+58-412-555-0005', 'Centro Norte', 'lider-norte2@sionerp.local', 'server', true, 4, 0, 'Zona Norte', NULL, false),
  -- Cell Leaders (level 4) - Sur
  ('b0000006-0000-0000-0000-000000000006', 'LDR-S-001', 'Lucia', 'Diaz', '+58-412-555-0006', 'Templo Sur Sion', 'lider-sur1@sionerp.local', 'server', true, 4, 0, 'Zona Sur', NULL, false),
  ('b0000007-0000-0000-0000-000000000007', 'LDR-S-002', 'Miguel', 'Torres', '+58-412-555-0007', 'Casa Sur', 'lider-sur2@sionerp.local', 'server', true, 4, 0, 'Zona Sur', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- DISCIPLESHIP HIERARCHY
-- ========================
INSERT INTO public.discipleship_hierarchy (id, user_id, hierarchy_level, supervisor_id, zone_id, zone_name, territory, active_groups_assigned) VALUES
  -- Pastor
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 1, NULL, NULL, NULL, NULL, 0),
  -- Supervisors report to Pastor
  ('c0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 2, 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Zona Norte', 'Sector Norte', 2),
  ('c0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 2, 'b0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Zona Sur', 'Sector Sur', 2),
  -- Leaders report to Supervisors
  ('c0000004-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 4, 'b0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Zona Norte', NULL, 1),
  ('c0000005-0000-0000-0000-000000000005', 'b0000005-0000-0000-0000-000000000005', 4, 'b0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Zona Norte', NULL, 1),
  ('c0000006-0000-0000-0000-000000000006', 'b0000006-0000-0000-0000-000000000006', 4, 'b0000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Zona Sur', NULL, 1),
  ('c0000007-0000-0000-0000-000000000007', 'b0000007-0000-0000-0000-000000000007', 4, 'b0000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Zona Sur', NULL, 1)
ON CONFLICT (user_id) DO NOTHING;

-- ========================
-- DISCIPLESHIP GROUPS
-- ========================
INSERT INTO public.discipleship_groups (id, group_name, leader_id, supervisor_id, meeting_location, meeting_day, meeting_time, member_count, active_members, status, zone_id, zone_name) VALUES
  -- Zona Norte
  ('d0000001-0000-0000-0000-000000000001', 'Fe y Vida - Norte 1', 'b0000004-0000-0000-0000-000000000004', 'b0000002-0000-0000-0000-000000000002', 'Casa de Oracion Norte', 'Lunes', '19:30:00', 10, 8, 'active', 'a0000001-0000-0000-0000-000000000001', 'Zona Norte'),
  ('d0000002-0000-0000-0000-000000000002', 'Esperanza - Norte 2', 'b0000005-0000-0000-0000-000000000005', 'b0000002-0000-0000-0000-000000000002', 'Centro Comunitario Norte', 'Miercoles', '20:00:00', 8, 6, 'active', 'a0000001-0000-0000-0000-000000000001', 'Zona Norte'),
  -- Zona Sur
  ('d0000003-0000-0000-0000-000000000003', 'Amor en Cristo - Sur 1', 'b0000006-0000-0000-0000-000000000006', 'b0000003-0000-0000-0000-000000000003', 'Templo Sur Sion', 'Martes', '19:00:00', 12, 10, 'active', 'a0000002-0000-0000-0000-000000000002', 'Zona Sur'),
  ('d0000004-0000-0000-0000-000000000004', 'Nueva Vida - Sur 2', 'b0000007-0000-0000-0000-000000000007', 'b0000003-0000-0000-0000-000000000003', 'Casa Familiar Sur', 'Jueves', '19:30:00', 7, 5, 'active', 'a0000002-0000-0000-0000-000000000002', 'Zona Sur')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- DISCIPLESHIP REPORTS (with proper report_data JSONB)
-- ========================
-- report_data keys used by backend analytics:
--   group_id, attendance_nd, attendance_dm, attendance_friends, attendance_kids,
--   group_discipleships, group_evangelism,
--   leader_new_disciples_care, leader_mature_disciples_care,
--   spiritual_journal_days, leader_evangelism,
--   service_attendance_sunday, service_attendance_prayer, doctrine_attendance,
--   is_multiplying
-- ========================
INSERT INTO public.discipleship_reports (id, reporter_id, supervisor_id, report_level, report_type, period_start, period_end, report_data, status, submitted_at) VALUES
  -- Leader Norte 1: strong group, 2 reports, marked for multiplication
  ('e0000001-0000-0000-0000-000000000001',
   'b0000004-0000-0000-0000-000000000004', 'b0000002-0000-0000-0000-000000000002',
   4, 'weekly', '2026-04-20', '2026-04-26',
   '{"group_id":"d0000001-0000-0000-0000-000000000001","attendance_nd":10,"attendance_dm":5,"attendance_friends":2,"attendance_kids":1,"group_discipleships":3,"group_evangelism":2,"leader_new_disciples_care":2,"leader_mature_disciples_care":3,"spiritual_journal_days":5,"leader_evangelism":2,"service_attendance_sunday":1,"service_attendance_prayer":1,"doctrine_attendance":1,"is_multiplying":false}',
   'submitted', '2026-04-27 10:00:00+00'),

  ('e0000002-0000-0000-0000-000000000002',
   'b0000004-0000-0000-0000-000000000004', 'b0000002-0000-0000-0000-000000000002',
   4, 'weekly', '2026-04-27', '2026-05-03',
   '{"group_id":"d0000001-0000-0000-0000-000000000001","attendance_nd":12,"attendance_dm":6,"attendance_friends":3,"attendance_kids":2,"group_discipleships":4,"group_evangelism":3,"leader_new_disciples_care":3,"leader_mature_disciples_care":4,"spiritual_journal_days":6,"leader_evangelism":3,"service_attendance_sunday":1,"service_attendance_prayer":1,"doctrine_attendance":1,"is_multiplying":true}',
   'submitted', '2026-05-04 10:00:00+00'),

  -- Leader Norte 2: moderate
  ('e0000003-0000-0000-0000-000000000003',
   'b0000005-0000-0000-0000-000000000005', 'b0000002-0000-0000-0000-000000000002',
   4, 'weekly', '2026-04-20', '2026-04-26',
   '{"group_id":"d0000002-0000-0000-0000-000000000002","attendance_nd":8,"attendance_dm":3,"attendance_friends":1,"attendance_kids":0,"group_discipleships":1,"group_evangelism":1,"leader_new_disciples_care":1,"leader_mature_disciples_care":2,"spiritual_journal_days":3,"leader_evangelism":1,"service_attendance_sunday":1,"service_attendance_prayer":0,"doctrine_attendance":0,"is_multiplying":false}',
   'submitted', '2026-04-27 11:00:00+00'),

  -- Leader Sur 1: strong group
  ('e0000004-0000-0000-0000-000000000004',
   'b0000006-0000-0000-0000-000000000006', 'b0000003-0000-0000-0000-000000000003',
   4, 'weekly', '2026-04-20', '2026-04-26',
   '{"group_id":"d0000003-0000-0000-0000-000000000003","attendance_nd":12,"attendance_dm":6,"attendance_friends":4,"attendance_kids":2,"group_discipleships":4,"group_evangelism":3,"leader_new_disciples_care":3,"leader_mature_disciples_care":4,"spiritual_journal_days":6,"leader_evangelism":3,"service_attendance_sunday":1,"service_attendance_prayer":1,"doctrine_attendance":1,"is_multiplying":false}',
   'submitted', '2026-04-27 12:00:00+00'),

  -- Leader Sur 2: low activity (potential alerts)
  ('e0000005-0000-0000-0000-000000000005',
   'b0000007-0000-0000-0000-000000000007', 'b0000003-0000-0000-0000-000000000003',
   4, 'weekly', '2026-04-20', '2026-04-26',
   '{"group_id":"d0000004-0000-0000-0000-000000000004","attendance_nd":7,"attendance_dm":2,"attendance_friends":0,"attendance_kids":0,"group_discipleships":0,"group_evangelism":0,"leader_new_disciples_care":0,"leader_mature_disciples_care":1,"spiritual_journal_days":2,"leader_evangelism":0,"service_attendance_sunday":1,"service_attendance_prayer":0,"doctrine_attendance":0,"is_multiplying":false}',
   'submitted', '2026-04-27 13:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- MODULES
-- ========================
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
  ('base', 'Sistema Base', 'Funcionalidades principales: Usuarios, Configuracion', true, NOW()),
  ('discipleship', 'Discipulado', 'Gestion de grupos, jerarquias y reportes', true, NOW()),
  ('zones', 'Zonas', 'Gestion de zonas territoriales', true, NOW())
ON CONFLICT (key) DO NOTHING;

-- ========================
-- LIVE STREAMS
-- ========================
INSERT INTO public.live_streams (id, youtube_video_id, title, description, is_live, scheduled_start, actual_start) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'sion-sunday-2026-05-03', 'Servicio Dominical - Culto Principal', 'Servicio dominical de la Iglesia Sion con predicacion y alabanza', false, '2026-05-03 10:00:00+00', '2026-05-03 10:05:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Done - summary:
--   zones:                  4 (Norte, Sur, Este, Oeste)
--   users:                  7 (1 pastor, 2 supervisors, 4 leaders)
--   discipleship_hierarchy: 7 (matching all users)
--   discipleship_groups:    4 (2 per active zone)
--   discipleship_reports:   5 (with proper report_data JSONB)
--   modules:                3 (base, discipleship, zones)
--   live_streams:           1
--   (discipleship_levels:   5 - seeded by migration 001)
-- ========================

SET session_replication_role = DEFAULT;
