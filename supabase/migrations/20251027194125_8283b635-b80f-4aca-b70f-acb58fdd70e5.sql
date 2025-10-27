-- Update profiles RLS policy to allow everyone to view all profiles
-- This is needed for community features where usernames need to be visible

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Profiles are viewable by everyone"
ON profiles
FOR SELECT
USING (true);

-- Keep the update policy restricted to own profile
-- (already exists: "Users can update own profile")