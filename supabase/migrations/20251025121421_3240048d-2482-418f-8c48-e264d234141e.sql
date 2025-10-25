-- Fix search_path for update_proof_votes function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;