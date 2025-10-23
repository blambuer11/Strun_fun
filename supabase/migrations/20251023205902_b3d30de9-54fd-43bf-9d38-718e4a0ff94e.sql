-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Task generation jobs table
CREATE TABLE IF NOT EXISTS public.task_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  mode text DEFAULT 'mix',
  sponsor_id uuid,
  count integer DEFAULT 20,
  status text DEFAULT 'pending',
  tasks_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sponsors table (if not exists)
CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  budget_sol numeric DEFAULT 0,
  per_task_budget_sol numeric DEFAULT 0.05,
  allowed_categories text[],
  disallowed_terms text[],
  created_at timestamptz DEFAULT now()
);

-- POIs table (if not exists)
CREATE TABLE IF NOT EXISTS public.pois (
  id text PRIMARY KEY,
  name text,
  type text,
  lat double precision,
  lon double precision,
  tags jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add status column to tasks if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='status') THEN
    ALTER TABLE public.tasks ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Add task name column if not exists  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='name') THEN
    ALTER TABLE public.tasks ADD COLUMN name text;
  END IF;
END $$;

-- Add lat/lon columns if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='lat') THEN
    ALTER TABLE public.tasks ADD COLUMN lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='lon') THEN
    ALTER TABLE public.tasks ADD COLUMN lon double precision;
  END IF;
END $$;

-- RLS policies
ALTER TABLE public.task_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

-- Jobs viewable by admins only
CREATE POLICY "Admins can view jobs" ON public.task_generation_jobs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create jobs" ON public.task_generation_jobs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Sponsors viewable by everyone
CREATE POLICY "Sponsors viewable by everyone" ON public.sponsors
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage sponsors" ON public.sponsors
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- POIs viewable by everyone
CREATE POLICY "POIs viewable by everyone" ON public.pois
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.task_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pois_type ON public.pois(type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Schedule worker to run every 5 minutes
SELECT cron.schedule(
  'task-generation-worker',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ysutwfzdpfvziasxbbvn.supabase.co/functions/v1/task-generation-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdXR3ZnpkcGZ2emlhc3hiYnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzIzNTEsImV4cCI6MjA3NTMwODM1MX0.itprn-w66ZuVLV7ybtlfA4vSztf1iTW2UTOZXNrTafY"}'::jsonb,
    body := json_build_object('time', now())::jsonb
  ) as request_id;
  $$
);

COMMENT ON TABLE public.task_generation_jobs IS 'Background jobs for AI task generation';
COMMENT ON TABLE public.sponsors IS 'Sponsor organizations for funded tasks';
COMMENT ON TABLE public.pois IS 'Points of Interest from OpenStreetMap';
