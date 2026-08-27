-- =============================================================================
-- Migration: 20260826000002_events_image_storage_policies.sql
-- Issue #71: subir imágenes de eventos. El bucket church-assets ya existe
-- (avatares, logos, banners) — solo faltaba el prefijo events/ en las
-- políticas de RLS de storage.objects, mismo patrón que
-- 20260701000003_church_assets_branding_policies.sql agregó para logos/banners.
-- =============================================================================

DROP POLICY IF EXISTS "Auth users upload branding" ON storage.objects;
CREATE POLICY "Auth users upload branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Auth users update branding" ON storage.objects;
CREATE POLICY "Auth users update branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Auth users delete branding" ON storage.objects;
CREATE POLICY "Auth users delete branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'avatars/%' OR name LIKE 'events/%')
  AND auth.uid() IS NOT NULL
);
