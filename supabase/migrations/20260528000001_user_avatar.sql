-- Add avatar_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Any authenticated user can upload/update their avatar in the avatars/ subfolder
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'church-assets'
  AND name LIKE 'avatars/%'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'church-assets'
  AND name LIKE 'avatars/%'
  AND auth.uid() IS NOT NULL
);
