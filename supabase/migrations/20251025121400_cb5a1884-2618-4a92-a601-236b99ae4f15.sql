-- Add voting columns to task_proofs
ALTER TABLE task_proofs 
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Create table for tracking user votes on proofs
CREATE TABLE IF NOT EXISTS task_proof_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id UUID NOT NULL REFERENCES task_proofs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proof_id, user_id)
);

-- Enable RLS
ALTER TABLE task_proof_votes ENABLE ROW LEVEL SECURITY;

-- Policies for task_proof_votes
CREATE POLICY "Anyone can view votes"
  ON task_proof_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote on proofs"
  ON task_proof_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON task_proof_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update proof vote counts
CREATE OR REPLACE FUNCTION update_proof_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE task_proofs SET upvotes = upvotes + 1 WHERE id = NEW.proof_id;
    ELSE
      UPDATE task_proofs SET downvotes = downvotes + 1 WHERE id = NEW.proof_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE task_proofs SET upvotes = upvotes - 1 WHERE id = OLD.proof_id;
    ELSE
      UPDATE task_proofs SET downvotes = downvotes - 1 WHERE id = OLD.proof_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote counts
CREATE TRIGGER update_proof_votes_trigger
AFTER INSERT OR DELETE ON task_proof_votes
FOR EACH ROW EXECUTE FUNCTION update_proof_votes();