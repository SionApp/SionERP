-- ============================================================================
-- FLUJO COMPLETO DEL MÓDULO DE DISCIPULADO
-- Script de prueba para verificar el dashboard pastoral
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR USUARIOS EXISTENTES
-- ============================================================================
SELECT id, email, first_name, last_name 
FROM users 
LIMIT 10;

-- ============================================================================
-- 2. LIMPIAR DATOS EXISTENTES (opcional, para prueba limpia)
-- ============================================================================
-- Nota: Comenta estas líneas si quieres preservar datos existentes

-- DELETE FROM discipleship_alerts;
-- DELETE FROM discipleship_reports;
-- DELETE FROM discipleship_goals;
-- DELETE FROM discipleship_metrics;
-- DELETE FROM discipleship_groups;
-- DELETE FROM discipleship_hierarchy;

-- ============================================================================
-- 3. CREAR JERARQUÍA DE DISCIPULADO (5 NIVELES)
-- ============================================================================

-- Obtener IDs de usuarios para la jerarquía (ajusta según tus usuarios reales)
-- Nivel 5: Pastor
-- Nivel 4: Coordinador  
-- Nivel 3: Supervisor General
-- Nivel 2: Supervisor Auxiliar
-- Nivel 1: Líder de Grupo

-- Insertar jerarquía
INSERT INTO discipleship_hierarchy (id, user_id, hierarchy_level, supervisor_id, zone_name, territory, active_groups_assigned)
VALUES 
  -- Pastor (Nivel 5) - No reporta a nadie
  ('a1111111-1111-1111-1111-111111111111', '0f662a76-63b9-412d-bf81-59239628e80d', 5, NULL, 'Centro', 'Zona Metropolitana', 0),
  
  -- Coordinador (Nivel 4) - Reporta al Pastor
  ('b2222222-2222-2222-2222-222222222222', 'aaeddb77-2844-49b5-816c-9740e06b0379', 4, 'a1111111-1111-1111-1111-111111111111', 'Norte', 'Sector Norte', 0),
  ('c3333333-3333-3333-3333-333333333333', '458012c4-f142-4c9d-b8f6-466261323579', 4, 'a1111111-1111-1111-1111-111111111111', 'Sur', 'Sector Sur', 0),
  
  -- Supervisor General (Nivel 3) - Reporta al Coordinador
  ('d4444444-4444-4444-4444-444444444444', '7df46541-9c81-4312-b4a9-013d531d2cce', 3, 'b2222222-2222-2222-2222-222222222222', 'Norte', 'Sector Norte', 2),
  ('e5555555-5555-5555-5555-555555555555', '3f855b46-db53-4490-8417-b451844369d7', 3, 'c3333333-3333-3333-3333-333333333333', 'Sur', 'Sector Sur', 2),
  
  -- Supervisor Auxiliar (Nivel 2) - Reporta al Supervisor General
  ('f6666666-6666-6666-6666-666666666666', 'fc7ac7b6-86b8-4ffd-bb32-8151d5de80f9', 2, 'd4444444-4444-4444-4444-444444444444', 'Norte', 'subsector', 3),
  ('g7777777-7777-7777-7777-777777777777', 'd2d7b37a-d3da-48ef-8e85-f26a07326bf5', 2, 'd4444444-4444-4444-4444-444444444444', 'Norte', 'subsector', 2),
  
  -- Líderes de Grupo (Nivel 1) - Reportan al Supervisor Auxiliar
  ('h8888888-8888-8888-8888-888888888888', 'c8c45cd7-22c4-416e-8ad9-4709af654708', 1, 'f6666666-6666-6666-6666-666666666666', 'Norte', 'Grupo 1', 1),
  ('i9999999-9999-9999-9999-999999999999', '9eff33ef-d890-43ab-9f28-4408bc22343c', 1, 'f6666666-6666-6666-6666-666666666666', 'Norte', 'Grupo 2', 1),
  ('j0000000-0000-0000-0000-000000000000', 'd6ada62d-5fbb-43fe-be55-33be7bac5189', 1, 'g7777777-7777-7777-7777-777777777777', 'Norte', 'Grupo 3', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. CREAR GRUPOS DE DISCIPULADO
-- ============================================================================

INSERT INTO discipleship_groups (id, group_name, leader_id, supervisor_id, meeting_location, meeting_day, meeting_time, member_count, active_members, status, zone_name)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Célula Esperanza', 'h8888888-8888-8888-8888-888888888888', 'f6666666-6666-6666-6666-666666666666', 'Casa 123 - Barrio Central', 'Lunes', '19:00:00', 12, 8, 'active', 'Norte'),
  ('22222222-2222-2222-2222-222222222222', 'Célula Fe', 'i9999999-9999-9999-9999-999999999999', 'f6666666-6666-6666-6666-666666666666', 'Casa 456 - Barrio Norte', 'Martes', '19:30:00', 10, 7, 'active', 'Norte'),
  ('33333333-3333-3333-3333-333333333333', 'Célula Amor', 'j0000000-0000-0000-0000-000000000000', 'g7777777-7777-7777-7777-777777777777', 'Casa 789 - Barrio Sur', 'Miércoles', '20:00:00', 8, 5, 'active', 'Norte'),
  ('44444444-4444-4444-4444-444444444444', 'Célula Victoria', 'c8c45cd7-22c4-416e-8ad9-4709af654708', 'f6666666-6666-6666-6666-666666666666', 'Centro Comunitario', 'Viernes', '19:00:00', 15, 12, 'multiplying', 'Centro'),
  ('55555555-5555-5555-5555-555555555555', 'Célula Luz', '9eff33ef-d890-43ab-9f28-4408bc22343c', 'f6666666-6666-6666-6666-666666666666', 'Salón Parroquial', 'Sábado', '10:00:00', 6, 4, 'inactive', 'Centro')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CREAR MÉTRICAS SEMANALES (para las gráficas de tendencias)
-- ============================================================================

INSERT INTO discipleship_metrics (id, group_id, week_date, attendance, new_visitors, returning_visitors, conversions, baptisms, spiritual_temperature, leader_notes)
VALUES 
  -- Semana 1 (4 semanas atrás)
  ('m0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '28 days', 8, 2, 1, 0, 0, 7, 'Buena reunión'),
  ('m0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '28 days', 7, 1, 2, 0, 0, 6, 'Grupo pequeño'),
  ('m0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '28 days', 5, 0, 1, 0, 0, 5, 'Necesita más miembros'),
  
  -- Semana 2 (3 semanas atrás)
  ('m0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '21 days', 10, 3, 2, 1, 1, 8, 'Excelente crecimiento'),
  ('m0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '21 days', 8, 2, 1, 0, 0, 7, 'Estable'),
  ('m0000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '21 days', 6, 1, 0, 0, 0, 6, 'Un visitante nuevo'),
  
  -- Semana 3 (2 semanas atrás)
  ('m0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', 12, 4, 3, 2, 0, 9, 'Dos conversions'),
  ('m0000000-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '14 days', 9, 1, 2, 0, 0, 7, 'Buena asistencia'),
  ('m0000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '14 days', 7, 2, 1, 1, 0, 7, 'Mejorando'),
  
  -- Semana 4 (esta semana)
  ('m0000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 14, 5, 4, 3, 1, 9, 'Tres nuevos miembros'),
  ('m0000000-0000-0000-0000-000000000011', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '7 days', 10, 2, 3, 1, 0, 8, 'Grupo creciendo'),
  ('m0000000-0000-0000-0000-000000000012', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '7 days', 8, 1, 2, 0, 0, 7, 'estable')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CREAR OBJETIVOS ESTRATÉGICOS (para tab "Estratégico")
-- ============================================================================

INSERT INTO discipleship_goals (id, goal_type, target_metric, target_value, current_value, progress_percentage, deadline, zone_name, supervisor_id, status, description)
VALUES 
  ('g0000000-0000-0000-0000-000000000001', 'annual', 'total_members', 100, 45, 45.00, '2026-12-31', 'Norte', 'b2222222-2222-2222-2222-222222222222', 'active', 'Alcanzar 100 miembros en la zona Norte para fin de año'),
  ('g0000000-0000-0000-0000-000000000002', 'quarterly', 'weekly_attendance', 50, 38, 76.00, '2026-06-30', 'Centro', 'c3333333-3333-3333-3333-333333333333', 'active', '50 asistentes semanales en zona Centro'),
  ('g0000000-0000-0000-0000-000000000003', 'monthly', 'new_conversions', 10, 7, 70.00, '2026-05-31', 'Norte', 'b2222222-2222-2222-2222-222222222222', 'active', '10 conversiones nuevas este mes'),
  ('g0000000-0000-0000-0000-000000000004', 'quarterly', 'total_members', 20, 20, 100.00, '2026-03-31', 'Sur', 'c3333333-3333-3333-3333-333333333333', 'completed', 'Meta de miembros lograda'),
  ('g0000000-0000-0000-0000-000000000005', 'monthly', 'new_groups', 2, 0, 0.00, '2026-05-31', 'Todas', NULL, 'active', 'Iniciar 2 nuevos grupos')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. CREAR REPORTES PENDIENTES (para tab "Aprobaciones")
-- ============================================================================

INSERT INTO discipleship_reports (id, reporter_id, supervisor_id, report_level, report_type, period_start, period_end, report_data, status, submitted_at)
VALUES 
  ('r0000000-0000-0000-0000-000000000001', 'f6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444', 2, 'biweekly', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '1 day', 
   '{"attendance":45,"new_visitors":8,"conversions":3,"groups_under_supervision":3,"leaders_need_support":1}', 'submitted', CURRENT_DATE - INTERVAL '2 days'),
  ('r0000000-0000-0000-0000-000000000002', 'g7777777-7777-7777-7777-777777777777', 'd4444444-4444-4444-4444-444444444444', 2, 'biweekly', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '1 day', 
   '{"attendance":32,"new_visitors":5,"conversions":2,"groups_under_supervision":2,"leaders_need_support":0}', 'submitted', CURRENT_DATE - INTERVAL '1 day'),
  ('r0000000-0000-0000-0000-000000000003', 'd4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 3, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 
   '{"total_groups":8,"total_members":120,"monthly_growth":15,"zones_covered":2,"multiplications":2}', 'submitted', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. CREAR ALERTAS (para tab "Alertas")
-- ============================================================================

INSERT INTO discipleship_alerts (id, alert_type, title, message, related_group_id, related_user_id, zone_name, action_required, resolved, priority)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'warning', 'Grupo con baja asistencia', 'Célula Amor tuvo solo 5 asistentes las últimas 2 semanas', '33333333-3333-3333-3333-333333333333', 'j0000000-0000-0000-0000-000000000000', 'Norte', true, false, 2),
  ('a0000000-0000-0000-0000-000000000002', 'critical', 'Líder inactivo', 'El líder de Célula Fe no ha submetido reportes en 3 semanas', '22222222-2222-2222-2222-222222222222', 'i9999999-9999-9999-9999-999999999999', 'Norte', true, false, 1),
  ('a0000000-0000-0000-0000-000000000003', 'info', 'Grupo listos para multiplicar', 'Célula Victoria alcanzó 12 miembros activos', '44444444-4444-4444-4444-444444444444', 'c8c45cd7-22c4-416e-8ad9-4709af654708', 'Centro', false, false, 3),
  ('a0000000-0000-0000-0000-000000000004', 'success', 'Meta alcanzada', 'La zona Sur completó su meta trimestral', NULL, NULL, 'Sur', false, false, 4),
  ('a0000000-0000-0000-0000-000000000005', 'warning', 'Revisión de zona', 'La zona Norte necesita revisión de supervisión', NULL, 'd4444444-4444-4444-4444-444444444444', 'Norte', true, false, 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. VERIFICAR QUE TODO SE INSERTÓ
-- ============================================================================

SELECT 'Jerarquía' as tabla, COUNT(*) as registros FROM discipleship_hierarchy
UNION ALL
SELECT 'Grupos', COUNT(*) FROM discipleship_groups
UNION ALL
SELECT 'Métricas', COUNT(*) FROM discipleship_metrics
UNION ALL
SELECT 'Objetivos', COUNT(*) FROM discipleship_goals
UNION ALL
SELECT 'Reportes', COUNT(*) FROM discipleship_reports
UNION ALL
SELECT 'Alertas', COUNT(*) FROM discipleship_alerts;

-- ============================================================================
-- 10. VERIFICAR DASHBOARD (consultas que usa el backend Go)
-- ============================================================================

-- Stats del dashboard ( Pastor - nivel 5)
SELECT 
  COUNT(*) as total_groups,
  SUM(member_count) as total_members,
  COUNT(DISTINCT leader_id) as active_leaders,
  ROUND(AVG(attendance)) as avg_attendance,
  ROUND(AVG(spiritual_temperature), 1) as spiritual_health
FROM discipleship_metrics dm
JOIN discipleship_groups dg ON dm.group_id = dg.id
WHERE dm.week_date >= CURRENT_DATE - INTERVAL '28 days';

-- Objetivos activos
SELECT id, description, target_value, current_value, progress_percentage, status, deadline
FROM discipleship_goals 
WHERE status = 'active'
ORDER BY deadline ASC;

-- Reportes pendientes de aprobación
SELECT dr.id, dr.report_type, dr.period_start, dr.period_end, dr.status, u.first_name as reporter
FROM discipleship_reports dr
JOIN users u ON dr.reporter_id = u.id
WHERE dr.status = 'submitted';

-- Alertas sin resolver
SELECT id, title, message, priority, alert_type, zone_name
FROM discipleship_alerts 
WHERE resolved = false
ORDER BY priority ASC;

-- Tendencias semanales
SELECT 
  DATE_TRUNC('week', week_date) as week_start,
  SUM(attendance) as total_attendance,
  SUM(new_visitors) as total_visitors,
  SUM(conversions) as total_conversions,
  COUNT(DISTINCT group_id) as groups_reporting
FROM discipleship_metrics
GROUP BY week_start
ORDER BY week_start DESC
LIMIT 12;

-- Stats por zona
SELECT 
  dg.zone_name,
  COUNT(DISTINCT dg.id) as total_groups,
  SUM(dg.member_count) as total_members,
  SUM(dg.active_members) as active_members
FROM discipleship_groups dg
WHERE dg.status = 'active'
GROUP BY dg.zone_name;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================