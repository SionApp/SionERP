-- Script para hacer backup de datos reales de usuarios
-- Ejecutar este script ANTES de borrar los datos

-- Crear tabla temporal para backup
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT 
    id,
    email,
    first_name,
    last_name,
    id_number,
    phone,
    address,
    role,
    birth_date,
    baptized,
    baptism_date,
    zone_name,
    cell_leader_id,
    is_active,
    created_at,
    updated_at,
    marital_status,
    occupation,
    education_level,
    how_found_church,
    ministry_interest,
    first_visit_date,
    is_active_member,
    membership_date,
    cell_group,
    pastoral_notes,
    whatsapp,
    territory,
    discipleship_level,
    active_groups_count
FROM users;

-- Exportar a CSV (esto se ejecutará desde la línea de comandos)
-- \COPY users_backup TO '/Users/danzt/Codes/SionERP/data/users-backup.csv' WITH CSV HEADER;
