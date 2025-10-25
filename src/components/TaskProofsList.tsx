import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TaskProof {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_id: string;
  username: string;
  userVote?: 'up' | 'down' | null;
}

interface TaskProofsListProps {
  taskId: string;
}

export const TaskProofsList = ({ taskId }: TaskProofsListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proofs, setProofs] = useState<TaskProof[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProofs = async () => {
    try {
      const { data: proofsData, error } = await supabase
        .from("task_proofs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load user profiles and votes
      if (proofsData && proofsData.length > 0) {
        const userIds = [...new Set(proofsData.map(p => p.user_id))];
        const proofIds = proofsData.map(p => p.id);

        const [profilesResult, votesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, email")
            .in("id", userIds),
          user ? supabase
            .from("task_proof_votes")
            .select("proof_id, vote_type")
            .in("proof_id", proofIds)
            .eq("user_id", user.id) : { data: [] }
        ]);

        const profilesMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const votesMap = new Map<string, 'up' | 'down'>(
          (votesResult.data || []).map(v => [v.proof_id, v.vote_type as 'up' | 'down'])
        );

        const formattedProofs: TaskProof[] = proofsData.map((proof) => {
          const profile = profilesMap.get(proof.user_id);
          const displayName = profile?.username || profile?.email?.split("@")[0] || "Anonymous";

          return {
            ...proof,
            username: displayName,
            userVote: votesMap.get(proof.id) || null,
          };
        });

        setProofs(formattedProofs);
      }
    } catch (error) {
      console.error("Error loading proofs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proofId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote",
        variant: "destructive",
      });
      return;
    }

    try {
      const proof = proofs.find(p => p.id === proofId);
      if (!proof) return;

      // If user already voted the same way, remove the vote
      if (proof.userVote === voteType) {
        await supabase
          .from("task_proof_votes")
          .delete()
          .eq("proof_id", proofId)
          .eq("user_id", user.id);
      } else {
        // If user voted differently, update the vote
        if (proof.userVote) {
          await supabase
            .from("task_proof_votes")
            .delete()
            .eq("proof_id", proofId)
            .eq("user_id", user.id);
        }
        
        // Insert new vote
        await supabase
          .from("task_proof_votes")
          .insert({
            proof_id: proofId,
            user_id: user.id,
            vote_type: voteType,
          });
      }

      // Reload proofs to get updated counts
      loadProofs();
    } catch (error: any) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadProofs();
  }, [taskId]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading proofs...
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No proofs submitted yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Community Proofs</h3>
      {proofs.map((proof) => (
        <Card key={proof.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{proof.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(proof.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <p className="text-sm">{proof.content}</p>
              
              {proof.media_url && (
                <img
                  src={proof.media_url}
                  alt="Proof"
                  className="rounded-lg max-w-full h-auto"
                />
              )}
              
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant={proof.userVote === 'up' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleVote(proof.id, 'up')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {proof.upvotes}
                </Button>
                <Button
                  variant={proof.userVote === 'down' ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => handleVote(proof.id, 'down')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  {proof.downvotes}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
