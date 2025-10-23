-- Add daily task generation limits to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_task_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_task_date DATE;

-- Add sponsor/pool fields to tasks table for user-sponsored tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS sol_pool NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sol_per_completion NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sponsor_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS challenge_type TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_sponsor ON tasks(sponsor_user_id) WHERE sponsor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(active_from, active_to) WHERE active_from IS NOT NULL;

-- Function to increment daily task count
CREATE OR REPLACE FUNCTION check_daily_task_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_last_date DATE;
BEGIN
  SELECT daily_task_count, last_task_date 
  INTO v_count, v_last_date
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Reset if new day
  IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
    UPDATE profiles 
    SET daily_task_count = 0, last_task_date = CURRENT_DATE
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Check limit (3 per day)
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment task count
CREATE OR REPLACE FUNCTION increment_daily_task_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_task_count = daily_task_count + 1,
      last_task_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;