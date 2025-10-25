-- Fix tasks visibility for accepted tasks
DROP POLICY IF EXISTS "Users can view own personal tasks or all sponsored tasks" ON tasks;

CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  USING (
    -- Creator can see own tasks
    auth.uid() = creator_id 
    -- Everyone can see sponsored/pool tasks
    OR pool_id IS NOT NULL 
    -- Everyone can see published tasks
    OR status = 'published'
    -- Users can see tasks they've accepted
    OR EXISTS (
      SELECT 1 FROM user_tasks
      WHERE user_tasks.task_id = tasks.id
      AND user_tasks.user_id = auth.uid()
    )
  );