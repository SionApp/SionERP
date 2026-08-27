-- =============================================================================
-- Migration: 20260827000008_user_documents.sql
-- Issue #58: documentos adjuntos al perfil de usuario (cédula, partida de
-- bautismo, etc.). A diferencia de avatares/logos/imágenes de eventos —
-- todos en el bucket PÚBLICO church-assets, correcto para contenido no
-- sensible — un documento de identidad no puede vivir en un bucket público:
-- bucket nuevo y privado, sin política de lectura pública. El acceso real es
-- vía URL firmada temporal (createSignedUrl), nunca getPublicUrl.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('church-documents', 'church-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path esperado: {user_id}/{filename} — storage.foldername(name)[1] es el
-- user_id DUEÑO del documento (no quien lo sube). No hace falta church_id en
-- el path: "misma iglesia" se resuelve con el JOIN de abajo, así el frontend
-- no necesita conocer el church_id del usuario objetivo para armar la ruta.
DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff manage church-documents" ON storage.objects;
  CREATE POLICY "Staff manage church-documents"
    ON storage.objects FOR ALL TO authenticated
    USING (
      bucket_id = 'church-documents'
      AND EXISTS (
        SELECT 1 FROM users me
        JOIN users target ON target.church_id = me.church_id
        WHERE me.id = auth.uid()
          AND me.role IN ('staff', 'pastor', 'admin')
          AND target.id::text = (storage.foldername(name))[1]
      )
    )
    WITH CHECK (
      bucket_id = 'church-documents'
      AND EXISTS (
        SELECT 1 FROM users me
        JOIN users target ON target.church_id = me.church_id
        WHERE me.id = auth.uid()
          AND me.role IN ('staff', 'pastor', 'admin')
          AND target.id::text = (storage.foldername(name))[1]
      )
    );

  DROP POLICY IF EXISTS "Users read own documents" ON storage.objects;
  CREATE POLICY "Users read own documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'church-documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
END $$;

CREATE TABLE IF NOT EXISTS public.user_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     uuid        NOT NULL REFERENCES public.churches(id),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name     text        NOT NULL,
  storage_path  text        NOT NULL,
  uploaded_by   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user
  ON public.user_documents (user_id, created_at DESC);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS tenant_isolation ON public.user_documents;
  CREATE POLICY tenant_isolation ON public.user_documents
    USING (church_id = current_setting('app.current_church_id', true)::uuid)
    WITH CHECK (church_id = current_setting('app.current_church_id', true)::uuid);
END $$;

GRANT SELECT, INSERT, DELETE ON public.user_documents TO jetro_app;
