import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    email: string;
  };
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onCommentAdded: () => void;
}

export const CommentsDialog = ({ open, onOpenChange, postId, onCommentAdded }: CommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, postId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading comments",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Load profiles separately
    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const commentsWithProfiles = data?.map(comment => ({
      ...comment,
      profiles: profilesMap.get(comment.user_id) || { username: null, email: "Unknown" }
    })) || [];

    setComments(commentsWithProfiles as any);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Giriş yapmanız gerekiyor",
        description: "Yorum yapmak için lütfen giriş yapın",
        variant: "destructive",
      });
      return;
    }
    
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      console.log("Inserting comment:", { post_id: postId, user_id: user.id, content: newComment.trim() });
      
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select();

      if (insertError) {
        console.error("Comment insert error:", insertError);
        throw insertError;
      }

      console.log("Comment inserted successfully:", data);

      // Update comments count
      const { data: post } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", postId)
        .single();

      if (post) {
        await supabase
          .from("posts")
          .update({ comments_count: post.comments_count + 1 })
          .eq("id", postId);
      }

      setNewComment("");
      loadComments();
      onCommentAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-accent-foreground font-bold text-sm">
                {(comment.profiles.username || comment.profiles.email)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {comment.profiles.username || comment.profiles.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
