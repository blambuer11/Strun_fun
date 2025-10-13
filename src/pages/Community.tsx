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

        {/* About Strun Section */}
        <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-background border border-border/50 rounded-xl p-6 mb-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <img src={strunLogo} alt="Strun" className="h-8 w-8 rounded-full" />
            Welcome to Strun
          </h2>
          
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Strun</strong> is a revolutionary Web3 fitness platform that combines running with blockchain technology. 
              Track your runs, claim territory as NFTs, earn XP, and connect with a global community of runners.
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-accent mb-1">🎯 XP System</h3>
                <p className="text-muted-foreground">
                  Earn XP by completing runs, minting LandNFTs, and engaging with the community. 
                  Every 1000 XP = 1 Level. Higher levels unlock exclusive rewards and features.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-1">🏃 Run Page</h3>
                <p className="text-muted-foreground">
                  Start tracking your runs with GPS. Record distance, pace, duration, and calories. 
                  Each completed run earns you XP and unlocks the ability to mint the territory you covered as an NFT.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-accent mb-1">🗺️ LandNFT System</h3>
                <p className="text-muted-foreground">
                  After completing a run, mint the area you covered as a unique NFT on Solana blockchain. 
                  Own virtual territory, collect NFTs from different locations, and build your running empire.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-1">📊 Dashboard & Stats</h3>
                <p className="text-muted-foreground">
                  Track your progress, view your XP level, total runs, and NFT collection. 
                  Monitor recent activities and compete on global leaderboards.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-accent mb-1">🎁 Rewards</h3>
                <p className="text-muted-foreground">
                  Unlock reward boxes at levels 1, 2, 5, 10, 15, 20, 25, and 30. 
                  Each box contains random XP bonuses (50-500 XP) to boost your progress.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-1">👥 Community</h3>
                <p className="text-muted-foreground">
                  Share your runs, post updates, like and comment on others&apos; achievements. 
                  Connect with fellow runners and stay motivated together.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-accent mb-1">🏁 Group Runs</h3>
                <p className="text-muted-foreground">
                  Create or join sponsored group runs with prize pools. 
                  Compete in challenges, win SOL tokens and XP, and run with your community.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-1">💰 Wallet</h3>
                <p className="text-muted-foreground">
                  Manage your Solana wallet integrated with Strun. 
                  View your SOL balance, track transactions, and manage your LandNFTs all in one place.
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <p className="text-xs text-muted-foreground text-center">
                Start your journey today • Run • Earn • Own • Compete
              </p>
            </div>
          </div>
        </div>
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
