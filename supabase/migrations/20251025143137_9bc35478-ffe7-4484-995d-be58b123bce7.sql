-- Create storage bucket for task proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for task proof uploads
CREATE POLICY "Users can upload their own task proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Task proof images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-proofs');

CREATE POLICY "Users can update their own task proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own task proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);