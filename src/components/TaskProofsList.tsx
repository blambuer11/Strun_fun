import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, User, Twitter, Facebook, Linkedin, Share2 } from "lucide-react";
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

  const handleShareProof = (platform: string, proof: TaskProof) => {
    const appUrl = window.location.origin;
    const text = `Check out this proof from ${proof.username}: "${proof.content}" 🎯`;
    const proofUrl = `${appUrl}/tasks`;
    
    let shareUrl = '';
    
    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(proofUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(proofUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(proofUrl)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

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
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-bold">Community Proofs</h3>
      {proofs.map((proof) => (
        <Card key={proof.id} className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
            </Avatar>
            
              <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{proof.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(proof.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleShareProof('twitter', proof)}
                  >
                    <Twitter className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleShareProof('facebook', proof)}
                  >
                    <Facebook className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleShareProof('linkedin', proof)}
                  >
                    <Linkedin className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <p className="text-xs sm:text-sm break-words">{proof.content}</p>
              
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
                  className="text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {proof.upvotes}
                </Button>
                <Button
                  variant={proof.userVote === 'down' ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => handleVote(proof.id, 'down')}
                  className="text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  <ThumbsDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
