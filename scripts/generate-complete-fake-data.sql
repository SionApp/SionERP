-- Script completo para generar datos fake en todas las tablas con relaciones
-- Ejecutar DESPUÉS de tener usuarios fake

-- Limpiar todas las tablas relacionadas (mantener users)
TRUNCATE TABLE discipleship_hierarchy RESTART IDENTITY CASCADE;
TRUNCATE TABLE discipleship_groups RESTART IDENTITY CASCADE;
TRUNCATE TABLE discipleship_metrics RESTART IDENTITY CASCADE;
TRUNCATE TABLE discipleship_reports RESTART IDENTITY CASCADE;
TRUNCATE TABLE discipleship_goals RESTART IDENTITY CASCADE;
TRUNCATE TABLE discipleship_alerts RESTART IDENTITY CASCADE;
TRUNCATE TABLE cell_multiplication_tracking RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE reports RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_profiles RESTART IDENTITY CASCADE;
TRUNCATE TABLE live_streams RESTART IDENTITY CASCADE;

-- 1. Crear Jerarquía de Discipulado (discipleship_hierarchy)
INSERT INTO discipleship_hierarchy (
    user_id, hierarchy_level, supervisor_id, zone_name, territory, active_groups_assigned
) 
SELECT 
    u.id,
    CASE 
        WHEN u.role = 'pastor' THEN 1
        WHEN u.role = 'staff' THEN 2
        WHEN u.role = 'supervisor' THEN 3
        WHEN u.role = 'server' THEN 4
    END,
    CASE 
        WHEN u.role = 'pastor' THEN NULL
        WHEN u.role = 'staff' THEN (SELECT id FROM users WHERE role = 'pastor' LIMIT 1)
        WHEN u.role = 'supervisor' THEN (SELECT id FROM users WHERE role = 'staff' LIMIT 1)
        WHEN u.role = 'server' THEN (SELECT id FROM users WHERE role = 'supervisor' AND zone_name = u.zone_name LIMIT 1)
    END,
    u.zone_name,
    CASE u.zone_name
        WHEN 'Centro' THEN 'Zona Metropolitana Central'
        WHEN 'Norte' THEN 'Sector Norte de la Ciudad'
        WHEN 'Sur' THEN 'Distrito Sur y Suburbios'
    END,
    CASE 
        WHEN u.role = 'supervisor' THEN 2
        WHEN u.role = 'server' THEN 0
        ELSE 0
    END
FROM users u
WHERE u.role IN ('pastor', 'staff', 'supervisor', 'server');

-- 2. Crear Grupos de Discipulado (discipleship_groups)
INSERT INTO discipleship_groups (
    group_name, leader_id, supervisor_id, meeting_location, meeting_day, 
    meeting_time, member_count, active_members, status, zone_name
)
SELECT 
    u.cell_group || ' - ' || u.zone_name as group_name,
    u.id as leader_id,
    (SELECT id FROM users WHERE role = 'supervisor' AND zone_name = u.zone_name LIMIT 1) as supervisor_id,
    CASE u.zone_name
        WHEN 'Centro' THEN 'Centro Comunitario Sion'
        WHEN 'Norte' THEN 'Casa de Oración Norte'
        WHEN 'Sur' THEN 'Templo Sur Sion'
    END as meeting_location,
    CASE (random() * 6)::int
        WHEN 0 THEN 'Lunes'
        WHEN 1 THEN 'Martes'
        WHEN 2 THEN 'Miércoles'
        WHEN 3 THEN 'Jueves'
        WHEN 4 THEN 'Viernes'
        WHEN 5 THEN 'Sábado'
        ELSE 'Domingo'
    END as meeting_day,
    (TIME '19:00' + (random() * INTERVAL '2 hours'))::time as meeting_time,
    (5 + (random() * 8))::int as member_count,
    (3 + (random() * 5))::int as active_members,
    CASE (random() * 3)::int
        WHEN 0 THEN 'active'
        WHEN 1 THEN 'growing'
        ELSE 'new'
    END as status,
    u.zone_name
