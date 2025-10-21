-- Add photo task support columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lon DECIMAL(11, 8);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_prompt TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin';

-- Create function to increment XP
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + xp_amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;