-- Add discipleship hierarchy fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discipleship_level INTEGER DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_groups_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS zone_name TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS territory TEXT DEFAULT NULL;

-- Create user_profiles table for modular extensions
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_name TEXT NOT NULL,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view accessible profiles" 
ON public.user_profiles 
FOR SELECT 
USING (can_access_user(user_id));

CREATE POLICY "Users can update accessible profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (can_access_user(user_id));

CREATE POLICY "Users can insert profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (can_access_user(user_id));

CREATE POLICY "Higher roles can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (can_access_user(user_id));

-- Create discipleship_hierarchy table
CREATE TABLE IF NOT EXISTS public.discipleship_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 5),
  supervisor_id UUID,
  zone_name TEXT,
  territory TEXT,
  active_groups_assigned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on discipleship_hierarchy
ALTER TABLE public.discipleship_hierarchy ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discipleship_hierarchy
CREATE POLICY "Users can view accessible hierarchy" 
ON public.discipleship_hierarchy 
FOR SELECT 
USING (can_access_user(user_id));

CREATE POLICY "Supervisors can manage hierarchy" 
ON public.discipleship_hierarchy 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('pastor', 'staff')
  )
);

-- Create discipleship_groups table
CREATE TABLE IF NOT EXISTS public.discipleship_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  leader_id UUID NOT NULL,
  supervisor_id UUID,
  meeting_location TEXT,
  meeting_day TEXT,
  meeting_time TIME,
  member_count INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'multiplying')),
  zone_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on discipleship_groups
ALTER TABLE public.discipleship_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discipleship_groups
CREATE POLICY "Users can view accessible groups" 
ON public.discipleship_groups 
FOR SELECT 
USING (
  can_access_user(leader_id) OR 
  can_access_user(supervisor_id) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('pastor', 'staff')
  )
);

-- Create discipleship_reports table
CREATE TABLE IF NOT EXISTS public.discipleship_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  supervisor_id UUID,
  report_level INTEGER NOT NULL CHECK (report_level BETWEEN 1 AND 5),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'needs_attention')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on discipleship_reports
ALTER TABLE public.discipleship_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discipleship_reports
CREATE POLICY "Users can manage their own reports" 
ON public.discipleship_reports 
FOR ALL 
USING (auth.uid() = reporter_id);

CREATE POLICY "Supervisors can view subordinate reports" 
ON public.discipleship_reports 
FOR SELECT 
USING (can_access_user(reporter_id));

-- Create discipleship_metrics table
CREATE TABLE IF NOT EXISTS public.discipleship_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  week_date DATE NOT NULL,
  attendance INTEGER DEFAULT 0,
  new_visitors INTEGER DEFAULT 0,
  returning_visitors INTEGER DEFAULT 0,
  testimonies_count INTEGER DEFAULT 0,
  prayer_requests INTEGER DEFAULT 0,
  spiritual_temperature INTEGER DEFAULT 5 CHECK (spiritual_temperature BETWEEN 1 AND 10),
  leader_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, week_date)
);

-- Enable RLS on discipleship_metrics
ALTER TABLE public.discipleship_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discipleship_metrics
CREATE POLICY "Users can view accessible metrics" 
ON public.discipleship_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.discipleship_groups dg
    WHERE dg.id = discipleship_metrics.group_id
    AND (can_access_user(dg.leader_id) OR can_access_user(dg.supervisor_id))
  )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discipleship_hierarchy_updated_at
BEFORE UPDATE ON public.discipleship_hierarchy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discipleship_groups_updated_at
BEFORE UPDATE ON public.discipleship_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discipleship_reports_updated_at
BEFORE UPDATE ON public.discipleship_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discipleship_metrics_updated_at
BEFORE UPDATE ON public.discipleship_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test users for discipleship hierarchy
-- Pastor (Level 5)
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address, id_number, 
  role, discipleship_level, zone_name, password_hash
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'David', 'Martínez', 'pastor@sion.church', '+1234567890', 
  'Calle Principal 123', '12345678', 'pastor', 5, 'Toda la Ciudad',
  '$2a$10$dummy.hash.for.testing.purposes.only'
) ON CONFLICT (id) DO UPDATE SET
  discipleship_level = 5,
  zone_name = 'Toda la Ciudad';

