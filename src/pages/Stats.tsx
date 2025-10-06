import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Trophy,
  User,
  TrendingUp,
  MapPin,
  Activity,
  Zap
} from "lucide-react";

const Stats = () => {
  const navigate = useNavigate();

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
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Statistics</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Weekly Stats */}
        <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            This Week
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Distance", value: "24.5 km", icon: Activity },
              { label: "Runs", value: "5", icon: Activity },
              { label: "XP Earned", value: "+245", icon: Zap },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-6 h-6 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="p-6 bg-card/80">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Global Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.map((player) => (
              <div
                key={player.rank}
                className={`p-4 rounded-lg flex items-center gap-4 ${
                  player.isUser
                    ? "bg-accent/20 border border-accent/30"
                    : "bg-background/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    player.rank === 1
                      ? "bg-warning text-warning-foreground"
                      : player.rank === 2
                      ? "bg-muted text-muted-foreground"
                      : player.rank === 3
                      ? "bg-warning/50 text-warning-foreground"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {player.rank}
                </div>
                <div className="text-2xl">{player.avatar}</div>
                <div className="flex-1">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {player.xp.toLocaleString()} XP
                  </div>
                </div>
                {player.isUser && (
                  <div className="text-accent font-bold text-sm">You</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* My NFTs */}
        <Card className="p-6 bg-card/80">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            My Land NFTs
          </h3>
          <div className="space-y-3">
            {myNFTs.map((nft) => (
              <div
                key={nft.id}
                className="p-4 bg-background/50 rounded-lg border border-border/50 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{nft.area}</div>
                  <div className="text-accent font-bold text-sm">{nft.size}</div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Minted {nft.date}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
