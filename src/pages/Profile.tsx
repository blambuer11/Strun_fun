import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Award,
  Share2,
  Settings,
  Mail,
  Zap,
  Trophy,
  MapPin,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const userEmail = localStorage.getItem("strun_user") || "runner@strun.app";
  const xp = 150;
  const level = Math.floor(xp / 1000) + 1;
  const referralCode = "STRUN-XYZ123";

  const achievements = [
    { name: "First Run", description: "Complete your first run", unlocked: true },
    { name: "Territory Pioneer", description: "Mint your first LandNFT", unlocked: true },
    { name: "Speed Demon", description: "Run 10km in under 50 minutes", unlocked: false },
    { name: "Community Leader", description: "Get 10 referrals", unlocked: false },
  ];

  const handleShare = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Referral Code Copied!",
      description: "Share with friends to earn 50 XP",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-accent to-accent-glow rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-accent-foreground" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Runner</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {userEmail}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold">Level {level}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold">{xp} XP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to Level {level + 1}</span>
              <span className="text-accent font-bold">{xp % 1000} / 1000 XP</span>
            </div>
            <Progress value={(xp % 1000) / 10} className="h-2" />
          </div>
        </Card>

        {/* Referral Card */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 border-accent/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-accent" />
                Referral Code
              </h3>
              <p className="text-xs text-muted-foreground">Earn 50 XP per referral</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background/50 px-4 py-3 rounded-lg font-mono text-accent">
              {referralCode}
            </code>
            <Button variant="accent" onClick={handleShare}>
              Copy
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Runs", value: "12", icon: Activity },
            { label: "NFTs", value: "5", icon: MapPin },
            { label: "Total XP", value: "150", icon: Zap },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 bg-card/80 text-center">
              <stat.icon className="w-6 h-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Achievements */}
        <Card className="p-6 bg-card/80">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            Achievements
          </h3>
          <div className="space-y-3">
            {achievements.map((achievement, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  achievement.unlocked
                    ? "bg-accent/10 border-accent/30"
                    : "bg-background/50 border-border/50 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.unlocked
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{achievement.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {achievement.description}
                    </div>
                  </div>
                  {achievement.unlocked && (
                    <div className="text-accent font-bold text-sm">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
