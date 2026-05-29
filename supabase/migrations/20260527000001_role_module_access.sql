-- Role-level module access control
-- Allows admins to toggle which modules each role can access
-- Intersects with church_modules (installed) — both must be true

CREATE TABLE IF NOT EXISTS role_module_access (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  role        TEXT        NOT NULL CHECK (role IN ('pastor', 'staff', 'supervisor', 'server')),
  module_key  TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role, module_key)
);

-- RLS
ALTER TABLE role_module_access ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for AppSidebar / ProtectedRoute checks)
CREATE POLICY "role_module_access_read" ON role_module_access
  FOR SELECT USING (true);

-- Only pastor/staff can modify
CREATE POLICY "role_module_access_write" ON role_module_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('pastor', 'staff')
    )
  );

-- Defaults
INSERT INTO role_module_access (role, module_key, enabled) VALUES
  -- pastor: full access
  ('pastor', 'discipleship', true),
  ('pastor', 'reports',      true),
  ('pastor', 'zones',        true),
  ('pastor', 'events',       true),
  -- staff: full access
  ('staff',  'discipleship', true),
  ('staff',  'reports',      true),
  ('staff',  'zones',        true),
  ('staff',  'events',       true),
  -- supervisor: no reports
  ('supervisor', 'discipleship', true),
  ('supervisor', 'reports',      false),
  ('supervisor', 'zones',        true),
  ('supervisor', 'events',       true),
  -- server: events only
  ('server', 'discipleship', false),
  ('server', 'reports',      false),
  ('server', 'zones',        false),
  ('server', 'events',       true)
ON CONFLICT (role, module_key) DO NOTHING;
