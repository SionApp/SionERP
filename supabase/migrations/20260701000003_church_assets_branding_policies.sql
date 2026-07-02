-- =============================================================================
-- Migration: 20260701000003_church_assets_branding_policies.sql
-- The church-assets bucket only had storage RLS policies for the avatars/
-- prefix (20260528000001), so uploading a church LOGO or BANNER (paths
-- logos/* and banners/*) was denied by RLS — "subir la foto no sirve".
--
-- Add INSERT/UPDATE/DELETE for logos/ and banners/ (any authenticated user;
-- the settings page that uses this is already Pastor+ gated at the route),
-- plus a public SELECT so the images render, and ensure the bucket is public.
-- =============================================================================

-- Ensure the bucket exists and is public (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-assets', 'church-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Branding write policies (logos/ and banners/) ──
DROP POLICY IF EXISTS "Auth users upload branding" ON storage.objects;
CREATE POLICY "Auth users upload branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%')
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Auth users update branding" ON storage.objects;
CREATE POLICY "Auth users update branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%')
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Auth users delete branding" ON storage.objects;
CREATE POLICY "Auth users delete branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'church-assets'
  AND (name LIKE 'logos/%' OR name LIKE 'banners/%' OR name LIKE 'avatars/%')
  AND auth.uid() IS NOT NULL
);

-- ── Public read for all church-assets (logos/banners/avatars are public URLs) ──
DROP POLICY IF EXISTS "Public read church-assets" ON storage.objects;
CREATE POLICY "Public read church-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'church-assets');
