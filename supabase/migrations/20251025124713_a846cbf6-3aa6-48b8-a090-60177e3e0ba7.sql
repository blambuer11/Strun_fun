-- Update RLS policy for tasks table
-- Only show tasks to: creator, participants, or everyone if it's a sponsored task (has pool_id)
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;

CREATE POLICY "Users can view tasks" ON tasks
FOR SELECT USING (
  (auth.uid() = creator_id) OR 
  (pool_id IS NOT NULL) OR 
  (EXISTS (SELECT 1 FROM user_tasks WHERE user_tasks.task_id = tasks.id AND user_tasks.user_id = auth.uid()))
);