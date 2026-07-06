-- ─────────────────────────────────────────────────────────────
-- Music module — Telegram channel ingestion
-- The bot (admin of the worship channel) ingests audio posts into this
-- pool. We store only references (file_id) — never the bytes. Downloads
-- are proxied on-demand through the backend, so Telegram stays the CDN
-- and there is nothing to clean up weekly.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS music_telegram_files (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- file_unique_id is stable across re-uploads/bots → dedup key.
    file_unique_id text NOT NULL UNIQUE,
    -- file_id is what getFile/download needs (can change; refreshed on upsert).
    file_id        text NOT NULL,
    message_id     bigint,
    file_name      text,
    title          text,
    performer      text,
    mime_type      text,
    duration       int,
    file_size      bigint,
    channel_date   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Search by title/file name (musicians look up "this week's songs").
CREATE INDEX IF NOT EXISTS idx_music_tg_search
    ON music_telegram_files (lower(coalesce(title, file_name, '')));
CREATE INDEX IF NOT EXISTS idx_music_tg_date
    ON music_telegram_files (channel_date DESC);

ALTER TABLE music_telegram_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read music_telegram_files"
    ON music_telegram_files FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Pastor staff manage music_telegram_files"
    ON music_telegram_files FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('pastor','staff','admin')
        )
    );

-- ─────────────────────────────────────────────────────────────
-- Down migration (run manually if needed):
-- DROP TABLE IF EXISTS music_telegram_files CASCADE;
-- ─────────────────────────────────────────────────────────────
