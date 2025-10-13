-- Create user_rewards table for tracking claimed reward boxes
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_level INTEGER NOT NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  xp_amount INTEGER,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reward_level)
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view own rewards
CREATE POLICY "Users can view own rewards"
ON public.user_rewards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can claim own rewards
CREATE POLICY "Users can claim own rewards"
ON public.user_rewards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own rewards
CREATE POLICY "Users can update own rewards"
ON public.user_rewards
FOR UPDATE
USING (auth.uid() = user_id);