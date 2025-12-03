-- Limpiar audit logs que no tienen un usuario válido asociado
DELETE FROM audit_logs 
WHERE changed_by IS NULL 
   OR changed_by NOT IN (SELECT id FROM users);