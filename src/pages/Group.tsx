import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { 
  Users,
  Plus,
  MapPin,
  Calendar,
  Award,
  Crown
} from "lucide-react";

const Group = () => {
  const navigate = useNavigate();

  const groups = [
    {
      id: 1,
      name: "Morning Warriors",
      members: 24,
      location: "Central Park",
      date: "Tomorrow, 7:00 AM",
      prize: "500 XP",
      sponsored: false,
    },
    {
      id: 2,
      name: "Sunset Sprint Challenge",
      members: 45,
      location: "Riverside Trail",
      date: "Friday, 6:00 PM",
      prize: "1000 XP + NFT",
      sponsored: true,
      sponsor: "RunTech",
    },
    {
      id: 3,
      name: "Weekend Marathon",
      members: 12,
      location: "City Loop",
      date: "Saturday, 8:00 AM",
      prize: "750 XP",
      sponsored: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Group Runs</h1>
          <Button variant="accent" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Create Group CTA */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 border-accent/30">
          <div className="flex items-center gap-4">
            <div className="bg-accent/20 p-3 rounded-full">
              <Plus className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Create Your Own Group</h3>
              <p className="text-sm text-muted-foreground">
                Organize runs and earn 100 XP
              </p>
            </div>
            <Button variant="accent">Create</Button>
          </div>
        </Card>

        {/* Available Groups */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Available Groups
          </h3>

          {groups.map((group) => (
            <Card
              key={group.id}
              className={`p-6 ${
                group.sponsored
                  ? "bg-gradient-to-br from-warning/10 via-card to-primary/5 border-warning/30"
                  : "bg-card/80"
              }`}
            >
              {group.sponsored && (
                <div className="flex items-center gap-2 mb-3 text-warning">
                  <Crown className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    Sponsored by {group.sponsor}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-lg">{group.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Users className="w-4 h-4" />
                    <span>{group.members} runners</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span>{group.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span>{group.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-accent" />
                    <span className="font-bold text-accent">{group.prize}</span>
                  </div>
                </div>

                <Button
                  variant={group.sponsored ? "warning" : "accent"}
                  className="w-full"
                >
                  Join Group
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* My Groups */}
        <Card className="p-6 bg-card/80">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            My Groups
          </h3>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>You haven't joined any groups yet</p>
            <p className="text-sm">Join a group to earn bonus XP!</p>
          </div>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Group;
