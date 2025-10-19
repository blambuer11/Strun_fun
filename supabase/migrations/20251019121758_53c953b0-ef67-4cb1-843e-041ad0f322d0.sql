-- Create partner_locations table for QR mission venues
CREATE TABLE IF NOT EXISTS public.partner_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  radius_m integer DEFAULT 30,
  qr_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  sponsor_name text,
  sponsor_banner_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table for all mission types
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('qr', 'selfie', 'partner', 'flash')),
  partner_location_id uuid REFERENCES public.partner_locations(id) ON DELETE CASCADE,
  xp_reward integer DEFAULT 50,
  active_from timestamptz,
  active_to timestamptz,
  rules jsonb DEFAULT '{}'::jsonb,
  nft_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_tasks table for tracking completions
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  start_ts timestamptz DEFAULT now(),
  end_ts timestamptz,
  proof_ipfs text,
  xp_awarded integer DEFAULT 0,
  suspicious boolean DEFAULT false,
  device_meta jsonb,
  lat double precision,
  lon double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create selfie_groups table for tracking selfie meetup participants
CREATE TABLE IF NOT EXISTS public.selfie_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  participant_count integer DEFAULT 0,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  center_lat double precision,
  center_lon double precision,
  proof_ipfs text,
  created_at timestamptz DEFAULT now()
);

-- Create selfie_participants junction table
CREATE TABLE IF NOT EXISTS public.selfie_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selfie_group_id uuid REFERENCES public.selfie_groups(id) ON DELETE CASCADE NOT NULL,
  user_task_id uuid REFERENCES public.user_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_ipfs text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(selfie_group_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON public.tasks(active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON public.user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task ON public.user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON public.user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_partner_locations_coords ON public.partner_locations(lat, lon);
CREATE INDEX IF NOT EXISTS idx_selfie_participants_group ON public.selfie_participants(selfie_group_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partner_locations_updated_at BEFORE UPDATE ON public.partner_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfie_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfie_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_locations
CREATE POLICY "Partner locations viewable by everyone"
  ON public.partner_locations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage partner locations"
  ON public.partner_locations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tasks
CREATE POLICY "Tasks viewable by everyone"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_tasks
CREATE POLICY "Users can view own tasks"
  ON public.user_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.user_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user tasks"
  ON public.user_tasks FOR ALL
  USING (true);

-- RLS Policies for selfie_groups
CREATE POLICY "Selfie groups viewable by everyone"
  ON public.selfie_groups FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage selfie groups"
  ON public.selfie_groups FOR ALL
  USING (true);

-- RLS Policies for selfie_participants
CREATE POLICY "Selfie participants viewable by everyone"
  ON public.selfie_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own selfie participation"
  ON public.selfie_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage selfie participants"
  ON public.selfie_participants FOR ALL
  USING (true);