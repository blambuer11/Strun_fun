import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Award,
  Share2,
  Settings,
  Mail,
  Zap,
  Trophy,
  MapPin,
  Activity,
  ArrowLeft,
  Copy,
  Clock,
  LogOut,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleFit, setGoogleFit] = useState(true);
  const [appleHealth, setAppleHealth] = useState(false);

  const userEmail = localStorage.getItem("strun_user") || "runner@strun.app";
  const userName = "Ethan Carter";
  const userHandle = "@ethan.carter";
  const joinDate = "Joined 2023";
  const xp = 750;
  const level = Math.floor(xp / 1000) + 1;
  const referralCode = "STRUN-ETHAN-2024";

  const achievements = [
    { name: "First Run", description: "Complete your first run", unlocked: true },
    { name: "Territory Pioneer", description: "Mint your first LandNFT", unlocked: true },
    { name: "Speed Demon", description: "Run 10km in under 50 minutes", unlocked: false },
    { name: "Community Leader", description: "Get 10 referrals", unlocked: false },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Referral Code Copied!",
      description: "Share with friends to earn 50 XP",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("strun_user");
    navigate("/");
  };

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
            <p className="text-sm text-muted-foreground mb-1">{userHandle}</p>
            <p className="text-xs text-muted-foreground">{joinDate}</p>
          </div>
        </Card>

        {/* XP Progress */}
        <Card className="p-6 bg-card/95">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">XP</h3>
            <span className="text-sm text-accent font-bold">{xp}/1000</span>
          </div>
          <Progress value={(xp / 1000) * 100} className="h-2 mb-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>
        </Card>

        {/* Referral Code */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-sm font-bold mb-3">Referral Code</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-primary/5 px-4 py-3 rounded-lg font-mono text-sm">
              {referralCode}
            </code>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Health Permissions */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-sm font-bold mb-4">Health Permissions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Google Fit</div>
                <div className="text-xs text-muted-foreground">Sync steps and runs</div>
              </div>
              <Switch checked={googleFit} onCheckedChange={setGoogleFit} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Apple Health</div>
                <div className="text-xs text-muted-foreground">Sync steps and runs</div>
              </div>
              <Switch checked={appleHealth} onCheckedChange={setAppleHealth} />
            </div>
          </div>
        </Card>

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
          <h3 className="text-sm font-bold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-primary/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
              <div className="text-2xl font-bold">26</div>
            </div>
            <div className="p-4 bg-accent/5 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Total Distance</div>
              <div className="text-2xl font-bold">150 km</div>
            </div>
          </div>
          <div className="p-4 bg-secondary/5 rounded-xl mt-3">
            <div className="text-xs text-muted-foreground mb-1">Total Time</div>
            <div className="text-2xl font-bold">120 hrs</div>
          </div>
        </Card>

        {/* Linked Socials */}
        <Card className="p-6 bg-card/95">
          <h3 className="text-sm font-bold mb-4">Linked Socials</h3>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-between h-12">
              <span>Twitter</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="w-full justify-between h-12">
              <span>Instagram</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
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
    </div>
  );
};

export default Profile;