FROM users u
WHERE u.role = 'server' AND u.cell_group IS NOT NULL;

-- 3. Crear Métricas de Discipulado (discipleship_metrics) - Últimas 12 semanas
INSERT INTO discipleship_metrics (
    group_id, week_date, attendance, new_visitors, conversions, 
    spiritual_temperature, leader_notes
)
WITH weeks AS (
    SELECT 
        generate_series(
            CURRENT_DATE - INTERVAL '12 weeks',
            CURRENT_DATE - INTERVAL '1 week',
            INTERVAL '1 week'
        )::date as week_date
),
groups_with_weeks AS (
    SELECT 
        dg.id as group_id,
        w.week_date
    FROM discipleship_groups dg
    CROSS JOIN weeks w
)
SELECT 
    gw.group_id,
    gw.week_date,
    (3 + (random() * (dg.member_count + 2)))::int as attendance,
    (random() * 3)::int as new_visitors,
    (random() * 2)::int as conversions,
    (1 + (random() * 10))::int as spiritual_temperature,
    CASE (random() * 5)::int
        WHEN 0 THEN 'Excelente reunión, todos muy participativos'
        WHEN 1 THEN 'Buen crecimiento, nuevos visitantes interesados'
        WHEN 2 THEN 'Reunión normal, algunos miembros ausentes'
        WHEN 3 THEN 'Momento de oración muy poderoso'
        ELSE 'Grupo en crecimiento, necesitamos más líderes'
    END as leader_notes
FROM groups_with_weeks gw
JOIN discipleship_groups dg ON gw.group_id = dg.id;

-- 4. Crear Reportes de Discipulado (discipleship_reports)
INSERT INTO discipleship_reports (
    hierarchy_id, report_date, total_groups, active_groups, 
    total_members, new_conversions, notes
)
SELECT 
    dh.id as hierarchy_id,
    CURRENT_DATE - INTERVAL '1 month' as report_date,
    (SELECT COUNT(*) FROM discipleship_groups WHERE zone_name = dh.zone_name) as total_groups,
    (SELECT COUNT(*) FROM discipleship_groups WHERE zone_name = dh.zone_name AND status = 'active') as active_groups,
    (SELECT SUM(member_count) FROM discipleship_groups WHERE zone_name = dh.zone_name) as total_members,
    (5 + (random() * 10))::int as new_conversions,
    'Reporte mensual de la zona ' || dh.zone_name || '. Crecimiento sostenido en todos los grupos.'
FROM discipleship_hierarchy dh
WHERE dh.hierarchy_level <= 3;

-- 5. Crear Objetivos de Discipulado (discipleship_goals)
INSERT INTO discipleship_goals (
    hierarchy_id, goal_type, target_value, current_value, 
    target_date, status, description
)
SELECT 
    dh.id as hierarchy_id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'member_growth'
        WHEN 1 THEN 'group_multiplication'
        WHEN 2 THEN 'conversion_rate'
        ELSE 'attendance_improvement'
    END as goal_type,
    (10 + (random() * 20))::int as target_value,
    (5 + (random() * 10))::int as current_value,
    CURRENT_DATE + INTERVAL '3 months' as target_date,
    CASE (random() * 2)::int
        WHEN 0 THEN 'on_track'
        ELSE 'in_progress'
    END as status,
    'Objetivo de ' || dh.zone_name || ' para el próximo trimestre'
FROM discipleship_hierarchy dh
WHERE dh.hierarchy_level <= 3;

