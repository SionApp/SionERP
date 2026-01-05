-- Create table for tracking installed modules
CREATE TABLE IF NOT EXISTS public.modules (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_installed BOOLEAN DEFAULT FALSE,
    installed_at TIMESTAMP WITH TIME ZONE
);

-- Insert default modules
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
('base', 'Sistema Base', 'Funcionalidades principales: Usuarios, Configuración', TRUE, NOW()),
('discipleship', 'Discipulado', 'Gestión de grupos, jerarquías y reportes', FALSE, NULL),
('zones', 'Zonas', 'Gestión de zonas territoriales', FALSE, NULL)
ON CONFLICT (key) DO NOTHING;

-- Policies (Enable read access for authenticated users)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to modules" ON public.modules
    FOR SELECT USING (true);

-- Allow admins (service_role or specific functionality) to update
CREATE POLICY "Allow admin update access to modules" ON public.modules
    FOR UPDATE USING (true) WITH CHECK (true);
