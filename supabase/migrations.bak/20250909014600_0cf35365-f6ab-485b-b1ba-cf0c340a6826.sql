-- Create table for live stream management
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_video_id TEXT,
  title TEXT NOT NULL DEFAULT 'Servicio en Vivo',
  description TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Create policies - public read access for live streams
CREATE POLICY "Live streams are viewable by everyone" 
ON public.live_streams 
FOR SELECT 
USING (true);

-- Admin/staff can manage live streams (for now, we'll allow all authenticated users to manage)
CREATE POLICY "Authenticated users can manage live streams" 
ON public.live_streams 
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_live_streams_updated_at
BEFORE UPDATE ON public.live_streams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default stream entry
INSERT INTO public.live_streams (title, description, is_live) 
VALUES ('Servicio Dominical', 'Únete a nosotros en nuestro servicio dominical en vivo', false);