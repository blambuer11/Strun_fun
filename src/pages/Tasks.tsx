import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import TasksMap from "@/components/TasksMap";
import BottomNav from "@/components/BottomNav";
import { MapPin, Camera, Sparkles, Share2, CheckCircle2, Clock, Zap, Coins, Users } from "lucide-react";

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [dailyTasksRemaining, setDailyTasksRemaining] = useState(3);
  const [solPool, setSolPool] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [sponsorDescription, setSponsorDescription] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");

  const loadMyTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_tasks").select("*, tasks(*)").eq("user_id", user.id).order("created_at", { ascending: false });
    setMyTasks(data || []);
  };

  const loadDailyLimit = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("daily_task_count, last_task_date").eq("id", user.id).single();
    const today = new Date().toISOString().split("T")[0];
    setDailyTasksRemaining(data?.last_task_date === today ? 3 - (data?.daily_task_count || 0) : 3);
  };

  useEffect(() => { loadMyTasks(); loadDailyLimit(); }, [user]);

  const handleGenerateLocationTasks = async () => {
    if (!user || dailyTasksRemaining <= 0) {
      toast({ title: dailyTasksRemaining <= 0 ? "Daily Limit" : "Login Required", description: dailyTasksRemaining <= 0 ? "3 tasks/day limit" : "Please log in", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      const { data, error } = await supabase.functions.invoke("generate-location-task", { body: { userId: user.id, lat: pos.coords.latitude, lon: pos.coords.longitude, count: 3 } });
      if (error) throw error;
      if (data.limit_reached) { toast({ title: "Limit Reached", variant: "destructive" }); return; }
      setDailyTasksRemaining(data.daily_remaining || 0);
      toast({ title: "Tasks Generated!", description: `${data.tasks?.length || 0} in ${data.city}! ${data.daily_remaining || 0} left` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleCreateSponsoredTask = async () => {
    if (!user || !solPool || !maxParticipants || !sponsorDescription) {
      toast({ title: "Missing Info", description: "Fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      const { error } = await supabase.functions.invoke("generate-location-task", { body: { userId: user.id, lat: pos.coords.latitude, lon: pos.coords.longitude, solPool: parseFloat(solPool), maxParticipants: parseInt(maxParticipants), taskDescription: sponsorDescription } });
      if (error) throw error;
      toast({ title: "Sponsored Task Created!", description: `${solPool} SOL for ${maxParticipants} people` });
      setSolPool(""); setMaxParticipants(""); setSponsorDescription("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleAcceptTask = async (task: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("user_tasks").insert({ user_id: user.id, task_id: task.id, status: "pending" });
      if (error) throw error;
      toast({ title: "Task Accepted!", description: `Go complete "${task.name}"` });
      loadMyTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeclineTask = (taskId: string) => {
    toast({ title: "Task Declined", description: "Task removed from list" });
  };

  const handleShareTask = async (task: any) => {
    const text = `I completed "${task.name}" +${task.xp_reward} XP on Strun! 🏃‍♂️`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Strun', text, url: window.location.origin }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Share link copied" });
    }
  };

  const filteredTasks = statusFilter === "all" ? myTasks : myTasks.filter(t => t.status === statusFilter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="generate">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="sponsor">Sponsor</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <Card className="p-4 glass border-primary/30">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-accent" />Daily Limit</span>
                <Badge variant={dailyTasksRemaining > 0 ? "default" : "destructive"}>{dailyTasksRemaining}/3</Badge>
              </div>
              <Button onClick={handleGenerateLocationTasks} disabled={loading || dailyTasksRemaining <= 0} className="w-full" size="lg">
                <MapPin className="w-4 h-4 mr-2" />Generate 3 Location Tasks
              </Button>
            </Card>
            <TasksMap onTaskSelect={handleAcceptTask} onTaskDecline={handleDeclineTask} />
          </TabsContent>

          <TabsContent value="sponsor" className="space-y-4">
            <Card className="p-6 glass">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Coins className="w-5 h-5" />Sponsored Challenge</h3>
              <div className="space-y-4">
                <div><Label>SOL Pool</Label><Input type="number" step="0.01" placeholder="0.5" value={solPool} onChange={(e) => setSolPool(e.target.value)} /></div>
                <div><Label>Max Participants</Label><Input type="number" placeholder="10" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
                {solPool && maxParticipants && <p className="text-xs text-muted-foreground mt-1">Each: {(parseFloat(solPool)/parseInt(maxParticipants)).toFixed(4)} SOL</p>}</div>
                <div><Label>Description</Label><Textarea placeholder="Describe challenge" value={sponsorDescription} onChange={(e) => setSponsorDescription(e.target.value)} rows={3} /></div>
                <Button onClick={handleCreateSponsoredTask} disabled={loading} className="w-full" size="lg"><Coins className="w-4 h-4 mr-2" />Create Sponsored Task</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="my-tasks" className="space-y-4">
            <Card className="p-4 glass">
              <div className="flex gap-2 flex-wrap">
                <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All</Button>
                <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("pending")}>Pending</Button>
                <Button variant={statusFilter === "completed" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("completed")}>Completed</Button>
                <Button variant={statusFilter === "rejected" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("rejected")}>Rejected</Button>
              </div>
            </Card>
            {filteredTasks.length === 0 ? (
              <Card className="p-8 text-center"><Clock className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-muted-foreground">No tasks found</p></Card>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((ut) => {
                  const t = ut.tasks;
                  if (!t) return null;
                  return (
                    <Card key={ut.id} className="p-4 glass">
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${ut.status === 'completed' ? 'bg-success/20' : 'bg-primary/20'}`}>
                          {ut.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{t.name}</h4>
                          {t.location_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location_name}</p>}
                          <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{ut.status}</Badge>
                            {t.challenge_type && <Badge variant="outline">{t.challenge_type}</Badge>}
                            <Badge className="bg-accent/20 text-accent">+{ut.xp_awarded || t.xp_reward} XP</Badge>
                          </div>
                          {ut.status === 'completed' && (
                            <Button onClick={() => handleShareTask(t)} variant="outline" size="sm" className="w-full mt-3"><Share2 className="w-4 h-4 mr-2" />Share</Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Tasks;
