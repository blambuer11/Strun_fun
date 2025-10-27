-- Level calculation from XP (Formula: level = floor(sqrt(xp / 100)) + 1)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: Every 100 XP = 1 level (with square root progression for balance)
  -- Level 1: 0-100 XP
  -- Level 2: 100-400 XP  
  -- Level 3: 400-900 XP
  -- Level 4: 900-1600 XP
  -- Level 5: 1600-2500 XP, etc.
  RETURN GREATEST(1, FLOOR(SQRT(xp_amount / 100.0)) + 1);
END;
$$;

-- Update increment_xp function to automatically update level
CREATE OR REPLACE FUNCTION public.increment_xp(user_id uuid, xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_xp integer;
  v_new_level integer;
  v_old_level integer;
BEGIN
  -- Get current level
  SELECT level INTO v_old_level FROM profiles WHERE id = user_id;
  
  -- Update XP
  UPDATE profiles
  SET xp = xp + xp_amount,
      updated_at = NOW()
  WHERE id = user_id
  RETURNING xp INTO v_new_xp;
  
  -- Calculate new level
  v_new_level := calculate_level_from_xp(v_new_xp);
  
  -- Update level if changed
  IF v_new_level != v_old_level THEN
    UPDATE profiles
    SET level = v_new_level
    WHERE id = user_id;
    
    -- Award badges for new level
    PERFORM check_and_award_badges(user_id, v_new_level);
  END IF;
END;
$$;

-- Function to check and award badges based on level
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid, p_level integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_badge RECORD;
BEGIN
  -- Loop through all badges that user qualifies for but hasn't earned yet
  FOR v_badge IN 
    SELECT b.id
    FROM badges b
    WHERE b.level_required <= p_level
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub 
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    )
  LOOP
    -- Award the badge
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, v_badge.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Function to award XP when task is completed
CREATE OR REPLACE FUNCTION public.award_task_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_task_xp integer;
BEGIN
  -- Check if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get XP reward from task
    SELECT xp_reward INTO v_task_xp
    FROM tasks
    WHERE id = NEW.task_id;
    
    -- Award XP if task has reward
    IF v_task_xp > 0 THEN
      -- Update user_task with XP awarded
      NEW.xp_awarded := v_task_xp;
      
      -- Increment user's XP (this will also update level and badges)
      PERFORM increment_xp(NEW.user_id, v_task_xp);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic XP award on task completion
DROP TRIGGER IF EXISTS trigger_award_task_xp ON user_tasks;
CREATE TRIGGER trigger_award_task_xp
  BEFORE UPDATE ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_xp();

-- Also create trigger for INSERT (when task is completed immediately)
DROP TRIGGER IF EXISTS trigger_award_task_xp_insert ON user_tasks;
CREATE TRIGGER trigger_award_task_xp_insert
  BEFORE INSERT ON user_tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION award_task_xp();

-- Function to recalculate all user levels (for existing users)
CREATE OR REPLACE FUNCTION public.recalculate_all_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN SELECT id, xp FROM profiles
  LOOP
    UPDATE profiles
    SET level = calculate_level_from_xp(v_profile.xp)
    WHERE id = v_profile.id;
    
    -- Award badges for current level
    PERFORM check_and_award_badges(v_profile.id, calculate_level_from_xp(v_profile.xp));
  END LOOP;
END;
$$;

-- Recalculate levels for all existing users
SELECT recalculate_all_levels();