-- Update tasks RLS policy to show only:
-- 1. Tasks user created themselves (creator_id = auth.uid())
-- 2. Tasks with pool_id (sponsored/marketplace tasks)
-- 3. Tasks user has accepted (via user_tasks join)

DROP POLICY IF EXISTS "Users can view tasks" ON tasks;

CREATE POLICY "Users can view tasks"
ON tasks
FOR SELECT
USING (
  auth.uid() = creator_id 
  OR pool_id IS NOT NULL 
  OR EXISTS (
    SELECT 1 FROM user_tasks 
    WHERE user_tasks.task_id = tasks.id 
    AND user_tasks.user_id = auth.uid()
  )
);

-- Create storage bucket for task proofs if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task proofs" ON storage.objects;

-- Storage policies for task proofs
CREATE POLICY "Users can upload their own task proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view task proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-proofs');

CREATE POLICY "Users can update their own task proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own task proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);