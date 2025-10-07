-- Script final para generar datos fake en todas las tablas con relaciones correctas
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
        WHEN 1 THEN 'inactive'
        ELSE 'multiplying'
    END as status,
    u.zone_name
FROM users u
WHERE u.role = 'server' AND u.cell_group IS NOT NULL;

-- 3. Crear Métricas de Discipulado (discipleship_metrics) - Últimas 12 semanas
INSERT INTO discipleship_metrics (
    group_id, week_date, attendance, new_visitors, returning_visitors, 
    testimonies_count, prayer_requests, spiritual_temperature, leader_notes,
    week_number, month_year, conversions, baptisms, first_time_visitors,
    cells_multiplied, leaders_trained, offering_amount, special_events
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
        w.week_date,
        EXTRACT(week FROM w.week_date) as week_num,
        TO_CHAR(w.week_date, 'YYYY-MM') as month_year
    FROM discipleship_groups dg
    CROSS JOIN weeks w
)
SELECT 
    gw.group_id,
    gw.week_date,
    (3 + (random() * (dg.member_count + 2)))::int as attendance,
    (random() * 3)::int as new_visitors,
    (random() * 2)::int as returning_visitors,
    (random() * 2)::int as testimonies_count,
    (random() * 4)::int as prayer_requests,
    (1 + (random() * 10))::int as spiritual_temperature, -- 1-10 scale
    CASE (random() * 5)::int
        WHEN 0 THEN 'Excelente reunión, todos muy participativos'
        WHEN 1 THEN 'Buen crecimiento, nuevos visitantes interesados'
        WHEN 2 THEN 'Reunión normal, algunos miembros ausentes'
        WHEN 3 THEN 'Momento de oración muy poderoso'
        ELSE 'Grupo en crecimiento, necesitamos más líderes'
    END as leader_notes,
    gw.week_num as week_number,
    gw.month_year,
    (random() * 2)::int as conversions,
    (random() * 1)::int as baptisms,
    (random() * 3)::int as first_time_visitors,
    (random() * 1)::int as cells_multiplied,
    (random() * 1)::int as leaders_trained,
    (50 + (random() * 200))::numeric as offering_amount,
    (random() * 2)::int as special_events
FROM groups_with_weeks gw
JOIN discipleship_groups dg ON gw.group_id = dg.id;

-- 4. Crear Reportes de Discipulado (discipleship_reports)
INSERT INTO discipleship_reports (
    reporter_id, supervisor_id, report_level, report_type, period_start, 
    period_end, report_data, status, submitted_at
)
SELECT 
    dh.user_id as reporter_id,
    dh.supervisor_id,
    dh.hierarchy_level as report_level,
    CASE (random() * 2)::int
        WHEN 0 THEN 'weekly'
        WHEN 1 THEN 'monthly'
        ELSE 'quarterly'
    END as report_type,
    CURRENT_DATE - INTERVAL '1 month' as period_start,
    CURRENT_DATE - INTERVAL '1 day' as period_end,
    jsonb_build_object(
        'total_groups', (SELECT COUNT(*) FROM discipleship_groups WHERE zone_name = dh.zone_name),
        'active_groups', (SELECT COUNT(*) FROM discipleship_groups WHERE zone_name = dh.zone_name AND status = 'active'),
        'total_members', (SELECT COALESCE(SUM(member_count), 0) FROM discipleship_groups WHERE zone_name = dh.zone_name),
        'new_conversions', (5 + (random() * 10))::int,
        'zone', dh.zone_name
    ) as report_data,
    CASE (random() * 2)::int
        WHEN 0 THEN 'submitted'
        WHEN 1 THEN 'approved'
        ELSE 'pending'
    END as status,
    CURRENT_DATE - INTERVAL '1 week' + (random() * INTERVAL '7 days') as submitted_at
FROM discipleship_hierarchy dh
WHERE dh.hierarchy_level <= 3;

-- 5. Crear Objetivos de Discipulado (discipleship_goals)
INSERT INTO discipleship_goals (
    goal_type, target_metric, target_value, current_value, progress_percentage,
    deadline, zone_name, supervisor_id, status, description
)
SELECT 
    CASE (random() * 4)::int
        WHEN 0 THEN 'member_growth'
        WHEN 1 THEN 'group_multiplication'
        WHEN 2 THEN 'conversion_rate'
        ELSE 'attendance_improvement'
    END as goal_type,
    CASE (random() * 3)::int
        WHEN 0 THEN 'total_members'
        WHEN 1 THEN 'weekly_attendance'
        ELSE 'new_conversions'
    END as target_metric,
    (10 + (random() * 20))::int as target_value,
    (5 + (random() * 10))::int as current_value,
    ((5 + (random() * 10))::numeric / (10 + (random() * 20))::numeric * 100)::numeric as progress_percentage,
    CURRENT_DATE + INTERVAL '3 months' as deadline,
    dh.zone_name,
    dh.supervisor_id,
    CASE (random() * 2)::int
        WHEN 0 THEN 'on_track'
        ELSE 'in_progress'
    END as status,
    'Objetivo de ' || dh.zone_name || ' para el próximo trimestre'
FROM discipleship_hierarchy dh
WHERE dh.hierarchy_level <= 3;

