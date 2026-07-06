-- Migration: create_music
-- Creates all tables for the music (worship team) module.
-- Additive + install-gated. Down-migration at bottom.

-- ─────────────────────────────────────────────────────────────
-- 1. music_members
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_members (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    funciones    text[] NOT NULL DEFAULT '{}' CHECK (
                     funciones <@ ARRAY['corista','musico','tecnico','danzarina']::text[]
                     AND array_length(funciones, 1) >= 1
                 ),
    instrument   text,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT music_members_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_music_members_funciones ON music_members USING GIN (funciones);
CREATE INDEX IF NOT EXISTS idx_music_members_is_active ON music_members (is_active);

-- ─────────────────────────────────────────────────────────────
-- 2. music_events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date   date NOT NULL,
    event_type   text NOT NULL CHECK (event_type IN ('viernes','domingo','especial')),
    title        text,
    notes        text,
    published    boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT music_events_date_type_unique UNIQUE (event_date, event_type)
);

CREATE INDEX IF NOT EXISTS idx_music_events_date ON music_events (event_date);

-- ─────────────────────────────────────────────────────────────
-- 3. music_assignments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES music_events(id) ON DELETE CASCADE,
    member_id   uuid NOT NULL REFERENCES music_members(id) ON DELETE CASCADE,
    funcion     text NOT NULL CHECK (funcion IN ('corista','musico','tecnico','danzarina')),
    state       text NOT NULL DEFAULT 'asignado'
                    CHECK (state IN ('asignado','confirmado','no_puedo')),
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT music_assignments_event_member_unique UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_music_assignments_member_id    ON music_assignments (member_id);
CREATE INDEX IF NOT EXISTS idx_music_assignments_event_state  ON music_assignments (event_id, state);
CREATE INDEX IF NOT EXISTS idx_music_assignments_assigned_by  ON music_assignments (assigned_by);

-- ─────────────────────────────────────────────────────────────
-- 4. music_songs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_songs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             text NOT NULL,
    name_normalized  text NOT NULL,
    author           text,
    default_key      text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT music_songs_name_normalized_unique UNIQUE (name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_music_songs_name_normalized ON music_songs (name_normalized);

-- ─────────────────────────────────────────────────────────────
-- 5. music_event_songs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_event_songs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    uuid NOT NULL REFERENCES music_events(id) ON DELETE CASCADE,
    song_id     uuid NOT NULL REFERENCES music_songs(id) ON DELETE CASCADE,
    tono        text,
    order_index int NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT music_event_songs_event_song_unique UNIQUE (event_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_music_event_songs_song_id  ON music_event_songs (song_id);
CREATE INDEX IF NOT EXISTS idx_music_event_songs_event_id ON music_event_songs (event_id);

-- ─────────────────────────────────────────────────────────────
-- 6. music_unavailability
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_unavailability (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id   uuid NOT NULL REFERENCES music_members(id) ON DELETE CASCADE,
    start_date  date NOT NULL,
    end_date    date,           -- NULL = open-ended (indefinite)
    reason      text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_music_unavailability_member_range
    ON music_unavailability (member_id, start_date, end_date);

-- ─────────────────────────────────────────────────────────────
-- 7. updated_at triggers (reuse existing function)
-- ─────────────────────────────────────────────────────────────
CREATE TRIGGER trg_music_members_updated_at
    BEFORE UPDATE ON music_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_music_events_updated_at
    BEFORE UPDATE ON music_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_music_assignments_updated_at
    BEFORE UPDATE ON music_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 8. Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE music_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_songs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_event_songs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_unavailability ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (module gating handled by Go middleware)
CREATE POLICY "Authenticated read music_members"
    ON music_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read music_events"
    ON music_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read music_assignments"
    ON music_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read music_songs"
    ON music_songs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read music_event_songs"
    ON music_event_songs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read music_unavailability"
    ON music_unavailability FOR SELECT TO authenticated USING (true);

-- ALL (manage): pastor/staff users — mirrors zones pattern
CREATE POLICY "Pastor staff manage music_members"
    ON music_members FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

CREATE POLICY "Pastor staff manage music_events"
    ON music_events FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

CREATE POLICY "Pastor staff manage music_assignments"
    ON music_assignments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

CREATE POLICY "Pastor staff manage music_songs"
    ON music_songs FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

CREATE POLICY "Pastor staff manage music_event_songs"
    ON music_event_songs FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

CREATE POLICY "Pastor staff manage music_unavailability"
    ON music_unavailability FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 9. Module registry seed
-- ─────────────────────────────────────────────────────────────
INSERT INTO modules (key, name, description, is_installed)
VALUES ('music', 'Música', 'Gestión del equipo de alabanza y cultos', false)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Down migration (run manually if needed):
-- DROP TABLE IF EXISTS music_unavailability CASCADE;
-- DROP TABLE IF EXISTS music_event_songs CASCADE;
-- DROP TABLE IF EXISTS music_songs CASCADE;
-- DROP TABLE IF EXISTS music_assignments CASCADE;
-- DROP TABLE IF EXISTS music_events CASCADE;
-- DROP TABLE IF EXISTS music_members CASCADE;
-- DELETE FROM modules WHERE key = 'music';
-- ─────────────────────────────────────────────────────────────
