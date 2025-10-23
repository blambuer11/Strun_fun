-- Drop existing tables (full system rebuild)
DROP TABLE IF EXISTS public.user_tasks CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.verifications CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;
DROP TABLE IF EXISTS public.nonces CASCADE;
DROP TABLE IF EXISTS public.pools CASCADE;

-- Create pools table (SOL escrow for tasks)
CREATE TABLE public.pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escrow_address TEXT,
  total_funded_sol DECIMAL(18, 9) DEFAULT 0,
  required_creator_stake DECIMAL(18, 9) DEFAULT 0,
  min_participants INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  name TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('qr_checkin', 'content_photo', 'content_video', 'video_reaction')),
  city TEXT,
  location_name TEXT,
  coordinates JSONB NOT NULL,
  radius_m INTEGER DEFAULT 50,
  xp_reward INTEGER DEFAULT 0,
  sol_reward DECIMAL(18, 9) DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  active_from TIMESTAMP WITH TIME ZONE,
  active_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nonces table (replay attack prevention)
CREATE TABLE public.nonces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media table (uploaded content)
CREATE TABLE public.media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  hash TEXT,
  exif JSONB,
  thumbnail_url TEXT,
  type TEXT CHECK (type IN ('photo', 'video')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_tasks table (participants)
CREATE TABLE public.user_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'rejected', 'declined', 'verified')),
  nonce_used TEXT,
  verification_score DECIMAL(5, 2),
  xp_awarded INTEGER DEFAULT 0,
  sol_awarded DECIMAL(18, 9) DEFAULT 0,
  claim_token TEXT,
  geo_meta JSONB,
  device_meta JSONB,
  suspicious BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Create verifications table (audit trail)
CREATE TABLE public.verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  method TEXT DEFAULT 'automated' CHECK (method IN ('automated', 'manual', 'hybrid')),
  gps_verified BOOLEAN DEFAULT false,
  exif_verified BOOLEAN DEFAULT false,
  ai_verified BOOLEAN DEFAULT false,
  nonce_verified BOOLEAN DEFAULT false,
  qr_verified BOOLEAN DEFAULT false,
  ai_score DECIMAL(5, 2),
  ai_reason TEXT,
  distance_meters INTEGER,
  human_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  final_status TEXT CHECK (final_status IN ('verified', 'rejected', 'pending_manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pools
CREATE POLICY "Pools viewable by everyone" ON public.pools FOR SELECT USING (true);
CREATE POLICY "Users can create their own pools" ON public.pools FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own pools" ON public.pools FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for tasks
CREATE POLICY "Tasks viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for nonces
CREATE POLICY "Users can view their own nonces" ON public.nonces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create nonces" ON public.nonces FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for media
CREATE POLICY "Users can view their own media" ON public.media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own media" ON public.media FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_tasks
CREATE POLICY "Users can view their own tasks" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own task entries" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own task entries" ON public.user_tasks FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for verifications
CREATE POLICY "Users can view their own verifications" ON public.verifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_tasks WHERE user_tasks.id = verifications.user_task_id AND user_tasks.user_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON public.user_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add daily task limit fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_task_accept_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_accept_date DATE;

-- Create indexes for performance
CREATE INDEX idx_tasks_coordinates ON public.tasks USING gin(coordinates);
CREATE INDEX idx_tasks_active_dates ON public.tasks(active_from, active_to);
CREATE INDEX idx_user_tasks_user_id ON public.user_tasks(user_id);
CREATE INDEX idx_user_tasks_task_id ON public.user_tasks(task_id);
CREATE INDEX idx_nonces_expires ON public.nonces(expires_at);
CREATE INDEX idx_media_user_task ON public.media(user_id, task_id);