import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { 
  Trophy,
  User,
  TrendingUp,
  MapPin,
  Activity,
  Zap,
  Heart,
  Moon,
  Footprints,
  Download,
  Share2,
  ArrowLeft
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const Stats = () => {
  const navigate = useNavigate();

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

  const leaderboard = [
    { rank: 1, name: "SpeedRunner", xp: 5420, avatar: "🏃" },
    { rank: 2, name: "TerritoryKing", xp: 4890, avatar: "👑" },
    { rank: 3, name: "MapMaster", xp: 4560, avatar: "🗺️" },
    { rank: 4, name: "NightRunner", xp: 3890, avatar: "🌙" },
    { rank: 5, name: "You", xp: 150, avatar: "👤", isUser: true },
  ];

  const myNFTs = [
    { id: 1, area: "Downtown Loop", size: "2.5 km²", date: "2 days ago" },
    { id: 2, area: "Park Circuit", size: "1.8 km²", date: "5 days ago" },
    { id: 3, area: "River Trail", size: "3.2 km²", date: "1 week ago" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Stats</h1>
          <div className="w-10" />
        </div>
      </header>

      <Tabs defaultValue="my-stats" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border/50 bg-card h-12">
          <TabsTrigger value="leaderboards" className="flex-1">Leaderboards</TabsTrigger>
          <TabsTrigger value="my-stats" className="flex-1">My Stats</TabsTrigger>
          <TabsTrigger value="my-nfts" className="flex-1">My NFTs</TabsTrigger>
        </TabsList>

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
