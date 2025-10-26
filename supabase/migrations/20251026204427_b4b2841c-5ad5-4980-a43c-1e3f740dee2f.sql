-- Insert admin role for bl10buer@gmail.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID from auth.users  
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'bl10buer@gmail.com';
  
  -- Insert admin role if user exists
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Update RLS policies for tasks to allow admin management
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;  
CREATE POLICY "Admins can update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to share their created tasks with community
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_shared_to_community boolean DEFAULT false;

COMMENT ON COLUMN public.tasks.is_shared_to_community IS 'Whether the task creator has shared this task with the community';