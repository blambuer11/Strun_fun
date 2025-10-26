-- Update tasks RLS policy to allow viewing shared community tasks
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;

CREATE POLICY "Users can view tasks"
ON tasks
FOR SELECT
USING (
  auth.uid() = creator_id 
  OR pool_id IS NOT NULL 
  OR is_shared_to_community = true
  OR EXISTS (
    SELECT 1 FROM user_tasks 
    WHERE user_tasks.task_id = tasks.id 
    AND user_tasks.user_id = auth.uid()
  )
);