-- 6. Crear Alertas de Discipulado (discipleship_alerts)
INSERT INTO discipleship_alerts (
    group_id, alert_type, message, severity, status, created_at
)
SELECT 
    dg.id as group_id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'low_attendance'
        WHEN 1 THEN 'leader_absence'
        WHEN 2 THEN 'new_visitors'
        ELSE 'spiritual_concern'
    END as alert_type,
    CASE (random() * 4)::int
        WHEN 0 THEN 'Asistencia baja en las últimas 2 semanas'
        WHEN 1 THEN 'Líder no ha reportado esta semana'
        WHEN 2 THEN 'Grupo tiene 3+ nuevos visitantes'
        ELSE 'Necesita atención pastoral urgente'
    END as message,
    CASE (random() * 2)::int
        WHEN 0 THEN 'medium'
        ELSE 'high'
    END as severity,
    CASE (random() * 2)::int
        WHEN 0 THEN 'pending'
        ELSE 'resolved'
    END as status,
    CURRENT_DATE - INTERVAL '1 week' + (random() * INTERVAL '7 days') as created_at
FROM discipleship_groups dg
WHERE random() < 0.3; -- Solo 30% de los grupos tienen alertas

-- 7. Crear Seguimiento de Multiplicación de Células (cell_multiplication_tracking)
INSERT INTO cell_multiplication_tracking (
    original_group_id, new_group_id, multiplication_date, 
    members_transferred, new_leader_id, notes
)
SELECT 
    dg1.id as original_group_id,
    dg2.id as new_group_id,
    CURRENT_DATE - INTERVAL '2 months' + (random() * INTERVAL '30 days') as multiplication_date,
    (2 + (random() * 4))::int as members_transferred,
    (SELECT id FROM users WHERE role = 'server' AND zone_name = dg2.zone_name LIMIT 1) as new_leader_id,
    'Multiplicación exitosa de grupo ' || dg1.group_name || ' a ' || dg2.group_name
FROM discipleship_groups dg1
JOIN discipleship_groups dg2 ON dg1.zone_name = dg2.zone_name AND dg1.id != dg2.id
WHERE random() < 0.2; -- Solo 20% de los grupos se multiplicaron

-- 8. Crear Permisos de Usuario (user_permissions)
INSERT INTO user_permissions (
    user_id, permission_name, resource, action, granted, granted_by
)
SELECT 
    u.id as user_id,
    CASE 
        WHEN u.role = 'pastor' THEN 'full_access'
        WHEN u.role = 'staff' THEN 'limited_admin'
        WHEN u.role = 'supervisor' THEN 'user_management'
        ELSE 'read_only'
    END as permission_name,
    CASE (random() * 3)::int
        WHEN 0 THEN 'users'
        WHEN 1 THEN 'reports'
        ELSE 'discipleship'
    END as resource,
    CASE 
        WHEN u.role = 'pastor' THEN 'all'
        WHEN u.role = 'staff' THEN 'read_update'
        ELSE 'read'
    END as action,
    true as granted,
    (SELECT id FROM users WHERE role = 'pastor' LIMIT 1) as granted_by
FROM users u;

-- 9. Crear Logs de Auditoría (audit_logs)
INSERT INTO audit_logs (
    user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent
)
SELECT 
    u.id as user_id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'CREATE'
        WHEN 1 THEN 'UPDATE'
        WHEN 2 THEN 'DELETE'
        ELSE 'LOGIN'
    END as action,
    CASE (random() * 3)::int
        WHEN 0 THEN 'user'
        WHEN 1 THEN 'discipleship_group'
        ELSE 'report'
    END as resource,
    gen_random_uuid() as resource_id,
    '{}' as old_values,
    '{"status": "updated"}' as new_values,
    '192.168.1.' || (100 + (random() * 50))::int as ip_address,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' as user_agent
FROM users u
WHERE random() < 0.5; -- Solo 50% de usuarios tienen logs

-- 10. Crear Reportes Generales (reports)
INSERT INTO reports (
    title, report_type, data, created_by, created_at
)
VALUES 
('Reporte Mensual de Discipulado', 'discipleship_monthly', 
 '{"total_groups": 8, "active_groups": 6, "total_members": 45, "new_conversions": 12}', 
 (SELECT id FROM users WHERE role = 'pastor' LIMIT 1), 
 CURRENT_DATE - INTERVAL '1 week'),
