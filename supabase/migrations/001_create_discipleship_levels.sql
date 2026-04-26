-- Tabla de niveles de discipulado
CREATE TABLE IF NOT EXISTS discipleship_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'users',
    color VARCHAR(20) DEFAULT '#3b82f6',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar niveles por defecto
INSERT INTO discipleship_levels (id, name, description, icon, color, order_index) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Pastoral', 'Nivel Pastoral', 'crown', '#8b5cf6', 1),
    ('22222222-2222-2222-2222-222222222222', 'Coordinador General', 'Coordinador General', 'shield', '#06b6d4', 2),
    ('33333333-3333-3333-3333-333333333333', 'Coordinador', 'Coordinador de zona', 'shield', '#10b981', 3),
    ('44444444-4444-4444-4444-444444444444', 'Supervisor Auxiliar', 'Supervisor Auxiliar', 'users', '#f59e0b', 4),
    ('55555555-5555-5555-5555-555555555555', 'Líder', 'Líder de célula', 'user', '#6b7280', 5)
ON CONFLICT DO NOTHING;