-- Miembros de grupos de discipulado
CREATE TABLE IF NOT EXISTS discipleship_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES discipleship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_group TEXT DEFAULT 'member', -- 'leader', 'member', 'helper', 'visitor'
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Asistencia de miembros a reuniones de discipulado
CREATE TABLE IF NOT EXISTS discipleship_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES discipleship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    present BOOLEAN DEFAULT true,
    attendance_type TEXT DEFAULT 'regular', -- 'regular', 'new_visitor', 'returning_visitor'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id, meeting_date)
);

-- Índices para optimizar consultas
CREATE INDEX idx_group_members_group ON discipleship_group_members(group_id);
CREATE INDEX idx_group_members_user ON discipleship_group_members(user_id);
CREATE INDEX idx_group_members_active ON discipleship_group_members(is_active);

CREATE INDEX idx_attendance_group_date ON discipleship_attendance(group_id, meeting_date);
CREATE INDEX idx_attendance_user_date ON discipleship_attendance(user_id, meeting_date);
CREATE INDEX idx_attendance_date ON discipleship_attendance(meeting_date);

-- Trigger para actualizar member_count en grupos cuando cambia la membresía
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE discipleship_groups 
    SET member_count = (
        SELECT COUNT(*) FROM discipleship_group_members 
        WHERE group_id = NEW.group_id AND is_active = true
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR UPDATE OR DELETE ON discipleship_group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();