('Análisis de Crecimiento por Zona', 'zone_analysis', 
 '{"centro": {"groups": 3, "members": 18}, "norte": {"groups": 2, "members": 12}, "sur": {"groups": 3, "members": 15}}', 
 (SELECT id FROM users WHERE role = 'staff' LIMIT 1), 
 CURRENT_DATE - INTERVAL '2 weeks'),
('Reporte de Multiplicación de Células', 'cell_multiplication', 
 '{"multiplied_groups": 2, "new_leaders": 2, "members_transferred": 8}', 
 (SELECT id FROM users WHERE role = 'supervisor' LIMIT 1), 
 CURRENT_DATE - INTERVAL '3 weeks');

-- 11. Crear Perfiles de Usuario (user_profiles)
INSERT INTO user_profiles (
    user_id, module_name, profile_data
)
SELECT 
    u.id as user_id,
    CASE (random() * 3)::int
        WHEN 0 THEN 'discipleship_preferences'
        WHEN 1 THEN 'notification_settings'
        ELSE 'dashboard_layout'
    END as module_name,
    CASE (random() * 3)::int
        WHEN 0 THEN '{"theme": "dark", "language": "es", "notifications": true}'
        WHEN 1 THEN '{"email_alerts": true, "sms_alerts": false, "weekly_reports": true}'
        ELSE '{"widgets": ["metrics", "alerts", "goals"], "layout": "grid"}'
    END::jsonb as profile_data
FROM users u
WHERE random() < 0.7; -- 70% de usuarios tienen perfiles

-- 12. Crear Streams en Vivo (live_streams)
INSERT INTO live_streams (
    title, description, stream_url, is_active, start_time, end_time, created_by
)
VALUES 
('Servicio Dominical - Culto Principal', 'Servicio dominical de la Iglesia Sion con predicación y alabanza', 
 'https://youtube.com/watch?v=sion-sunday-1', true, 
 CURRENT_DATE + INTERVAL '1 day' + TIME '10:00', 
 CURRENT_DATE + INTERVAL '1 day' + TIME '12:00', 
 (SELECT id FROM users WHERE role = 'pastor' LIMIT 1)),
('Estudio Bíblico - Jueves', 'Estudio bíblico semanal para miembros', 
 'https://youtube.com/watch?v=sion-study-1', false, 
 CURRENT_DATE + INTERVAL '3 days' + TIME '19:00', 
 CURRENT_DATE + INTERVAL '3 days' + TIME '20:30', 
 (SELECT id FROM users WHERE role = 'pastor' LIMIT 1)),
('Conferencia de Jóvenes', 'Evento especial para el ministerio juvenil', 
 'https://youtube.com/watch?v=sion-youth-1', false, 
 CURRENT_DATE - INTERVAL '1 week' + TIME '18:00', 
 CURRENT_DATE - INTERVAL '1 week' + TIME '21:00', 
 (SELECT id FROM users WHERE email = 'pastor.juventud@iglesiasion.com'));

-- Mostrar resumen de datos creados
SELECT 'discipleship_hierarchy' as tabla, COUNT(*) as registros FROM discipleship_hierarchy
UNION ALL
SELECT 'discipleship_groups', COUNT(*) FROM discipleship_groups
UNION ALL
SELECT 'discipleship_metrics', COUNT(*) FROM discipleship_metrics
UNION ALL
SELECT 'discipleship_reports', COUNT(*) FROM discipleship_reports
UNION ALL
SELECT 'discipleship_goals', COUNT(*) FROM discipleship_goals
UNION ALL
SELECT 'discipleship_alerts', COUNT(*) FROM discipleship_alerts
UNION ALL
SELECT 'cell_multiplication_tracking', COUNT(*) FROM cell_multiplication_tracking
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM user_permissions
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'live_streams', COUNT(*) FROM live_streams
ORDER BY tabla;