-- 6. Crear Alertas de Discipulado (discipleship_alerts)
INSERT INTO discipleship_alerts (
    alert_type, title, message, related_group_id, related_user_id, zone_name,
    action_required, resolved, priority, expires_at
)
SELECT 
    CASE (random() * 4)::int
        WHEN 0 THEN 'low_attendance'
        WHEN 1 THEN 'leader_absence'
        WHEN 2 THEN 'new_visitors'
        ELSE 'spiritual_concern'
    END as alert_type,
    CASE (random() * 4)::int
        WHEN 0 THEN 'Asistencia Baja Detectada'
        WHEN 1 THEN 'Líder No Ha Reportado'
        WHEN 2 THEN 'Múltiples Nuevos Visitantes'
        ELSE 'Atención Pastoral Requerida'
    END as title,
    CASE (random() * 4)::int
        WHEN 0 THEN 'Asistencia baja en las últimas 2 semanas'
        WHEN 1 THEN 'Líder no ha reportado esta semana'
        WHEN 2 THEN 'Grupo tiene 3+ nuevos visitantes'
        ELSE 'Necesita atención pastoral urgente'
    END as message,
    dg.id as related_group_id,
    dg.leader_id as related_user_id,
    dg.zone_name,
    (random() * 2)::int = 1 as action_required,
    (random() * 3)::int = 0 as resolved, -- Solo 33% resueltas
    (1 + (random() * 3))::int as priority,
    CURRENT_DATE + INTERVAL '1 week' as expires_at
FROM discipleship_groups dg
WHERE random() < 0.3; -- Solo 30% de los grupos tienen alertas

-- 7. Crear Seguimiento de Multiplicación de Células (cell_multiplication_tracking)
INSERT INTO cell_multiplication_tracking (
    parent_group_id, new_group_id, multiplication_date, new_leader_id, parent_leader_id,
    initial_members, multiplication_type, success_status, notes
)
SELECT 
    dg1.id as parent_group_id,
    dg2.id as new_group_id,
    CURRENT_DATE - INTERVAL '2 months' + (random() * INTERVAL '30 days') as multiplication_date,
    (SELECT id FROM users WHERE role = 'server' AND zone_name = dg2.zone_name LIMIT 1) as new_leader_id,
    dg1.leader_id as parent_leader_id,
    (2 + (random() * 4))::int as initial_members,
    CASE (random() * 2)::int
        WHEN 0 THEN 'natural_growth'
        ELSE 'planned_split'
    END as multiplication_type,
    CASE (random() * 2)::int
        WHEN 0 THEN 'successful'
        ELSE 'in_progress'
    END as success_status,
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
    table_name, record_id, action, old_values, new_values, changed_by, changed_at
)
SELECT 
    CASE (random() * 3)::int
        WHEN 0 THEN 'users'
        WHEN 1 THEN 'discipleship_groups'
        ELSE 'discipleship_metrics'
    END as table_name,
    gen_random_uuid() as record_id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'CREATE'
        WHEN 1 THEN 'UPDATE'
        WHEN 2 THEN 'DELETE'
        ELSE 'LOGIN'
    END as action,
    '{}' as old_values,
    '{"status": "updated", "timestamp": "' || CURRENT_TIMESTAMP || '"}' as new_values,
    u.id as changed_by,
    CURRENT_DATE - INTERVAL '1 week' + (random() * INTERVAL '7 days') as changed_at
FROM users u
WHERE random() < 0.5; -- Solo 50% de usuarios tienen logs

-- 10. Crear Reportes Generales (reports)
INSERT INTO reports (
    title, type, parameters, generated_by, generated_at, file_url, status
)
VALUES 
('Reporte Mensual de Discipulado', 'discipleship_monthly', 
 '{"period": "2025-09", "include_metrics": true, "include_growth": true}', 
 (SELECT id FROM users WHERE role = 'pastor' LIMIT 1), 
 CURRENT_DATE - INTERVAL '1 week', 
 'https://storage.supabase.co/reports/discipleship-sept-2025.pdf',
 'completed'),
('Análisis de Crecimiento por Zona', 'zone_analysis', 
 '{"zones": ["Centro", "Norte", "Sur"], "period": "Q3-2025"}', 
 (SELECT id FROM users WHERE role = 'staff' LIMIT 1), 
 CURRENT_DATE - INTERVAL '2 weeks', 
 'https://storage.supabase.co/reports/zone-growth-q3-2025.pdf',
 'completed'),
('Reporte de Multiplicación de Células', 'cell_multiplication', 
 '{"period": "last_quarter", "include_success_rate": true}', 
 (SELECT id FROM users WHERE role = 'supervisor' LIMIT 1), 
 CURRENT_DATE - INTERVAL '3 weeks', 
 'https://storage.supabase.co/reports/cell-multiplication-q3-2025.pdf',
 'completed');

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
    youtube_video_id, title, description, is_live, scheduled_start, actual_start
)
VALUES 
('sion-sunday-2025-10-07', 'Servicio Dominical - Culto Principal', 
 'Servicio dominical de la Iglesia Sion con predicación y alabanza', 
 true, 
 CURRENT_DATE + INTERVAL '1 day' + TIME '10:00', 
 CURRENT_DATE + INTERVAL '1 day' + TIME '10:05'),
('sion-study-2025-10-10', 'Estudio Bíblico - Jueves', 
 'Estudio bíblico semanal para miembros', 
 false, 
 CURRENT_DATE + INTERVAL '3 days' + TIME '19:00', 
 CURRENT_DATE + INTERVAL '3 days' + TIME '19:10'),
('sion-youth-2025-09-29', 'Conferencia de Jóvenes', 
 'Evento especial para el ministerio juvenil', 
 false, 
 CURRENT_DATE - INTERVAL '1 week' + TIME '18:00', 
 CURRENT_DATE - INTERVAL '1 week' + TIME '18:05');

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
