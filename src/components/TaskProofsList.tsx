import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TaskProof {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  likes_count: number;
  user_id: string;
  username: string;
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

      // Load user profiles
      if (proofsData && proofsData.length > 0) {
        const userIds = [...new Set(proofsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const formattedProofs = proofsData.map((proof) => {
          const profile = profilesMap.get(proof.user_id);
          const displayName = profile?.username || profile?.email?.split("@")[0] || "Anonymous";

          return {
            ...proof,
            username: displayName,
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
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  {proof.likes_count}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
