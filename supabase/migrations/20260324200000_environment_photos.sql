-- ============================================
-- SaveDin - Environment Photos (Supabase Storage)
-- ============================================

-- Add avatar_url column to environments
ALTER TABLE savedin.environments ADD COLUMN avatar_url TEXT;

-- Create storage bucket for environment images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'environment-avatars',
  'environment-avatars',
  true,
  2097152, -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: each user can manage their own files
-- Files are stored as: {user_id}/{environment_id}.{ext}
CREATE POLICY "Users can upload their own env avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'environment-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own env avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'environment-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own env avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'environment-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view env avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'environment-avatars');
