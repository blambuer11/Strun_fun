import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { 
  Map, 
  Activity,
  MapPin,
  Zap,
  LogOut,
  Play,
  Award,
  Trophy
} from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  // Fetch runs count
  const { data: runsData } = useQuery({
    queryKey: ["runs-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0 };
      const { count, error } = await supabase
        .from("runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: !!user?.id,
  });

  // Fetch NFTs count
  const { data: nftsData } = useQuery({
    queryKey: ["nfts-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0 };
      const { count, error } = await supabase
        .from("land_nfts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: !!user?.id,
  });

  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const stats = [
    { label: "Total Runs", value: runsData?.count?.toString() || "0", icon: Activity },
    { label: "Land NFTs", value: nftsData?.count?.toString() || "0", icon: MapPin },
    { label: "Total XP", value: xp.toLocaleString(), icon: Zap },
    { label: "Level", value: level, icon: Award },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-accent to-accent-glow p-2 rounded-xl">
              <Activity className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Strun</h1>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* XP Progress Card */}
        <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Level {level}</h2>
              <p className="text-sm text-muted-foreground">
                {xpInLevel} / 1000 XP
              </p>
            </div>
            <div className="bg-accent/20 p-3 rounded-full">
              <Trophy className="w-8 h-8 text-accent" />
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {1000 - xpInLevel} XP to next level
          </p>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4 bg-card/80 hover:bg-card transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Start Run Card */}
        <Card className="p-8 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 border-accent/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(142_76%_52%/0.1),transparent)]" />
          <div className="relative z-10 text-center space-y-4">
            <div className="inline-flex bg-accent/20 p-4 rounded-full animate-pulse-glow">
              <Map className="w-12 h-12 text-accent" />
            </div>
            <h3 className="text-2xl font-bold">Ready to Run?</h3>
            <p className="text-muted-foreground">
              Start tracking your run and claim territory
            </p>
            <Button 
              variant="hero" 
              size="xl" 
              className="w-full max-w-xs"
              onClick={() => navigate("/run")}
            >
              <Play className="w-6 h-6" />
              Start Run
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-card/80">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { action: "Completed run", xp: "+120 XP", time: "2h ago" },
              { action: "Minted LandNFT", xp: "+200 XP", time: "1d ago" },
              { action: "Rental accepted", xp: "+50 XP", time: "2d ago" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
                <div className="text-accent font-bold">{activity.xp}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
