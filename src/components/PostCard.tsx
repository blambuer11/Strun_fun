import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Repeat2, MessageCircle, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CommentsDialog } from "./CommentsDialog";

interface PostCardProps {
  post: {
    id: string;
    author: string;
    handle: string;
    time: string;
    content: string;
    image?: string | null;
    likes_count: number;
    reposts_count: number;
    comments_count: number;
    user_id: string;
  };
  userLiked: boolean;
  userReposted: boolean;
  onUpdate: () => void;
}

export const PostCard = ({ post, userLiked, userReposted, onUpdate }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(userLiked);
  const [isReposted, setIsReposted] = useState(userReposted);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        await supabase
          .from("posts")
          .update({ likes_count: likesCount - 1 })
          .eq("id", post.id);

        setIsLiked(false);
        setLikesCount(likesCount - 1);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: user.id });

        await supabase
          .from("posts")
          .update({ likes_count: likesCount + 1 })
          .eq("id", post.id);

        setIsLiked(true);
        setLikesCount(likesCount + 1);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRepost = async () => {
    if (!user) return;

    try {
      if (isReposted) {
        await supabase
          .from("post_reposts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        await supabase
          .from("posts")
          .update({ reposts_count: repostsCount - 1 })
          .eq("id", post.id);

        setIsReposted(false);
        setRepostsCount(repostsCount - 1);
      } else {
        await supabase
          .from("post_reposts")
          .insert({ post_id: post.id, user_id: user.id });

        await supabase
          .from("posts")
          .update({ reposts_count: repostsCount + 1 })
          .eq("id", post.id);

        setIsReposted(true);
        setRepostsCount(repostsCount + 1);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="p-0 bg-card/95 overflow-hidden">
        <div className="p-4 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-accent-foreground font-bold">
              {post.author[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{post.author}</span>
                <span className="text-sm text-muted-foreground">{post.handle}</span>
                <span className="text-sm text-muted-foreground">· {post.time}</span>
              </div>
              <p className="text-sm mt-1 leading-relaxed">{post.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {post.image && (
          <div className="w-full">
            <img 
              src={post.image} 
              alt="Post content" 
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="p-4 flex items-center justify-between border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? "text-accent" : "hover:text-accent"}`}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm">{likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isReposted ? "text-accent" : "hover:text-accent"}`}
            onClick={handleRepost}
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-sm">{repostsCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:text-accent"
            onClick={() => setCommentsOpen(true)}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{post.comments_count}</span>
          </Button>
        </div>
      </Card>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        postId={post.id}
        onCommentAdded={onUpdate}
      />
    </>
  );
};
