import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { PostCard } from "@/components/PostCard";
import { Search } from "lucide-react";
import strunLogo from "@/assets/strun-logo.jpg";
import communityHero from "@/assets/community-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const Community = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userReposts, setUserReposts] = useState<Set<string>>(new Set());
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const hashtags = ["#StrunRun", "#LandNFT", "#FitnessGoals"];

  const loadPosts = useCallback(async () => {
    try {
      // Load posts without join, then load profiles separately
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!postsData) {
        setPosts([]);
        return;
      }

      // Load profiles for all post authors
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedPosts = postsData.map((post) => {
        const profile = profilesMap.get(post.user_id);
        const displayName = profile?.username || profile?.email?.split("@")[0] || "Unknown User";
        
        return {
          id: post.id,
          author: displayName,
          handle: `@${displayName}`,
          time: formatDistanceToNow(new Date(post.created_at), { addSuffix: true }),
          content: post.content,
          image: post.image_url,
          likes_count: post.likes_count || 0,
          reposts_count: post.reposts_count || 0,
          comments_count: post.comments_count || 0,
          user_id: post.user_id,
        };
      });

      setPosts(formattedPosts);
    } catch (error: any) {
      console.error("Error loading posts:", error);
      toast({
        title: "Error loading posts",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadUserInteractions = useCallback(async () => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error("Error loading interactions:", error);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate("/");
      return;
    }
    
    loadPosts();
    loadUserInteractions();
  }, [user, loading, navigate, loadPosts, loadUserInteractions]);

  const handlePostCreated = useCallback(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostUpdate = useCallback(() => {
    loadPosts();
    loadUserInteractions();
  }, [loadPosts, loadUserInteractions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
        </div>
      </header>

      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden">
        <img 
          src={communityHero} 
          alt="Community" 
          className="w-full h-full object-cover animate-fade-in"
        />
      </div>

      {/* Search and Info Section */}
      <div className="container mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Strun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        {/* Trending Hashtags */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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

       
        
          
          

      {/* Feed */}
      <div className="container mx-auto px-4 space-y-4 pb-24">
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
