import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const [googleFit, setGoogleFit] = useState(false);
  const [appleHealth, setAppleHealth] = useState(false);

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

  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const referralCode = profile?.referral_code || "";
  const userEmail = profile?.email || "";
  const userName = profile?.username || "Runner";

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

  const handleGoogleFitToggle = (checked: boolean) => {
    setGoogleFit(checked);
    toast({
      title: checked ? "Google Fit Connected" : "Google Fit Disconnected",
      description: checked 
        ? "Your runs and steps will now sync with Google Fit" 
        : "Google Fit sync has been disabled",
    });
  };

  const handleAppleHealthToggle = (checked: boolean) => {
    setAppleHealth(checked);
    toast({
      title: checked ? "Apple Health Connected" : "Apple Health Disconnected",
      description: checked 
        ? "Your runs and steps will now sync with Apple Health" 
        : "Apple Health sync has been disabled",
    });
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Header */}
        <Card className="p-6 bg-card/95 relative overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-accent to-accent-glow rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-accent-foreground" />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                <Settings className="w-3 h-3" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">{userName}</h2>
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
                <Switch checked={googleFit} onCheckedChange={handleGoogleFitToggle} />
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
                <Switch checked={appleHealth} onCheckedChange={handleAppleHealthToggle} />
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
      
      <BottomNav />
    </div>
  );
};

export default Profile;
