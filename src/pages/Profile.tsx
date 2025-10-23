import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { 
  User, 
  Award,
  Share2,
  Settings,
  Zap,
  Activity,
  ArrowLeft,
  Copy,
  LogOut,
  ChevronRight,
  Camera,
  Edit2,
  Check,
  X,
  Trophy,
  MapPin,
  Heart,
  Moon,
  Footprints,
  TrendingUp,
  Calendar,
  Wallet,
  Coins,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHealthIntegration } from "@/hooks/useHealthIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, ResponsiveContainer } from "recharts";
import strunLogo from "@/assets/strun-logo.jpg";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const {
    isGoogleFitConnected,
    isAppleHealthConnected,
    healthData,
    requestGoogleFitPermission,
    requestAppleHealthPermission,
    syncHealthData,
  } = useHealthIntegration();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch runs and NFTs count
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { runs: 0, nfts: 0, distance: 0, time: 0 };
      
      const [runsResult, nftsResult, runsData] = await Promise.all([
        supabase.from("runs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("land_nfts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("runs").select("distance, duration").eq("user_id", user.id),
      ]);

      const totalDistance = runsData.data?.reduce((sum, run) => sum + Number(run.distance), 0) || 0;
      const totalTime = runsData.data?.reduce((sum, run) => sum + Number(run.duration), 0) || 0;
      
      return {
        runs: runsResult.count || 0,
        nfts: nftsResult.count || 0,
        distance: totalDistance,
        time: Math.floor(totalTime / 3600), // convert to hours
      };
    },
    enabled: !!user?.id,
  });

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent runs
  const { data: recentRuns } = useQuery({
    queryKey: ["recent-runs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch completed tasks history
  const { data: completedTasks } = useQuery({
    queryKey: ["completed-tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tasks")
        .select("*, tasks(*)")
        .eq("user_id", user?.id)
        .in("status", ["completed", "verified"])
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const referralCode = profile?.referral_code || "";
  const userEmail = profile?.email || "";
  const userName = profile?.username || "Runner";
  const avatarUrl = profile?.avatar_url || null;

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Referral Code Copied!",
      description: "Share with friends to earn 50 XP",
    });
  };

  const handleShareReferral = () => {
    const referralLink = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Referral Link Copied!",
      description: "Share this link with friends to earn 50 XP each",
    });
  };

  const handleGoogleFitToggle = async (checked: boolean) => {
    if (checked) {
      await requestGoogleFitPermission();
    }
  };

  const handleAppleHealthToggle = async (checked: boolean) => {
    if (checked) {
      await requestAppleHealthPermission();
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user?.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      toast({
        title: "Avatar Updated",
        description: "Your profile photo has been updated successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "Invalid Username",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      setIsEditingUsername(false);
      toast({
        title: "Username Updated",
        description: "Your username has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setNewUsername(profile?.username || "");
    setIsEditingUsername(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-accent mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const achievements = [
    { name: "First Run", description: "Complete your first run", unlocked: true },
    { name: "Territory Pioneer", description: "Mint your first LandNFT", unlocked: true },
    { name: "Speed Demon", description: "Run 10km in under 50 minutes", unlocked: false },
    { name: "Community Leader", description: "Get 10 referrals", unlocked: false },
  ];

  const weeklyData = [
    { day: "Mon", runs: 1 },
    { day: "Tue", runs: 2 },
    { day: "Wed", runs: 1.5 },
    { day: "Thu", runs: 2.5 },
    { day: "Fri", runs: 1.8 },
    { day: "Sat", runs: 2.2 },
    { day: "Sun", runs: 1.2 },
  ];

  const monthlyData = [
    { week: "W1", distance: 25 },
    { week: "W2", distance: 42 },
    { week: "W3", distance: 38 },
    { week: "W4", distance: 55 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4">
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

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border/50 bg-card h-12 sticky top-[72px] z-40">
          <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
          <TabsTrigger value="wallet" className="flex-1">Wallet</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="m-0">
        <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Header */}
        <Card className="p-6 bg-card/95 relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="relative w-24 h-24 bg-gradient-to-br from-accent to-accent-glow rounded-full flex items-center justify-center overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-accent-foreground" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {isEditingUsername ? (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="h-8 max-w-[200px]"
                  placeholder="Enter username"
                  disabled={updating}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleSaveUsername}
                  disabled={updating}
                >
                  <Check className="w-4 h-4 text-accent" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={updating}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{userName}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsEditingUsername(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-1">{userEmail}</p>
            <p className="text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </Card>

        {/* Settings Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold">Settings</h2>
          </div>

          {/* XP System */}
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold">XP System</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Current XP</span>
                <span className="text-sm text-accent font-bold">{xp} XP</span>
              </div>
              <Progress value={(xp % 1000 / 1000) * 100} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Level {level}</span>
                <span>{1000 - (xp % 1000)} XP to Level {level + 1}</span>
              </div>
              <div className="pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>• Complete runs: +100-200 XP</p>
                  <p>• Mint NFTs: +150 XP</p>
                  <p>• Referrals: +50 XP per friend</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Referral System */}
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Referral System</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Invite friends and earn 50 XP for each signup!
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Your Referral Code</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-primary/5 px-4 py-3 rounded-lg font-mono text-sm">
                    {referralCode}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Your Referral Link</label>
                <Button 
                  variant="default" 
                  className="w-full h-12"
                  onClick={handleShareReferral}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy & Share Referral Link
                </Button>
              </div>
            </div>
          </Card>

          {/* Health Integrations */}
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold">Health Integrations</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your health apps to automatically sync your runs and activity
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🏃</span>
                  </div>
                  <div>
                    <div className="font-medium">Google Fit</div>
                    <div className="text-xs text-muted-foreground">Sync steps, distance and runs</div>
                  </div>
                </div>
                <Switch checked={isGoogleFitConnected} onCheckedChange={handleGoogleFitToggle} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-xl">❤️</span>
                  </div>
                  <div>
                    <div className="font-medium">Apple Health</div>
                    <div className="text-xs text-muted-foreground">Sync steps, distance and runs</div>
                  </div>
                </div>
                <Switch checked={isAppleHealthConnected} onCheckedChange={handleAppleHealthToggle} />
              </div>
            </div>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-sm font-bold mb-4">Achievements</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "First Run", icon: "🏃", unlocked: true },
              { label: "6 Runs", icon: "🎯", unlocked: false },
              { label: "10 Runs", icon: "🏆", unlocked: false },
            ].map((achievement, i) => (
              <div
                key={i}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-2 ${
                  achievement.unlocked
                    ? "bg-accent/10 border border-accent/30"
                    : "bg-muted/20 border border-border/30 opacity-50"
                }`}
              >
                <div className="text-3xl">{achievement.icon}</div>
                <div className="text-xs text-center font-medium">{achievement.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6 bg-card/95">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Activity Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-primary/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
              <div className="text-2xl font-bold">{stats?.runs || 0}</div>
            </div>
            <div className="p-4 bg-accent/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Total Distance</div>
              <div className="text-2xl font-bold">{stats?.distance?.toFixed(1) || 0} km</div>
            </div>
            <div className="p-4 bg-secondary/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Total Time</div>
              <div className="text-2xl font-bold">{stats?.time || 0} hrs</div>
            </div>
            <div className="p-4 bg-accent/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">NFTs Minted</div>
              <div className="text-2xl font-bold">{stats?.nfts || 0}</div>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-card/95">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent/10 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-bold">Recent Activity</h3>
          </div>
          {recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="font-medium">Run Completed</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(run.completed_at).toLocaleDateString()} • {Number(run.distance).toFixed(2)} km
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-accent">+{run.xp_earned} XP</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor(Number(run.duration) / 60)} min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </Card>

        {/* Transaction History */}
        <Card className="p-6 bg-card/95">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Transaction History</h3>
          </div>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'reward' ? 'bg-accent/10' : 'bg-primary/10'
                    }`}>
                      <span className="text-xl">
                        {tx.type === 'reward' ? '🎁' : tx.type === 'referral' ? '👥' : '💰'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium capitalize">{tx.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                        {tx.description && ` • ${tx.description}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      tx.type === 'reward' || tx.type === 'referral' ? 'text-accent' : 'text-primary'
                    }`}>
                      {Number(tx.amount).toFixed(4)} {tx.currency}
                    </div>
                    {tx.transaction_hash && (
                      <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {tx.transaction_hash.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions yet</p>
            </div>
          )}
        </Card>

        {/* Logout */}
        <Button 
          variant="destructive" 
          className="w-full h-12"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
      </TabsContent>

      {/* Tasks History Tab */}
      <TabsContent value="tasks" className="m-0">
        <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Trophy className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold">Completed Tasks</h3>
            </div>
            {completedTasks && completedTasks.length > 0 ? (
              <div className="space-y-3">
                {completedTasks.map((userTask) => {
                  const task = userTask.tasks;
                  if (!task) return null;
                  return (
                    <div
                      key={userTask.id}
                      className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <div className="font-medium">{task.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {userTask.completed_at ? new Date(userTask.completed_at).toLocaleDateString() : 'Completed'}
                            {task.location_name && ` • ${task.location_name}`}
                          </div>
                          {task.type && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {task.type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-accent">+{userTask.xp_awarded || task.xp_reward} XP</div>
                        {task.type && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {task.type.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed tasks yet</p>
                <p className="text-xs mt-1">Start completing tasks to earn XP!</p>
              </div>
            )}
          </Card>

          {/* XP Summary */}
          <Card className="p-6 bg-gradient-to-br from-accent/5 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Total Task XP</h3>
                <p className="text-sm text-muted-foreground">From all completed tasks</p>
              </div>
              <div className="text-3xl font-bold text-accent">
                {completedTasks?.reduce((sum, t) => sum + (t.xp_awarded || t.tasks?.xp_reward || 0), 0) || 0}
              </div>
            </div>
          </Card>
        </div>
      </TabsContent>

      {/* Wallet Tab */}
      <TabsContent value="wallet" className="m-0">
        <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
          {/* SOL Balance */}
          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-success/20 p-3 rounded-full">
                  <Wallet className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">SOL Balance</h3>
                  <p className="text-xs text-muted-foreground">From task rewards</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-success">0.00</div>
                <p className="text-xs text-muted-foreground">SOL</p>
              </div>
            </div>
          </Card>

          {/* Stake Info */}
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Task Pools</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Active Pools</span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Total Earned</span>
                <span className="font-bold text-success">0.00 SOL</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Pending Claims</span>
                <span className="font-bold text-accent">0</span>
              </div>
            </div>
          </Card>

          {/* Claim Button */}
          <Button disabled className="w-full h-12 bg-success hover:bg-success/90">
            <Coins className="w-4 h-4 mr-2" />
            Claim Rewards (0.00 SOL)
          </Button>

          {/* Transaction History from Wallet */}
          <Card className="p-6 bg-card/95">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold">SOL History</h3>
            </div>
            {transactions && transactions.filter(t => t.currency === 'SOL').length > 0 ? (
              <div className="space-y-3">
                {transactions.filter(t => t.currency === 'SOL').map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-background/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">
                        +{Number(tx.amount).toFixed(4)} SOL
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No SOL transactions yet</p>
                <p className="text-xs mt-1">Complete sponsored tasks to earn SOL!</p>
              </div>
            )}
          </Card>
        </div>
      </TabsContent>

      {/* Stats Tab */}
      <TabsContent value="stats" className="m-0">
        <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
          {/* XP Progress Card */}
          <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Level {level}</h2>
                <p className="text-sm text-muted-foreground">{xp % 1000} / 1000 XP</p>
              </div>
              <div className="bg-accent/20 p-3 rounded-full">
                <Trophy className="w-8 h-8 text-accent" />
              </div>
            </div>
            <Progress value={((xp % 1000) / 1000) * 100} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{1000 - (xp % 1000)} XP to next level</p>
          </Card>

          {/* Weekly Runs Chart */}
          <Card className="p-6 bg-card/95">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Weekly Activity
                </h3>
                <span className="text-sm text-accent">Last 7 days</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weeklyData}>
                <Line type="monotone" dataKey="runs" stroke="hsl(var(--accent))" strokeWidth={3} dot={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Distance Chart */}
          <Card className="p-6 bg-card/95">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Monthly Distance
                </h3>
                <span className="text-sm text-primary">Last 4 weeks</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyData}>
                <Bar dataKey="distance" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </TabsContent>

      </Tabs>
      
      <BottomNav />
    </div>
  );
};

export default Profile;
