import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { TaskProofDialog } from "@/components/TaskProofDialog";
import { useToast } from "@/hooks/use-toast";
import { Activity, MapPin, Zap, LogOut, Award, Trophy, Users, Coins, CheckCircle2, Clock, MessageSquare, ThumbsUp, Upload, Eye, Target, Wallet, Copy, Camera, Edit2, Check, X, User } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import strunLogo from "@/assets/strun-logo.jpg";
const Dashboard = () => {
  const {
    user,
    signOut,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [selectedProofTask, setSelectedProofTask] = useState<any>(null);
  const [selectedProofUserTaskId, setSelectedProofUserTaskId] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Fetch profile data
  const {
    data: profile
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const {
        data
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch task statistics
  const {
    data: taskStats
  } = useQuery({
    queryKey: ["task-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return {
        total: 0,
        completed: 0,
        pending: 0,
        totalXP: 0,
        totalSOL: 0
      };
      const {
        data
      } = await supabase.from("user_tasks").select("status, xp_awarded, sol_awarded").eq("user_id", user.id);
      return {
        total: data?.length || 0,
        completed: data?.filter(t => t.status === "completed").length || 0,
        pending: data?.filter(t => t.status === "pending").length || 0,
        totalXP: data?.reduce((sum, t) => sum + (t.xp_awarded || 0), 0) || 0,
        totalSOL: data?.reduce((sum, t) => sum + Number(t.sol_awarded || 0), 0) || 0
      };
    },
    enabled: !!user?.id
  });

  // Fetch user's task proofs
  const {
    data: myProofs
  } = useQuery({
    queryKey: ["my-proofs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data
      } = await supabase.from("task_proofs").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      });
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch user's groups
  const {
    data: myGroups
  } = useQuery({
    queryKey: ["groups-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data
      } = await supabase.from("group_members").select("*, groups(*)").eq("user_id", user.id);
      return data;
    },
    enabled: !!user?.id
  });
  const {
    data: myTasks
  } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data
      } = await supabase.from("user_tasks").select("*, tasks(*)").eq("user_id", user.id).order("joined_at", {
        ascending: false
      }).limit(10);
      return data;
    },
    enabled: !!user?.id
  });
  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpInLevel = xp % 1000;
  const progressPercent = xpInLevel / 1000 * 100;
  const avatarUrl = profile?.avatar_url || null;
  const userName = profile?.username || "Runner";
  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setUploading(true);
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user?.id}/${oldPath}`]);
        }
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: publicUrl
      }).eq('id', user?.id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({
        queryKey: ['profile', user?.id]
      });
      toast({
        title: "Success! Avatar Updated",
        description: "Your profile photo has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "Invalid Username",
        description: "Username cannot be empty",
        variant: "destructive"
      });
      return;
    }
    try {
      setUpdating(true);
      const {
        error
      } = await supabase.from('profiles').update({
        username: newUsername.trim()
      }).eq('id', user?.id);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ['profile', user?.id]
      });
      setIsEditingUsername(false);
      toast({
        title: "Success! Username Updated",
        description: "Your username has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update username. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  const handleCancelEdit = () => {
    setNewUsername(profile?.username || "");
    setIsEditingUsername(false);
  };
  const taskStatusData = [{
    name: "Completed",
    value: taskStats?.completed || 0,
    color: "hsl(var(--success))"
  }, {
    name: "Pending",
    value: taskStats?.pending || 0,
    color: "hsl(var(--primary))"
  }];
  if (authLoading || !profile) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="w-12 h-12 text-accent animate-pulse" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={strunLogo} alt="Strun" className="h-10" />
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="cyan" className="h-20 flex-col gap-2" onClick={() => navigate("/tasks")}>
            <MapPin className="w-6 h-6" />
            <span className="text-xs">Tasks</span>
          </Button>
          <Button variant="purple" className="h-20 flex-col gap-2" onClick={() => navigate("/wallet")}>
            <Wallet className="w-6 h-6" />
            <span className="text-xs">Wallet</span>
          </Button>
          <Button variant="accent" className="h-20 flex-col gap-2" onClick={() => navigate("/stats")}>
            <Activity className="w-6 h-6" />
            <span className="text-xs">Stats</span>
          </Button>
        </div>

        <Card className="p-6 glass">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-bold gradient-text">{xp.toLocaleString()} XP</h2>
                </div>
                <p className="text-[10px] text-muted-foreground/80 font-light mt-0.5">Level {level}</p>
              </div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground text-right">{xpInLevel} / 1000 XP</p>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur-lg">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
            <TabsTrigger value="community" className="text-xs">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Profile Edit Card */}
            

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 glass hover-lift">
                <Zap className="w-5 h-5 mb-2 text-primary" />
                <div className="text-2xl font-bold gradient-text">{xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </Card>
              <Card className="p-4 glass hover-lift">
                <CheckCircle2 className="w-5 h-5 mb-2 text-success" />
                <div className="text-2xl font-bold gradient-text">{taskStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </Card>
              <Card className="p-4 glass hover-lift">
                <Coins className="w-5 h-5 mb-2 text-secondary" />
                <div className="text-2xl font-bold gradient-text">{taskStats?.totalSOL.toFixed(2) || "0.00"}</div>
                <div className="text-xs text-muted-foreground">SOL Earned</div>
              </Card>
              <Card className="p-4 glass hover-lift">
                <Users className="w-5 h-5 mb-2 text-accent" />
                <div className="text-2xl font-bold gradient-text">{myGroups?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Groups</div>
              </Card>
            </div>
            
            <Card className="p-6 glass">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Task Status
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={entry => `${entry.name}: ${entry.value}`}>
                    {taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 glass hover-lift">
                <CheckCircle2 className="w-5 h-5 mb-2 text-success" />
                <div className="text-2xl font-bold gradient-text">{taskStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </Card>
              <Card className="p-4 glass hover-lift">
                <Clock className="w-5 h-5 mb-2 text-primary" />
                <div className="text-2xl font-bold gradient-text">{taskStats?.pending || 0}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </Card>
            </div>

            <Card className="p-6 glass">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                My Tasks
              </h3>
              <div className="space-y-3">
                {myTasks && myTasks.length > 0 ? myTasks.map(ut => <div key={ut.id} className={`flex items-center justify-between p-3 glass rounded-lg ${ut.status === "pending" ? "cursor-pointer hover-lift" : ""}`} onClick={() => {
                if (ut.status === "pending" && ut.tasks) {
                  setSelectedProofTask(ut.tasks);
                  setSelectedProofUserTaskId(ut.id);
                  setShowProofDialog(true);
                }
              }}>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{ut.tasks?.title || ut.tasks?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ut.status === "completed" ? "✓ Completed" : "⏱ In Progress"} • <span className="text-primary font-bold">+{ut.xp_awarded || ut.tasks?.xp_reward || 0} XP</span>
                        </div>
                      </div>
                      <Badge variant={ut.status === "completed" ? "default" : "outline"} className="text-xs">
                        {ut.status}
                      </Badge>
                    </div>) : <p className="text-center text-muted-foreground py-8">No tasks accepted yet</p>}
              </div>
              {myTasks && myTasks.length > 0 && <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/tasks")}>
                  View All Tasks →
                </Button>}
            </Card>

            <Card className="p-6 glass">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                My Proofs
              </h3>
              <div className="space-y-3">
                {myProofs && myProofs.length > 0 ? myProofs.slice(0, 5).map(proof => <div key={proof.id} className="flex justify-between p-3 glass rounded-lg hover-lift">
                      <div className="flex-1">
                        <div className="font-medium line-clamp-1 text-foreground">{proof.content}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(proof.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-success" />
                        <span className="font-bold text-success">{proof.upvotes}</span>
                      </div>
                    </div>) : <p className="text-center text-muted-foreground py-8">No proofs submitted yet</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <Card className="p-6 glass border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">SOL Wallet</h3>
              </div>
              {profile?.solana_public_key ? <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-primary/5 px-4 py-3 rounded-lg font-mono text-xs break-all">
                      {profile.solana_public_key}
                    </code>
                    <Button variant="ghost" size="icon" onClick={() => {
                  navigator.clipboard.writeText(profile.solana_public_key!);
                }} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div> : <div className="text-center py-4 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No wallet created yet</p>
                </div>}
            </Card>

            <Card className="p-6 glass bg-gradient-to-br from-success/10 to-success/5 border-success/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-success/20 p-3 rounded-full">
                    <Coins className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Balance</h3>
                    <p className="text-xs text-muted-foreground">Total SOL earned</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-success">{taskStats?.totalSOL.toFixed(2) || "0.00"}</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card className="p-6 glass bg-gradient-to-br from-card via-card to-primary/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Level {level}</h2>
                  <p className="text-sm text-muted-foreground">{xpInLevel} / 1000 XP</p>
                </div>
                <div className="bg-accent/20 p-3 rounded-full">
                  <Trophy className="w-8 h-8 text-accent" />
                </div>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{1000 - xpInLevel} XP to next level</p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 glass hover-lift">
                <Zap className="w-5 h-5 mb-2 text-primary" />
                <div className="text-2xl font-bold gradient-text">{xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </Card>
              <Card className="p-4 glass hover-lift">
                <CheckCircle2 className="w-5 h-5 mb-2 text-success" />
                <div className="text-2xl font-bold gradient-text">{taskStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <Card className="p-6 glass">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                My Groups
              </h3>
              {myGroups?.length ? myGroups.map(g => <div key={g.id} className="p-3 glass rounded-lg mb-2 hover-lift cursor-pointer" onClick={() => navigate("/group")}>
                  <div className="font-medium text-foreground">{g.groups?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{g.groups?.location}</div>
                </div>) : <p className="text-muted-foreground text-center py-4">No groups joined yet</p>}
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/group")}>
                Browse Groups →
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proof Dialog */}
      {selectedProofTask && selectedProofUserTaskId && <TaskProofDialog open={showProofDialog} onOpenChange={setShowProofDialog} taskId={selectedProofTask.id} userTaskId={selectedProofUserTaskId} taskLocation={{
      lat: selectedProofTask.lat,
      lon: selectedProofTask.lon,
      radius_m: selectedProofTask.radius_m || 50
    }} onProofSubmitted={() => {
      setShowProofDialog(false);
      window.location.reload();
    }} />}

      <BottomNav />
    </div>;
};
export default Dashboard;