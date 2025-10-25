-- Update tasks RLS policies for better visibility control
-- Drop existing policies first
DROP POLICY IF EXISTS "Tasks viewable by everyone" ON tasks;
DROP POLICY IF EXISTS "Creators can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;

-- New policies: Personal tasks (AI generated) only visible to creator, sponsored/pool tasks visible to everyone
CREATE POLICY "Users can view own personal tasks or all sponsored tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR pool_id IS NOT NULL 
    OR status = 'published'
  );

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = creator_id);

-- Make sure user_tasks are properly visible
DROP POLICY IF EXISTS "Users can view their own tasks" ON user_tasks;
CREATE POLICY "Users can view their own tasks"
  ON user_tasks FOR SELECT
  USING (auth.uid() = user_id);