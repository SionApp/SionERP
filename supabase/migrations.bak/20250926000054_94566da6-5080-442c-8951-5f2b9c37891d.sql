-- Fix live streams security vulnerability
-- Remove the overly permissive policy that allows all authenticated users to manage live streams
DROP POLICY IF EXISTS "Authenticated users can manage live streams" ON public.live_streams;

-- Create a secure policy that only allows pastor and staff to manage live streams
CREATE POLICY "Only pastor and staff can manage live streams" 
ON public.live_streams 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('pastor', 'staff')
  )
);