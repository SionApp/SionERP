-- Add missing fields to users table (English naming)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS how_found_church TEXT,
ADD COLUMN IF NOT EXISTS ministry_interest TEXT,
ADD COLUMN IF NOT EXISTS first_visit_date DATE,
ADD COLUMN IF NOT EXISTS is_active_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS membership_date DATE,
ADD COLUMN IF NOT EXISTS cell_group TEXT,
ADD COLUMN IF NOT EXISTS cell_leader_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS pastoral_notes TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON public.users(birth_date);
CREATE INDEX IF NOT EXISTS idx_users_cell_leader ON public.users(cell_leader_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  resource TEXT NOT NULL, -- 'users', 'reports', 'livestreams', etc.
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete'
  granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_name, resource, action)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id OR 
       EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));

CREATE POLICY "Pastors and staff can manage all permissions" 
ON public.user_permissions 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));

-- Create audit_logs table for tracking changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES public.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_logs
CREATE POLICY "Only pastors and staff can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));

-- Create function to log user changes
CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES ('users', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('users', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES ('users', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user audit logging
CREATE TRIGGER user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();

-- Update RLS policies for users with role hierarchy
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propia información" ON public.users;

-- New role-based policies (English)
CREATE POLICY "Users can view their own info or higher roles can view all" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND (
      u.role = 'pastor' OR
      (u.role = 'staff' AND role != 'pastor') OR
      (u.role = 'supervisor' AND role IN ('supervisor', 'server'))
    )
  )
);

CREATE POLICY "Users can update their own info or higher roles can update subordinates" 
ON public.users 
FOR UPDATE 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND (
      u.role = 'pastor' OR
      (u.role = 'staff' AND role NOT IN ('pastor', 'staff')) OR
      (u.role = 'supervisor' AND role IN ('supervisor', 'server'))
    )
  )
);

CREATE POLICY "Higher roles can delete subordinates (except pastor can't be deleted)" 
ON public.users 
FOR DELETE 
USING (
  role != 'pastor' AND
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND (
      u.role = 'pastor' OR
      (u.role = 'staff' AND role NOT IN ('pastor', 'staff'))
    )
  )
);

-- Create reports table for tracking report generation
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'user_summary', 'attendance', 'membership', etc.
  parameters JSONB,
  generated_by UUID NOT NULL REFERENCES public.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'completed', 'failed'
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
CREATE POLICY "Only pastors and staff can generate and view reports" 
ON public.reports 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('pastor', 'staff')));