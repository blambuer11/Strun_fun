-- Add meta column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.tasks.meta IS 'Additional metadata for tasks (e.g., generated_by, sponsored, created_by, city)';
