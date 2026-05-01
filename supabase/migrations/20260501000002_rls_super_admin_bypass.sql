-- Add super_admin bypass to all RLS policies that check roles directly
-- (policies using can_access_user() are already covered by the previous migration)

-- =============================================
-- ADMIN-ONLY TABLES (pastor/staff -> + super_admin)
-- =============================================

-- access_denied_logs
DROP POLICY IF EXISTS "Admins can view access denied logs" ON access_denied_logs;
CREATE POLICY "Admins can view access denied logs" ON access_denied_logs
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- audit_logs
DROP POLICY IF EXISTS "Only pastors and staff can view audit logs" ON audit_logs;
CREATE POLICY "Only pastors and staff can view audit logs" ON audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- cell_multiplication_tracking
DROP POLICY IF EXISTS "Pastor and staff can manage multiplication tracking" ON cell_multiplication_tracking;
CREATE POLICY "Pastor and staff can manage multiplication tracking" ON cell_multiplication_tracking
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view accessible multiplication records" ON cell_multiplication_tracking;
CREATE POLICY "Users can view accessible multiplication records" ON cell_multiplication_tracking
  FOR SELECT USING (
    public.is_super_admin()
    OR can_access_user(parent_leader_id)
    OR can_access_user(new_leader_id)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- church_info
DROP POLICY IF EXISTS "Pastor/Staff can update church_info" ON church_info;
CREATE POLICY "Pastor/Staff can update church_info" ON church_info
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- discipleship_alerts
DROP POLICY IF EXISTS "Pastor and staff can manage alerts" ON discipleship_alerts;
CREATE POLICY "Pastor and staff can manage alerts" ON discipleship_alerts
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view their alerts" ON discipleship_alerts;
CREATE POLICY "Users can view their alerts" ON discipleship_alerts
  FOR SELECT USING (
    public.is_super_admin()
    OR related_user_id = auth.uid()
    OR can_access_user(related_user_id)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- discipleship_goals
DROP POLICY IF EXISTS "Pastor and staff can manage goals" ON discipleship_goals;
CREATE POLICY "Pastor and staff can manage goals" ON discipleship_goals
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view accessible goals" ON discipleship_goals;
CREATE POLICY "Users can view accessible goals" ON discipleship_goals
  FOR SELECT USING (
    public.is_super_admin()
    OR supervisor_id IS NULL
    OR can_access_user(supervisor_id)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- discipleship_groups
DROP POLICY IF EXISTS "Pastor and staff can delete discipleship groups" ON discipleship_groups;
CREATE POLICY "Pastor and staff can delete discipleship groups" ON discipleship_groups
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Pastor and staff can update discipleship groups" ON discipleship_groups;
CREATE POLICY "Pastor and staff can update discipleship groups" ON discipleship_groups
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Pastor and staff can manage discipleship groups" ON discipleship_groups;
CREATE POLICY "Pastor and staff can manage discipleship groups" ON discipleship_groups
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view accessible groups" ON discipleship_groups;
CREATE POLICY "Users can view accessible groups" ON discipleship_groups
  FOR SELECT USING (
    public.is_super_admin()
    OR can_access_user(leader_id)
    OR can_access_user(supervisor_id)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- discipleship_hierarchy
DROP POLICY IF EXISTS "Supervisors can manage hierarchy" ON discipleship_hierarchy;
CREATE POLICY "Supervisors can manage hierarchy" ON discipleship_hierarchy
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view accessible hierarchy" ON discipleship_hierarchy;
CREATE POLICY "Users can view accessible hierarchy" ON discipleship_hierarchy
  FOR SELECT USING (
    public.is_super_admin() OR can_access_user(user_id));

-- discipleship_reports
DROP POLICY IF EXISTS "Users can manage their own reports" ON discipleship_reports;
CREATE POLICY "Users can manage their own reports" ON discipleship_reports
  FOR ALL USING (
    public.is_super_admin() OR auth.uid() = reporter_id
  );

-- live_streams
DROP POLICY IF EXISTS "Only pastor and staff can manage live streams" ON live_streams;
CREATE POLICY "Only pastor and staff can manage live streams" ON live_streams
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- notification_config
DROP POLICY IF EXISTS "Pastor/Staff can read notification_config" ON notification_config;
CREATE POLICY "Pastor/Staff can read notification_config" ON notification_config
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Pastor/Staff can update notification_config" ON notification_config;
CREATE POLICY "Pastor/Staff can update notification_config" ON notification_config
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- permissions
DROP POLICY IF EXISTS "Allow CRUD to pastors and staff" ON permissions;
CREATE POLICY "Allow CRUD to pastors and staff" ON permissions
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- reports
DROP POLICY IF EXISTS "Only pastors and staff can generate and view reports" ON reports;
CREATE POLICY "Only pastors and staff can generate and view reports" ON reports
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- role_permissions
DROP POLICY IF EXISTS "Allow CRUD to pastors and staff" ON role_permissions;
CREATE POLICY "Allow CRUD to pastors and staff" ON role_permissions
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- settings_audit_log
DROP POLICY IF EXISTS "Pastor/Staff can view audit" ON settings_audit_log;
CREATE POLICY "Pastor/Staff can view audit" ON settings_audit_log
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- system_settings
DROP POLICY IF EXISTS "Pastor/Staff can update system_settings" ON system_settings;
CREATE POLICY "Pastor/Staff can update system_settings" ON system_settings
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- user_invitations
DROP POLICY IF EXISTS "Pastor y Staff pueden ver invitaciones" ON user_invitations;
CREATE POLICY "Pastor y Staff pueden ver invitaciones" ON user_invitations
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Pastor y Staff pueden crear invitaciones" ON user_invitations;
CREATE POLICY "Pastor y Staff pueden crear invitaciones" ON user_invitations
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Pastor y Staff pueden actualizar invitaciones" ON user_invitations;
CREATE POLICY "Pastor y Staff pueden actualizar invitaciones" ON user_invitations
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- user_permissions
DROP POLICY IF EXISTS "Pastors and staff can manage all permissions" ON user_permissions;
CREATE POLICY "Pastors and staff can manage all permissions" ON user_permissions
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT USING (
    public.is_super_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- zones
DROP POLICY IF EXISTS "Pastor y staff pueden gestionar zonas" ON zones;
CREATE POLICY "Pastor y staff pueden gestionar zonas" ON zones
  FOR ALL USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
    )
  );

-- =============================================
-- ENABLE RLS on tables that are missing it
-- =============================================

-- discipleship_attendance
ALTER TABLE discipleship_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on attendance" ON discipleship_attendance
  FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users can view attendance via hierarchy" ON discipleship_attendance
  FOR SELECT USING (can_access_user(user_id) OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
  ));
CREATE POLICY "Pastor and staff can manage attendance" ON discipleship_attendance
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
  ));

-- discipleship_group_members
ALTER TABLE discipleship_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on group members" ON discipleship_group_members
  FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users can view group members via hierarchy" ON discipleship_group_members
  FOR SELECT USING (can_access_user(user_id) OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
  ));
CREATE POLICY "Pastor and staff can manage group members" ON discipleship_group_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
  ));

-- discipleship_levels
ALTER TABLE discipleship_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on levels" ON discipleship_levels
  FOR ALL USING (public.is_super_admin());
CREATE POLICY "Everyone can read levels" ON discipleship_levels
  FOR SELECT USING (true);
CREATE POLICY "Pastor and staff can manage levels" ON discipleship_levels
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['pastor'::user_role, 'staff'::user_role])
  ));
