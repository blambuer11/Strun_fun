-- Create community-posts bucket for post images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old avatars policies if they conflict
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Avatars bucket policies
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Community posts bucket policies
CREATE POLICY "Anyone can view community posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-posts');

CREATE POLICY "Authenticated users can upload community posts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-posts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own community posts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own community posts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);