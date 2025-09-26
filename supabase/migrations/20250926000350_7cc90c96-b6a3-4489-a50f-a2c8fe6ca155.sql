-- Fix critical security vulnerabilities in database

-- 1. Add missing RLS policies for discipleship_groups table
-- Currently only has SELECT policy, missing INSERT/UPDATE/DELETE
CREATE POLICY "Pastor and staff can manage discipleship groups" 
ON public.discipleship_groups 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('pastor', 'staff')
  )
);

CREATE POLICY "Pastor and staff can update discipleship groups" 
ON public.discipleship_groups 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('pastor', 'staff')
  )
);

CREATE POLICY "Pastor and staff can delete discipleship groups" 
ON public.discipleship_groups 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('pastor', 'staff')
  )
);

-- 2. Add missing RLS policies for discipleship_metrics table
-- Currently only has SELECT policy, missing INSERT/UPDATE/DELETE
CREATE POLICY "Leaders can insert metrics for their groups" 
ON public.discipleship_metrics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM discipleship_groups dg
    WHERE dg.id = discipleship_metrics.group_id 
    AND (dg.leader_id = auth.uid() OR can_access_user(dg.leader_id))
  )
);

CREATE POLICY "Leaders can update metrics for their groups" 
ON public.discipleship_metrics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM discipleship_groups dg
    WHERE dg.id = discipleship_metrics.group_id 
    AND (dg.leader_id = auth.uid() OR can_access_user(dg.leader_id))
  )
);

CREATE POLICY "Supervisors can delete metrics" 
ON public.discipleship_metrics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM discipleship_groups dg
    WHERE dg.id = discipleship_metrics.group_id 
    AND can_access_user(dg.leader_id)
  )
);

-- 3. Remove password_hash column from users table since we should use Supabase Auth
-- This is a critical security issue - passwords should never be stored in plain text or weakly hashed
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 4. Create a more restrictive policy for users table to limit data exposure
-- Replace the overly broad "Allow public user registration" policy
DROP POLICY IF EXISTS "Allow public user registration" ON public.users;

-- Only allow authenticated users to insert with their own ID
CREATE POLICY "Users can only register themselves" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Add audit trigger for discipleship_groups table
CREATE TRIGGER audit_discipleship_groups
AFTER INSERT OR UPDATE OR DELETE ON public.discipleship_groups
FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();

-- 6. Add audit trigger for discipleship_metrics table  
CREATE TRIGGER audit_discipleship_metrics
AFTER INSERT OR UPDATE OR DELETE ON public.discipleship_metrics
FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();