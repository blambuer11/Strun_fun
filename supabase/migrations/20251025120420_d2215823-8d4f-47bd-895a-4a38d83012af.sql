-- Create task_proofs table for user submissions
CREATE TABLE IF NOT EXISTS public.task_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_task_id UUID REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_shared_to_community BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.task_proofs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Task proofs viewable by everyone" 
ON public.task_proofs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own task proofs" 
ON public.task_proofs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task proofs" 
ON public.task_proofs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task proofs" 
ON public.task_proofs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  level_required INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by everyone" 
ON public.badges 
FOR SELECT 
USING (true);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges viewable by everyone" 
ON public.user_badges 
FOR SELECT 
USING (true);

CREATE POLICY "System can create user badges" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (true);

-- Insert initial badges
INSERT INTO public.badges (name, description, icon, level_required) VALUES
('First Steps', 'Complete your first run', '🏃', 1),
('Speed Runner', 'Complete 10 runs', '⚡', 5),
('Distance Master', 'Run 100km total', '🎯', 10),
('Social Butterfly', 'Share 5 posts to community', '🦋', 3),
('Task Hunter', 'Complete 20 tasks', '🎖️', 8),
('Land Owner', 'Mint your first Land NFT', '🏆', 5),
('Community Leader', 'Get 50 likes on your posts', '👑', 15),
('Early Adopter', 'Join Strun in the first month', '🌟', 1)
ON CONFLICT DO NOTHING;