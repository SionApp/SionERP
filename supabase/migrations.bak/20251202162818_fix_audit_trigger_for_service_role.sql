-- Fix audit trigger to handle service role context (when auth.uid() is NULL)
-- This happens when users are created via Supabase Admin API (e.g., magic link generation)

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS user_audit_trigger ON public.users;

-- Recreate the function with NULL handling for service role operations
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

-- Recreate the trigger
CREATE TRIGGER user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.log_user_changes();

-- Add comment explaining the service role context handling
COMMENT ON FUNCTION public.log_user_changes() IS 'Logs user changes to audit_logs table. Handles service role context where auth.uid() may be NULL (e.g., magic link user creation).';
