import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Trophy,
  MapPin,
  Activity,
  Zap,
  Award,
  Play,
  Map,
  LogOut,
  Heart,
  Moon,
  Footprints,
  Download,
  Share2
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, ResponsiveContainer } from "recharts";

const Stats = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();

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

  const paceData = [
    { month: "Jan", pace: 5.8 },
    { month: "Feb", pace: 5.5 },
    { month: "Mar", pace: 5.3 },
  ];

  const myNFTs = [
    { id: 1, area: "Downtown Loop", size: "2.5 km²", date: "2 days ago" },
    { id: 2, area: "Park Circuit", size: "1.8 km²", date: "5 days ago" },
    { id: 3, area: "River Trail", size: "3.2 km²", date: "1 week ago" },
  ];

  const leaderboard = [
    { rank: 1, name: "SpeedRunner", xp: 5420, avatar: "🏃" },
    { rank: 2, name: "TerritoryKing", xp: 4890, avatar: "👑" },
    { rank: 3, name: "MapMaster", xp: 4560, avatar: "🗺️" },
    { rank: 4, name: "NightRunner", xp: 3890, avatar: "🌙" },
    { rank: 5, name: "You", xp: xp, avatar: "👤", isUser: true },
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
    <div className="min-h-screen bg-background pb-20">
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

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border/50 bg-card h-12">
          <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
          <TabsTrigger value="leaderboards" className="flex-1">Leaderboards</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="m-0">
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
        </TabsContent>

        {/* Leaderboards Tab */}
        <TabsContent value="leaderboards" className="m-0">
          <div className="container mx-auto px-4 py-6 space-y-3">
            {leaderboard.map((player) => (
              <div
                key={player.rank}
                className={`p-4 rounded-xl flex items-center gap-4 ${
                  player.isUser
                    ? "bg-accent/20 border border-accent/30"
                    : "bg-card"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    player.rank === 1
                      ? "bg-warning text-warning-foreground"
                      : player.rank === 2
                      ? "bg-muted text-foreground"
                      : player.rank === 3
                      ? "bg-warning/50 text-warning-foreground"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {player.rank}
                </div>
                <div className="text-3xl">{player.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold">{player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {player.xp.toLocaleString()} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* My Stats Tab */}
        <TabsContent value="my-stats" className="m-0">
          <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
            {/* Weekly Runs */}
            <Card className="p-6 bg-card/95">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold">Weekly Runs</h3>
                  <span className="text-sm text-accent">↗ 410%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">5</span>
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
                  <span className="text-3xl font-bold">120</span>
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
                  <span className="text-3xl font-bold">5:30</span>
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

            {/* Health Data */}
            <Card className="p-6 bg-card/95">
              <h3 className="text-lg font-bold mb-4">Health Data</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Heart Rate</div>
                    <div className="text-sm text-muted-foreground">Average: 150 bpm</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-secondary/5 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Sleep Duration</div>
                    <div className="text-sm text-muted-foreground">Average: 7 hours</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Footprints className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">Daily Steps</div>
                    <div className="text-sm text-muted-foreground">Average: 8,000 steps</div>
                  </div>
                </div>
              </div>
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
        </TabsContent>

        {/* My NFTs Tab */}
        <TabsContent value="my-nfts" className="m-0">
          <div className="container mx-auto px-4 py-6 space-y-3 pb-24">
            {myNFTs.map((nft) => (
              <Card
                key={nft.id}
                className="p-5 bg-card/95 hover:bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-lg">{nft.area}</div>
                    <div className="text-sm text-muted-foreground">Minted {nft.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent font-bold">{nft.size}</div>
                    <Button variant="ghost" size="sm" className="h-7 mt-1">
                      View →
                    </Button>
                  </div>
                </div>
                <div className="h-32 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-primary/50" />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <BottomNav />
    </div>
  );
};

export default Stats;
