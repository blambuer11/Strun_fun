-- Add Solana wallet fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN solana_public_key TEXT,
ADD COLUMN solana_encrypted_key TEXT;

-- Create index for faster lookups
CREATE INDEX idx_profiles_solana_public_key ON public.profiles(solana_public_key);

-- Update RLS policies to allow users to view their own wallet info
-- (existing policies already cover this)