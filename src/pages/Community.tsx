import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { PostCard } from "@/components/PostCard";
import { Search } from "lucide-react";
import strunLogo from "@/assets/strun-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const Community = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userReposts, setUserReposts] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const hashtags = ["#StrunRun", "#LandNFT", "#FitnessGoals"];

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadPosts();
    loadUserInteractions();
  }, [user, navigate]);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles(username, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error);
      return;
    }

    const formattedPosts = data.map((post) => ({
      id: post.id,
      author: post.profiles.username || post.profiles.email.split("@")[0],
      handle: `@${post.profiles.username || post.profiles.email.split("@")[0]}`,
      time: formatDistanceToNow(new Date(post.created_at), { addSuffix: true }),
      content: post.content,
      image: post.image_url,
      likes_count: post.likes_count,
      reposts_count: post.reposts_count,
      comments_count: post.comments_count,
      user_id: post.user_id,
    }));

    setPosts(formattedPosts);
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);

    const { data: reposts } = await supabase
      .from("post_reposts")
      .select("post_id")
      .eq("user_id", user.id);

    setUserLikes(new Set(likes?.map((l) => l.post_id) || []));
    setUserReposts(new Set(reposts?.map((r) => r.post_id) || []));
  };

  const handlePostCreated = () => {
    loadPosts();
  };

  const handlePostUpdate = () => {
    loadPosts();
    loadUserInteractions();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img 
                src={strunLogo} 
                alt="Strun Logo" 
                className="h-8 w-auto object-contain"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Strun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>

          {/* Trending Hashtags */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {hashtags.map((tag) => (
              <Button
                key={tag}
                variant="secondary"
                size="sm"
                className="rounded-full text-xs bg-primary/10 hover:bg-primary/20"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="container mx-auto px-4 py-4 space-y-4 pb-24">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            userLiked={userLikes.has(post.id)}
            userReposted={userReposts.has(post.id)}
            onUpdate={handlePostUpdate}
          />
        ))}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <CreatePostDialog onPostCreated={handlePostCreated} />
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Community;
