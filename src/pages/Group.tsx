import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import GoogleMap from "@/components/GoogleMap";
import { 
  Users,
  Plus,
  MapPin,
  Calendar,
  Award,
  Crown,
  MessageCircle,
  Trophy,
  Upload,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import strunLogo from "@/assets/strun-logo.jpg";

interface Group {
  id: string;
  name: string;
  description: string;
  location: string;
  scheduled_at: string;
  prize_pool_xp: number;
  prize_pool_sol: number;
  max_participants: number;
  is_sponsored: boolean;
  sponsor_name?: string;
  sponsor_banner_url?: string;
  creator_id: string;
  member_count?: number;
  is_member?: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

const Group = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sponsorshipFilter, setSponsorshipFilter] = useState<string>("all");

  // Create Group Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    scheduled_at: "",
    prize_pool_xp: 0,
    prize_pool_sol: 0,
    max_participants: 10,
    is_sponsored: false,
    sponsor_name: "",
    sponsor_banner_url: "",
  });

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch member counts and check if user is a member
      const groupsWithMemberInfo = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          const { data: membershipData } = await supabase
            .from("group_members")
            .select("id")
            .eq("group_id", group.id)
            .eq("user_id", user?.id)
            .single();

          return {
            ...group,
            member_count: count || 0,
            is_member: !!membershipData,
          };
        })
      );

      const availableGroups = groupsWithMemberInfo.filter(g => !g.is_member);
      const userGroups = groupsWithMemberInfo.filter(g => g.is_member);

      setGroups(availableGroups);
      setMyGroups(userGroups);
      
      // Reset filters when groups are reloaded
      setCountryFilter("all");
      setCityFilter("all");
      setSponsorshipFilter("all");
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          ...formData,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically join the created group
      await supabase
        .from("group_members")
        .insert({
          group_id: data.id,
          user_id: user.id,
        });

      // Award XP for creating group
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ xp: profile.xp + 100 })
          .eq("id", user.id);
      }

      toast({
        title: "Success",
        description: "Group created! You earned 100 XP",
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        location: "",
        scheduled_at: "",
        prize_pool_xp: 0,
        prize_pool_sol: 0,
        max_participants: 10,
        is_sponsored: false,
        sponsor_name: "",
        sponsor_banner_url: "",
      });
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Joined group successfully",
      });

      fetchGroups();
    } catch (error) {
      console.error("Error joining group:", error);
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive",
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Left group successfully",
      });

      fetchGroups();
    } catch (error) {
      console.error("Error leaving group:", error);
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract unique countries and cities from location strings
  // Expected format: "City, Country" or just "Location"
  const getLocationParts = (location: string) => {
    const parts = location.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      return { city: parts[0], country: parts[1] };
    }
    return { city: location, country: "" };
  };

  const uniqueCountries = Array.from(
    new Set(
      groups.map(g => getLocationParts(g.location).country).filter(c => c !== "")
    )
  ).sort();

  const uniqueCities = Array.from(
    new Set(
      groups.map(g => getLocationParts(g.location).city).filter(c => c !== "")
    )
  ).sort();

  // Filter groups based on selected filters
  const filteredGroups = groups.filter(group => {
    const { city, country } = getLocationParts(group.location);
    
    const matchesCountry = countryFilter === "all" || country === countryFilter;
    const matchesCity = cityFilter === "all" || city === cityFilter;
    const matchesSponsorship = 
      sponsorshipFilter === "all" ||
      (sponsorshipFilter === "sponsored" && group.is_sponsored) ||
      (sponsorshipFilter === "not-sponsored" && !group.is_sponsored);

    return matchesCountry && matchesCity && matchesSponsorship;
  });

  const GroupCard = ({ group, showActions = true }: { group: Group; showActions?: boolean }) => (
    <Card
      key={group.id}
      className={`p-6 ${
        group.is_sponsored
          ? "bg-gradient-to-br from-warning/10 via-card to-primary/5 border-warning/30"
          : "bg-card/80"
      }`}
    >
      {group.is_sponsored && (
        <div className="flex items-center gap-2 mb-3 text-warning">
          <Crown className="w-4 h-4" />
          <span className="text-xs font-bold">
            Sponsored by {group.sponsor_name}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h4 className="font-bold text-lg">{group.name}</h4>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Users className="w-4 h-4" />
            <span>{group.member_count || 0} / {group.max_participants} runners</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{group.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-accent" />
            <span>{formatDate(group.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-accent" />
            <span className="font-bold text-accent">
              {group.prize_pool_xp} XP
              {group.prize_pool_sol > 0 && ` + ${group.prize_pool_sol} SOL`}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {group.is_member ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setShowChat(true);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleLeaveGroup(group.id)}
                >
                  Leave
                </Button>
              </>
            ) : (
              <Button
                variant={group.is_sponsored ? "warning" : "accent"}
                className="w-full"
                onClick={() => handleJoinGroup(group.id)}
              >
                Join Group
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back
          </Button>
          <img 
            src={strunLogo} 
            alt="Strun Logo" 
            className="h-8 w-auto object-contain"
          />
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="icon">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <DialogTitle>Create Group Run</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-2" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                <div className="space-y-4 pb-4">
                  <div>
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Morning Warriors"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="A fun morning run..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country (e.g., Istanbul, Turkey)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: City, Country for better filtering
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="scheduled_at">Date & Time</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize_pool_xp">Prize Pool (XP)</Label>
                    <Input
                      id="prize_pool_xp"
                      type="number"
                      value={formData.prize_pool_xp}
                      onChange={(e) => setFormData({ ...formData, prize_pool_xp: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize_pool_sol">Prize Pool (SOL)</Label>
                    <Input
                      id="prize_pool_sol"
                      type="number"
                      step="0.01"
                      value={formData.prize_pool_sol}
                      onChange={(e) => setFormData({ ...formData, prize_pool_sol: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_sponsored"
                      checked={formData.is_sponsored}
                      onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="is_sponsored">Sponsored Event</Label>
                  </div>
                  {formData.is_sponsored && (
                    <>
                      <div>
                        <Label htmlFor="sponsor_name">Sponsor Name</Label>
                        <Input
                          id="sponsor_name"
                          value={formData.sponsor_name}
                          onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                          placeholder="RunTech"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sponsor_banner_url">Sponsor Banner URL</Label>
                        <Input
                          id="sponsor_banner_url"
                          value={formData.sponsor_banner_url}
                          onChange={(e) => setFormData({ ...formData, sponsor_banner_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-background flex-shrink-0">
                <Button onClick={handleCreateGroup} className="w-full h-12" variant="accent">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card className="p-4 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm">Filter Groups</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">City</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Sponsorship</Label>
              <Select value={sponsorshipFilter} onValueChange={setSponsorshipFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="sponsored">Sponsored Only</SelectItem>
                  <SelectItem value="not-sponsored">Not Sponsored</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

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
            <Button variant="accent" onClick={() => setIsCreateDialogOpen(true)}>
              Create
            </Button>
          </div>
        </Card>

        {/* Available Groups */}
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading groups...</p>
          </Card>
        ) : (
          <>
            {groups.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  Available Groups
                  <span className="text-sm font-normal text-muted-foreground">
                    ({filteredGroups.length})
                  </span>
                </h3>
                {filteredGroups.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">No groups match your filters</p>
                  </Card>
                ) : (
                  filteredGroups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))
                )}
              </div>
            )}

            {/* My Groups */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                My Groups
              </h3>
              {myGroups.length === 0 ? (
                <Card className="p-6 bg-card/80">
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>You haven't joined any groups yet</p>
                    <p className="text-sm">Join a group to earn bonus XP!</p>
                  </div>
                </Card>
              ) : (
                myGroups.map((group) => <GroupCard key={group.id} group={group} />)
              )}
            </div>
          </>
        )}

        {/* Leaderboard Section */}
        <Card className="p-6 bg-gradient-to-br from-warning/10 via-card to-primary/5 border-warning/30">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-bold">Sponsored Event Leaderboard</h3>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sponsored events active</p>
            <p className="text-sm">Win prizes by competing in sponsored runs!</p>
          </div>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Group;
