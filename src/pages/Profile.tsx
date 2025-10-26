import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { 
  User, 
  ArrowLeft,
  MapPin,
  Heart,
  MessageSquare,
  Share2,
  Camera,
  CheckCircle2,
  Calendar,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import strunLogo from "@/assets/strun-logo.jpg";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { userId } = useParams(); // For viewing other users' profiles
  const [activeTab, setActiveTab] = useState<"posts" | "tasks">("posts");
  
  // If no userId param, show current user's profile
  const profileUserId = userId || user?.id;

  useEffect(() => {
    if (!authLoading && !user && !userId) {
      navigate("/");
    }
  }, [user, authLoading, navigate, userId]);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileUserId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileUserId,
  });

  // Fetch user's posts (task proofs that are shared to community)
  const { data: posts } = useQuery({
    queryKey: ["user-posts", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      const { data, error } = await supabase
        .from("task_proofs")
        .select("*, tasks(name, title, location_name)")
        .eq("user_id", profileUserId)
        .eq("is_shared_to_community", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileUserId,
  });

  // Fetch completed tasks
  const { data: completedTasks } = useQuery({
    queryKey: ["user-completed-tasks", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      const { data } = await supabase
        .from("user_tasks")
        .select("*, tasks(name, title, location_name, xp_reward)")
        .eq("user_id", profileUserId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!profileUserId,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["user-stats", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return { tasksCompleted: 0, totalXP: 0, postsCount: 0 };
      
      const [tasksResult, postsResult] = await Promise.all([
        supabase.from("user_tasks").select("*", { count: "exact", head: true }).eq("user_id", profileUserId).eq("status", "completed"),
        supabase.from("task_proofs").select("*", { count: "exact", head: true }).eq("user_id", profileUserId).eq("is_shared_to_community", true),
      ]);

      return {
        tasksCompleted: tasksResult.count || 0,
        totalXP: profile?.xp || 0,
        postsCount: postsResult.count || 0,
      };
    },
    enabled: !!profileUserId && !!profile,
  });

  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const userName = profile?.username || "Runner";
  const avatarUrl = profile?.avatar_url || null;
  const isOwnProfile = user?.id === profileUserId;

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img 
            src={strunLogo} 
            alt="Strun Logo" 
            className="h-8 w-auto object-contain"
          />
          <div className="w-10" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card className="p-6 glass">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-accent to-accent-glow rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-accent-foreground" />
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">{userName}</h2>
            <p className="text-sm text-muted-foreground mb-3">{profile?.email}</p>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" className="text-xs">
                Level {level}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {xp.toLocaleString()} XP
              </Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-md mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{stats?.postsCount || 0}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{stats?.tasksCompleted || 0}</div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>

            {isOwnProfile && (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => navigate("/dashboard")}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50">
          <button
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === "posts" 
                ? "text-accent border-b-2 border-accent" 
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            Posts
          </button>
          <button
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === "tasks" 
                ? "text-accent border-b-2 border-accent" 
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("tasks")}
          >
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            Tasks
          </button>
        </div>

        {/* Content */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {posts && posts.length > 0 ? (
              posts.map((post) => (
                <Card key={post.id} className="p-4 glass">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-glow rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-accent-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {post.tasks && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Completed: {post.tasks.title || post.tasks.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {post.media_url && (
                    <img 
                      src={post.media_url} 
                      alt="Post" 
                      className="w-full rounded-lg mb-3 max-h-96 object-cover"
                    />
                  )}
                  
                  <p className="text-foreground mb-3">{post.content}</p>
                  
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-accent transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="text-sm">{post.upvotes || 0}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-accent transition-colors">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-sm">0</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-accent transition-colors ml-auto">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 glass text-center">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet</p>
                {isOwnProfile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Share your task completions to the community!
                  </p>
                )}
              </Card>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-3">
            {completedTasks && completedTasks.length > 0 ? (
              completedTasks.map((userTask) => {
                const task = userTask.tasks;
                if (!task) return null;
                return (
                  <Card key={userTask.id} className="p-4 glass">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{task.title || task.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {userTask.completed_at && (
                            <>
                              <Calendar className="w-3 h-3" />
                              {new Date(userTask.completed_at).toLocaleDateString()}
                            </>
                          )}
                          {task.location_name && (
                            <>
                              <MapPin className="w-3 h-3" />
                              {task.location_name}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-accent">
                          +{userTask.xp_awarded || task.xp_reward} XP
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="p-8 glass text-center">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No completed tasks yet</p>
              </Card>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
