-- Check and update task_type constraint to allow all task types
-- First, let's see what constraint exists (this will fail but show us the constraint)
-- Then we'll drop and recreate it with the correct values

-- Drop the old constraint if it exists
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;

-- Add new constraint that allows all our task types
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check 
CHECK (task_type IN ('qr', 'qr_scan', 'selfie', 'selfie_group', 'selfie_meet', 'photo', 'photo_challenge', 'visit_partner', 'clean_up', 'short_run', 'scavenger_hunt'));