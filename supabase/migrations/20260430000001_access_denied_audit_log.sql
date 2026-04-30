-- Migration: Access denied audit log table
-- Date: 2026-04-30
-- Description: Stores all denied access attempts for security monitoring

CREATE TABLE IF NOT EXISTS access_denied_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT,
    user_role TEXT,
    user_role_level INTEGER,
    required_level INTEGER,
    denied_reason TEXT NOT NULL,          -- 'insufficient_role', 'module_not_installed', 'resource_scope'
    http_method TEXT NOT NULL,
    request_path TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,                         -- Extra context (e.g., target user ID, module name)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user (who keeps getting denied?)
CREATE INDEX IF NOT EXISTS idx_access_denied_user_id ON access_denied_logs(user_id);

-- Index for querying recent denials
CREATE INDEX IF NOT EXISTS idx_access_denied_created_at ON access_denied_logs(created_at DESC);

-- Index for querying by reason (what kind of denials are most common?)
CREATE INDEX IF NOT EXISTS idx_access_denied_reason ON access_denied_logs(denied_reason);

-- RLS policy: only admins can view access denied logs
ALTER TABLE access_denied_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access denied logs" ON access_denied_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role IN ('admin', 'owner')
        )
    );

-- No one can delete audit logs (append-only)
CREATE POLICY "No deletes on access denied logs" ON access_denied_logs
    FOR DELETE USING (false);
