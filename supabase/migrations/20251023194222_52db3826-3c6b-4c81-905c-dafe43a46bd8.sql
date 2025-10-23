-- Fix profiles RLS: Restrict sensitive data access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Users can only view their own sensitive profile data
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow public viewing of only non-sensitive profile fields (username, avatar, level, xp)
-- This is handled by the above policy - users see their own full data
-- For public leaderboards, we'll need to query specific columns only