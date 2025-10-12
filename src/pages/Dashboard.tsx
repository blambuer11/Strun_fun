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
  Trophy,
  Heart,
  Moon,
  Footprints,
  Download,
  Share2,
  TrendingUp
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import strunLogo from "@/assets/strun-logo.jpg";
import { useHealthIntegration } from "@/hooks/useHealthIntegration";
import { Card as UICard } from "@/components/ui/card";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  // Fetch all runs data for stats calculation
  const { data: allRuns } = useQuery({
    queryKey: ["runs-all", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch NFTs count and data
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

  // Fetch NFTs list
  const { data: myNFTs } = useQuery({
    queryKey: ["nfts-list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("land_nfts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate real stats from runs data
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Weekly runs data
  const weeklyRuns = allRuns?.filter(run => new Date(run.completed_at) >= weekAgo) || [];
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayRuns = weeklyRuns.filter(run => {
      const runDate = new Date(run.completed_at);
      return runDate.toDateString() === date.toDateString();
    });
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
      runs: dayRuns.reduce((sum, run) => sum + Number(run.distance), 0)
    };
  });

  // Monthly distance data (by weeks)
  const monthlyRuns = allRuns?.filter(run => new Date(run.completed_at) >= monthAgo) || [];
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(monthAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekRuns = monthlyRuns.filter(run => {
      const runDate = new Date(run.completed_at);
      return runDate >= weekStart && runDate < weekEnd;
    });
    return {
      week: `W${i + 1}`,
      distance: weekRuns.reduce((sum, run) => sum + Number(run.distance), 0)
    };
  });

  // Pace trends (last 3 months)
  const paceData = Array.from({ length: 3 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (2 - i) + 1, 0);
    const monthRuns = allRuns?.filter(run => {
      const runDate = new Date(run.completed_at);
      return runDate >= monthStart && runDate <= monthEnd && run.pace;
    }) || [];
    const avgPace = monthRuns.length > 0 
      ? monthRuns.reduce((sum, run) => sum + Number(run.pace), 0) / monthRuns.length
      : 0;
    return {
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      pace: avgPace
    };
  });

  // Recent activity from runs and NFTs
  const recentActivity = [
    ...(allRuns?.slice(0, 5).map(run => ({
      action: "Completed run",
      xp: `+${run.xp_earned} XP`,
      time: formatTimeAgo(new Date(run.completed_at)),
      date: new Date(run.completed_at)
    })) || []),
    ...(myNFTs?.slice(0, 5).map(nft => ({
      action: "Minted LandNFT",
      xp: "+200 XP",
      time: formatTimeAgo(new Date(nft.created_at)),
      date: new Date(nft.created_at)
    })) || [])
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  function formatTimeAgo(date: Date) {
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const totalWeeklyRuns = weeklyRuns.length;
  const totalMonthlyDistance = monthlyData.reduce((sum, w) => sum + w.distance, 0);
  const avgPace = paceData.length > 0 && paceData[paceData.length - 1].pace > 0 
    ? paceData[paceData.length - 1].pace 
    : 0;

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
            <img 
              src={strunLogo} 
              alt="Strun Logo" 
              className="h-10 w-auto object-contain"
            />
            <div>
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
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <div>
                    <div className="font-medium">{activity.action}</div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </div>
                  <div className="text-accent font-bold">{activity.xp}</div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
          </div>
        </Card>

        {/* My Stats Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" />
            My Stats
          </h2>

          {/* Weekly Runs */}
          <Card className="p-6 bg-card/95">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Weekly Runs</h3>
                <span className="text-sm text-accent">↗ 410%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{totalWeeklyRuns}</span>
                <span className="text-sm text-muted-foreground">Runs</span>
                <span className="text-xs text-muted-foreground ml-2">This Week</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={weeklyData}>
                <Line 
                  type="monotone" 
                  dataKey="runs" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={false}
                />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Distance */}
          <Card className="p-6 bg-card/95">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Monthly Distance</h3>
                <span className="text-sm text-accent">↗ 10%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{totalMonthlyDistance.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">km</span>
                <span className="text-xs text-muted-foreground ml-2">This Month</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyData}>
                <Bar 
                  dataKey="distance" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 0, 0]}
                />
                <XAxis 
                  dataKey="week" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pace Trends */}
          <Card className="p-6 bg-card/95">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Pace Trends</h3>
                <span className="text-sm text-destructive">↓ 2%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {avgPace > 0 ? avgPace.toFixed(2) : "--"}
                </span>
                <span className="text-sm text-muted-foreground">min/km</span>
                <span className="text-xs text-muted-foreground ml-2">Last 3 Months</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={paceData}>
                <Line 
                  type="monotone" 
                  dataKey="pace" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Health Data Integration */}
          <Card className="p-6 bg-card/95">
            <h3 className="text-lg font-bold mb-4">Health Data Integration</h3>
            
            {/* Connection Cards */}
            <div className="space-y-3 mb-6">
              <UICard className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-bold">Google Fit</div>
                      <div className="text-xs text-muted-foreground">
                        {isGoogleFitConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isGoogleFitConnected ? "outline" : "default"}
                    size="sm"
                    onClick={requestGoogleFitPermission}
                  >
                    {isGoogleFitConnected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              </UICard>

              <UICard className="p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <div className="font-bold">Apple Health</div>
                      <div className="text-xs text-muted-foreground">
                        {isAppleHealthConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isAppleHealthConnected ? "outline" : "default"}
                    size="sm"
                    onClick={requestAppleHealthPermission}
                  >
                    {isAppleHealthConnected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              </UICard>
            </div>

            {/* Synced Data Display */}
            {(isGoogleFitConnected || isAppleHealthConnected) && (
              <>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">Daily Steps</div>
                      <div className="text-sm text-muted-foreground">
                        {healthData.steps.toLocaleString()} steps
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">Distance</div>
                      <div className="text-sm text-muted-foreground">
                        {healthData.distance.toFixed(2)} km
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-secondary/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">Active Minutes</div>
                      <div className="text-sm text-muted-foreground">
                        {healthData.activeMinutes} minutes
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={syncHealthData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </>
            )}
          </Card>

          {/* Export/Share */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="default" className="h-12">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* My NFTs Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-accent" />
            My NFTs
          </h2>

          {myNFTs && myNFTs.length > 0 ? (
            myNFTs.map((nft) => (
              <Card
                key={nft.id}
                className="p-5 bg-card/95 hover:bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-lg">{nft.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Minted {new Date(nft.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent font-bold">{nft.area_size} km²</div>
                    <Button variant="ghost" size="sm" className="h-7 mt-1">
                      View →
                    </Button>
                  </div>
                </div>
                <div className="h-32 bg-primary/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {(() => {
                    const coords = nft.polygon_coordinates;
                    if (!coords || !Array.isArray(coords) || coords.length === 0) {
                      return <MapPin className="w-12 h-12 text-primary/50" />;
                    }
                    
                    const coordsArray = coords as Array<{lat?: number; latitude?: number; lng?: number; longitude?: number}>;
                    const lats = coordsArray.map((c) => c.lat || c.latitude || 0);
                    const lngs = coordsArray.map((c) => c.lng || c.longitude || 0);
                    const minLat = Math.min(...lats);
                    const maxLat = Math.max(...lats);
                    const minLng = Math.min(...lngs);
                    const maxLng = Math.max(...lngs);
                    
                    const points = coordsArray
                      .map((coord) => {
                        const lat = coord.lat || coord.latitude || 0;
                        const lng = coord.lng || coord.longitude || 0;
                        const x = ((lng - minLng) / (maxLng - minLng)) * 180 + 10;
                        const y = 190 - ((lat - minLat) / (maxLat - minLat)) * 180;
                        return `${x},${y}`;
                      })
                      .join(" ");
                    
                    return (
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <polygon
                          points={points}
                          fill="hsl(var(--primary))"
                          fillOpacity="0.3"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                        />
                      </svg>
                    );
                  })()}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 bg-card/80 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No NFTs minted yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete runs and mint your first NFT!
              </p>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
