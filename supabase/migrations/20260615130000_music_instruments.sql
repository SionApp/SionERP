-- ─────────────────────────────────────────────────────────────
-- Music module — instrument catalog
-- Each church administers its own set. The category drives the visual
-- identity (icon + color) in the UI and lets "Voz principal" vs "Coros"
-- and tech roles (Sonido/Luces) live alongside actual instruments.
-- Member.instrument stays a text field that picks from this catalog
-- (ponytail: no member-handler changes; category is resolved by name).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS music_instruments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    category   text NOT NULL DEFAULT 'otro'
               CHECK (category IN ('voz','cuerdas','teclas','percusion','viento','tecnico','otro')),
    is_active  boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness. An expression must live in a unique INDEX,
-- not an inline table constraint (Postgres rejects UNIQUE (lower(name))).
CREATE UNIQUE INDEX IF NOT EXISTS idx_music_instruments_name
    ON music_instruments (lower(name));

CREATE INDEX IF NOT EXISTS idx_music_instruments_active
    ON music_instruments (is_active, sort_order);

ALTER TABLE music_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read music_instruments"
    ON music_instruments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Pastor staff manage music_instruments"
    ON music_instruments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

-- Seed a sensible starter set every church can prune/extend.
INSERT INTO music_instruments (name, category, sort_order) VALUES
    ('Voz principal',        'voz',       10),
    ('Coros',                'voz',       11),
    ('Guitarra eléctrica',   'cuerdas',   20),
    ('Guitarra acústica',    'cuerdas',   21),
    ('Bajo',                 'cuerdas',   22),
    ('Piano',                'teclas',    30),
    ('Teclado / Sintetizador','teclas',   31),
    ('Batería',              'percusion', 40),
    ('Cajón',                'percusion', 41),
    ('Percusión',            'percusion', 42),
    ('Saxofón',              'viento',    50),
    ('Trompeta',             'viento',    51),
    ('Sonido',               'tecnico',   60),
    ('Luces',                'tecnico',   61),
    ('Streaming / Cámara',   'tecnico',   62)
ON CONFLICT (lower(name)) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Down migration (run manually if needed):
-- DROP TABLE IF EXISTS music_instruments CASCADE;
-- ─────────────────────────────────────────────────────────────
