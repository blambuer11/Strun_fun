import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import { TaskProofDialog } from "@/components/TaskProofDialog";
import { 
  Activity, MapPin, Zap, LogOut, Award, Trophy, Users, Coins,
  CheckCircle2, Clock, MessageSquare, ThumbsUp, Upload, Eye, Target
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import strunLogo from "@/assets/strun-logo.jpg";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [selectedProofTask, setSelectedProofTask] = useState<any>(null);
  const [selectedProofUserTaskId, setSelectedProofUserTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch task statistics
  const { data: taskStats } = useQuery({
    queryKey: ["task-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, completed: 0, pending: 0, totalXP: 0, totalSOL: 0 };
      const { data } = await supabase.from("user_tasks").select("status, xp_awarded, sol_awarded").eq("user_id", user.id);
      return {
        total: data?.length || 0,
        completed: data?.filter(t => t.status === "completed").length || 0,
        pending: data?.filter(t => t.status === "pending").length || 0,
        totalXP: data?.reduce((sum, t) => sum + (t.xp_awarded || 0), 0) || 0,
        totalSOL: data?.reduce((sum, t) => sum + Number(t.sol_awarded || 0), 0) || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch user's task proofs
  const { data: myProofs } = useQuery({
    queryKey: ["my-proofs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("task_proofs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's groups
  const { data: myGroups } = useQuery({
    queryKey: ["groups-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("group_members").select("*, groups(*)").eq("user_id", user.id);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: myTasks } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_tasks")
        .select("*, tasks(*)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(10);
      return data;
    },
    enabled: !!user?.id,
  });

  const xp = profile?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const taskStatusData = [
    { name: "Completed", value: taskStats?.completed || 0, color: "hsl(var(--success))" },
    { name: "Pending", value: taskStats?.pending || 0, color: "hsl(var(--primary))" },
  ];

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="w-12 h-12 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-primary/20">
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
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="text-2xl font-bold">{xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">{taskStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">{taskStats?.totalSOL.toFixed(2) || "0.00"}</div>
                <div className="text-xs text-muted-foreground">SOL Earned</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">{myGroups?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Groups</div>
              </Card>
            </div>
            
            <Card className="p-6">
              <h3 className="font-bold mb-4">Task Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={(entry) => `${entry.name}: ${entry.value}`}>
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-success/10">
                <CheckCircle2 className="w-4 h-4 mb-2" />
                <div className="text-2xl font-bold">{taskStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </Card>
              <Card className="p-4 bg-primary/10">
                <Clock className="w-4 h-4 mb-2" />
                <div className="text-2xl font-bold">{taskStats?.pending || 0}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                My Tasks
              </h3>
              <div className="space-y-3">
                {myTasks && myTasks.length > 0 ? (
                  myTasks.map((ut) => (
                    <div 
                      key={ut.id} 
                      className={`flex items-center justify-between p-3 bg-background/50 rounded-lg ${
                        ut.status === "pending" ? "cursor-pointer hover:bg-background/80 transition-colors" : ""
                      }`}
                      onClick={() => {
                        if (ut.status === "pending" && ut.tasks) {
                          setSelectedProofTask(ut.tasks);
                          setSelectedProofUserTaskId(ut.id);
                          setShowProofDialog(true);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{ut.tasks?.title || ut.tasks?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ut.status === "completed" ? "✓ Completed" : "⏱ In Progress"} • +{ut.xp_awarded || ut.tasks?.xp_reward || 0} XP
                        </div>
                      </div>
                      <Badge variant={ut.status === "completed" ? "secondary" : "default"}>
                        {ut.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No tasks accepted yet</p>
                )}
              </div>
              {myTasks && myTasks.length > 0 && (
                <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/tasks")}>
                  View All Tasks →
                </Button>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                My Proofs
              </h3>
              <div className="space-y-3">
                {myProofs && myProofs.length > 0 ? (
                  myProofs.slice(0, 5).map((proof) => (
                    <div key={proof.id} className="flex justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium line-clamp-1">{proof.content}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(proof.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-success" />
                        <span className="font-medium">{proof.upvotes}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No proofs submitted yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">
                <Users className="w-5 h-5 inline mr-2" />
                Groups
              </h3>
              {myGroups?.length ? myGroups.map((g) => (
                <div key={g.id} className="p-3 bg-background/50 rounded-lg mb-2">{g.groups?.name}</div>
              )) : <p className="text-muted-foreground">No groups</p>}
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold mb-4">
                <Trophy className="w-5 h-5 inline mr-2" />
                Achievements
              </h3>
              <p className="text-muted-foreground">Complete tasks to earn badges and rewards!</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proof Dialog */}
      {selectedProofTask && selectedProofUserTaskId && (
        <TaskProofDialog
          open={showProofDialog}
          onOpenChange={setShowProofDialog}
          taskId={selectedProofTask.id}
          userTaskId={selectedProofUserTaskId}
          taskLocation={{
            lat: selectedProofTask.lat,
            lon: selectedProofTask.lon,
            radius_m: selectedProofTask.radius_m || 50
          }}
          onProofSubmitted={() => {
            setShowProofDialog(false);
            window.location.reload();
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
