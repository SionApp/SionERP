-- =============================================================================
-- Migration: 20260901000001_education_storage_policies.sql
-- Education module — Phase 2a (PR2a): storage policies for lesson
-- attachments.
--
-- Path convention: education/{curriculum_id}/{file} — bucket church-documents
-- already exists (20260827000008_user_documents.sql), private, no public read
-- policy. Neither existing policy on storage.objects for this bucket matches
-- an `education/...` path: "Staff manage church-documents" keys on
-- foldername(name)[1] = a target user_id, "Users read own documents" keys on
-- foldername(name)[1] = auth.uid()::text. A new policy pair is required
-- (design D7) — foldername(name)[2] resolves the curriculum_id, which lets us
-- join to education_curricula for the church + status check.
-- =============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Education authors manage attachments" ON storage.objects;
  CREATE POLICY "Education authors manage attachments"
    ON storage.objects FOR ALL TO authenticated
    USING (
      bucket_id = 'church-documents'
      AND (storage.foldername(name))[1] = 'education'
      AND EXISTS (
        SELECT 1
        FROM public.education_curricula ec
        JOIN public.users u ON u.church_id = ec.church_id
        LEFT JOIN public.module_user_roles mur
          ON mur.user_id = u.id AND mur.module_key = 'education' AND mur.church_id = u.church_id
        WHERE ec.id::text = (storage.foldername(name))[2]
          AND u.id = auth.uid()
          AND (u.role IN ('pastor', 'admin') OR COALESCE(mur.role_level, 0) >= 3)
      )
    )
    WITH CHECK (
      bucket_id = 'church-documents'
      AND (storage.foldername(name))[1] = 'education'
      AND EXISTS (
        SELECT 1
        FROM public.education_curricula ec
        JOIN public.users u ON u.church_id = ec.church_id
        LEFT JOIN public.module_user_roles mur
          ON mur.user_id = u.id AND mur.module_key = 'education' AND mur.church_id = u.church_id
        WHERE ec.id::text = (storage.foldername(name))[2]
          AND u.id = auth.uid()
          AND (u.role IN ('pastor', 'admin') OR COALESCE(mur.role_level, 0) >= 3)
      )
    );

  DROP POLICY IF EXISTS "Education students read attachments" ON storage.objects;
  CREATE POLICY "Education students read attachments"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'church-documents'
      AND (storage.foldername(name))[1] = 'education'
      AND EXISTS (
        SELECT 1
        FROM public.education_curricula ec
        JOIN public.users u ON u.church_id = ec.church_id
        LEFT JOIN public.module_user_roles mur
          ON mur.user_id = u.id AND mur.module_key = 'education' AND mur.church_id = u.church_id
        WHERE ec.id::text = (storage.foldername(name))[2]
          AND u.id = auth.uid()
          AND COALESCE(mur.role_level, 0) >= 1
          AND ec.status = 'published'
      )
    );
END $$;
