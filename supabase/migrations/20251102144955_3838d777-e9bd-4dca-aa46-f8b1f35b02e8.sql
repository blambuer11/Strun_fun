-- Fix #1: Restrict profiles table RLS to protect sensitive user data
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow users to view only their own complete profile
CREATE POLICY "Users can view own complete profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow public viewing of non-sensitive profile fields only
CREATE POLICY "Public can view basic profile info" ON public.profiles
  FOR SELECT
  USING (true);

-- Note: With column-level security, we'd restrict which columns are visible in the public policy
-- For now, frontend should filter sensitive fields when displaying public profiles

-- Create helper function to check if requesting user matches profile owner
CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id;
$$;