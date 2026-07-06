-- ─────────────────────────────────────────────────────────────
-- Events module — church events with RSVP/registration
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    description   text,
    event_date    date NOT NULL,
    start_time    text,                  -- 'HH:MM'
    end_time      text,
    location      text,
    category      text NOT NULL DEFAULT 'service'
                  CHECK (category IN ('service','conference','worship','youth','children','community')),
    is_recurring  boolean NOT NULL DEFAULT false,
    is_published  boolean NOT NULL DEFAULT false,
    max_attendees int,
    organizer     text,
    image_url     text,
    created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events (is_published, event_date);

-- RSVP: one row per (event, user). Attendee count = registrations with status 'going'.
CREATE TABLE IF NOT EXISTS event_registrations (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     text NOT NULL DEFAULT 'going'
               CHECK (status IN ('going','maybe','cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations (user_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read events"
    ON events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pastor staff manage events"
    ON events FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('pastor','staff','admin'))
    );

CREATE POLICY "Authenticated read registrations"
    ON event_registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own registrations"
    ON event_registrations FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Register the module (installed via the Modules screen, like the others).
INSERT INTO modules (key, name, description, is_installed)
VALUES ('events', 'Eventos', 'Gestión de eventos de la iglesia e inscripciones', false)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Down migration (run manually if needed):
-- DROP TABLE IF EXISTS event_registrations CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DELETE FROM modules WHERE key = 'events';
-- ─────────────────────────────────────────────────────────────
