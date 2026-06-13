-- Migration: music_song_links
-- Adds link (YouTube/chart reference) to the song catalog and per-culto notes
-- (description / indications) to the event-song relation.

ALTER TABLE music_songs ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE music_event_songs ADD COLUMN IF NOT EXISTS notes text;
