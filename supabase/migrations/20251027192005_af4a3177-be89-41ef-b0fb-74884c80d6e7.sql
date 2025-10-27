-- Update trigger to handle both 'completed' and 'verified' status
CREATE OR REPLACE FUNCTION public.award_task_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_task_xp integer;
BEGIN
  -- Check if status changed to 'completed' or 'verified'
  IF (NEW.status = 'completed' OR NEW.status = 'verified') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'verified')) THEN
    
    -- Get XP reward from task
    SELECT xp_reward INTO v_task_xp
    FROM tasks
    WHERE id = NEW.task_id;
    
    -- Award XP if task has reward and not already awarded
    IF v_task_xp > 0 AND (NEW.xp_awarded IS NULL OR NEW.xp_awarded = 0) THEN
      -- Update user_task with XP awarded
      NEW.xp_awarded := v_task_xp;
      
      -- Increment user's XP (this will also update level and badges)
      PERFORM increment_xp(NEW.user_id, v_task_xp);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;