-- Coordinadores (Level 4)
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address, id_number, 
  role, discipleship_level, zone_name, password_hash
) VALUES 
  ('00000000-0000-0000-0000-000000000002',
   'María', 'González', 'coordinador1@sion.church', '+1234567891',
   'Av. Central 456', '12345679', 'staff', 4, 'Zona Norte',
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000003',
   'Carlos', 'Rodríguez', 'coordinador2@sion.church', '+1234567892',
   'Calle Sur 789', '12345680', 'staff', 4, 'Zona Sur',
   '$2a$10$dummy.hash.for.testing.purposes.only')
ON CONFLICT (id) DO UPDATE SET
  discipleship_level = EXCLUDED.discipleship_level,
  zone_name = EXCLUDED.zone_name;

-- Supervisores Generales (Level 3)
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address, id_number, 
  role, discipleship_level, zone_name, territory, active_groups_count, password_hash
) VALUES 
  ('00000000-0000-0000-0000-000000000004',
   'Ana', 'López', 'supervisor.norte1@sion.church', '+1234567893',
   'Barrio Norte 111', '12345681', 'supervisor', 3, 'Zona Norte', 'Sector A', 8,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000005',
   'Luis', 'Fernández', 'supervisor.norte2@sion.church', '+1234567894',
   'Barrio Norte 222', '12345682', 'supervisor', 3, 'Zona Norte', 'Sector B', 7,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000006',
   'Elena', 'Torres', 'supervisor.sur1@sion.church', '+1234567895',
   'Barrio Sur 333', '12345683', 'supervisor', 3, 'Zona Sur', 'Sector C', 9,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000007',
   'Roberto', 'Vásquez', 'supervisor.sur2@sion.church', '+1234567896',
   'Barrio Sur 444', '12345684', 'supervisor', 3, 'Zona Sur', 'Sector D', 6,
   '$2a$10$dummy.hash.for.testing.purposes.only')
ON CONFLICT (id) DO UPDATE SET
  discipleship_level = EXCLUDED.discipleship_level,
  zone_name = EXCLUDED.zone_name,
  territory = EXCLUDED.territory,
  active_groups_count = EXCLUDED.active_groups_count;

-- Supervisores Auxiliares (Level 2) - 12 usuarios
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address, id_number, 
  role, discipleship_level, zone_name, territory, active_groups_count, password_hash
) VALUES 
  ('00000000-0000-0000-0000-000000000008',
   'Patricia', 'Jiménez', 'aux.supervisor1@sion.church', '+1234567897',
   'Colonia A 555', '12345685', 'supervisor', 2, 'Zona Norte', 'Sector A', 3,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000009',
   'Miguel', 'Herrera', 'aux.supervisor2@sion.church', '+1234567898',
   'Colonia A 666', '12345686', 'supervisor', 2, 'Zona Norte', 'Sector A', 4,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000010',
   'Carmen', 'Ruiz', 'aux.supervisor3@sion.church', '+1234567899',
   'Colonia B 777', '12345687', 'supervisor', 2, 'Zona Norte', 'Sector B', 3,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000011',
   'Fernando', 'Castro', 'aux.supervisor4@sion.church', '+1234567800',
   'Colonia B 888', '12345688', 'supervisor', 2, 'Zona Norte', 'Sector B', 4,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000012',
   'Isabel', 'Morales', 'aux.supervisor5@sion.church', '+1234567801',
   'Colonia C 999', '12345689', 'supervisor', 2, 'Zona Sur', 'Sector C', 5,
   '$2a$10$dummy.hash.for.testing.purposes.only'),
  ('00000000-0000-0000-0000-000000000013',
   'Andrés', 'Gutiérrez', 'aux.supervisor6@sion.church', '+1234567802',
   'Colonia C 1010', '12345690', 'supervisor', 2, 'Zona Sur', 'Sector C', 4,
   '$2a$10$dummy.hash.for.testing.purposes.only')
ON CONFLICT (id) DO UPDATE SET
  discipleship_level = EXCLUDED.discipleship_level,
  zone_name = EXCLUDED.zone_name,
  territory = EXCLUDED.territory,
  active_groups_count = EXCLUDED.active_groups_count;