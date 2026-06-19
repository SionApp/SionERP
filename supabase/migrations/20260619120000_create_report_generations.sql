-- ─────────────────────────────────────────────────────────────
-- Reports module — traceability log of generated reports.
-- Analytics themselves are computed on the fly from existing tables;
-- this table records WHO generated WHAT report and WHEN (trazabilidad).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_generations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type  text NOT NULL
                 CHECK (report_type IN ('users','growth','demographics','activities')),
    format       text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv','pdf')),
    title        text,
    generated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_generations_at ON report_generations (generated_at DESC);

ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read report_generations"
    ON report_generations FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('supervisor','staff','pastor','admin'))
    );

CREATE POLICY "Staff insert report_generations"
    ON report_generations FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('supervisor','staff','pastor','admin'))
    );

-- ─────────────────────────────────────────────────────────────
-- Down migration (run manually if needed):
-- DROP TABLE IF EXISTS report_generations CASCADE;
-- ─────────────────────────────────────────────────────────────
