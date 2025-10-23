-- Fix search_path for security functions
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
  
  IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
    UPDATE profiles 
    SET daily_task_count = 0, last_task_date = CURRENT_DATE
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_daily_task_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET daily_task_count = daily_task_count + 1,
      last_task_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;