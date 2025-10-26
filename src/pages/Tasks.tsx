import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import TasksMap from "@/components/TasksMap";
import BottomNav from "@/components/BottomNav";
import { TaskVerificationDialog } from "@/components/TaskVerificationDialog";
import { CreateSponsoredTaskDialog } from "@/components/CreateSponsoredTaskDialog";
import { TaskProofDialog } from "@/components/TaskProofDialog";
import { TaskProofsList } from "@/components/TaskProofsList";
import { MapPin, Camera, Share2, CheckCircle2, Clock, Zap, Coins, Navigation, X as XIcon, Loader2, Sparkles, Award, Filter, Search, Upload, Twitter, Facebook, Linkedin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [dailyTasksRemaining, setDailyTasksRemaining] = useState(3);
  const [dailyTasksCompleted, setDailyTasksCompleted] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [totalSOL, setTotalSOL] = useState(0);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any>(null);
  const [verifyingTask, setVerifyingTask] = useState<any>(null);
  const [verifyingUserTaskId, setVerifyingUserTaskId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [selectedProofTask, setSelectedProofTask] = useState<any>(null);
  const [selectedProofUserTaskId, setSelectedProofUserTaskId] = useState<string | null>(null);
  
  // Marketplace state
  const [marketplaceTasks, setMarketplaceTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [rewardFilter, setRewardFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const loadMyTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_tasks")
      .select("*, tasks(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });
    
    console.log("My Tasks loaded:", data);
    setMyTasks(data || []);
    
    // Calculate completed today
    const today = new Date().toISOString().split("T")[0];
    const completedToday = (data || []).filter(
      (t: any) => t.status === "completed" && t.completed_at?.startsWith(today)
    ).length;
    setDailyTasksCompleted(completedToday);
  };

  const loadAvailableTasks = async () => {
    if (!user) return;
    
    // Get sponsored tasks that user hasn't joined yet
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "published")
      .not("type", "eq", "qr_checkin")
      .order("created_at", { ascending: false });
    
    // Filter out tasks user has already joined
    const userTaskIds = myTasks.map(ut => ut.task_id);
    const available = (allTasks || []).filter(t => !userTaskIds.includes(t.id));
    
    setAvailableTasks(available);
  };

  const loadMarketplaceTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, pools(*)")
      .eq("status", "published")
      .not("pool_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    
    const tasks = data || [];
    setMarketplaceTasks(tasks);
    setFilteredTasks(tasks);
    
    // Extract unique cities
    const cities = [...new Set(tasks.map((t: any) => t.city).filter(Boolean))];
    setAvailableCities(cities as string[]);
  };

  // Filter tasks based on selected filters
  useEffect(() => {
    let filtered = [...marketplaceTasks];
    
    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter(t => t.city === cityFilter);
    }
    
    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Reward filter
    if (rewardFilter === "sol") {
      filtered = filtered.filter(t => (t.sol_reward || 0) > 0);
    } else if (rewardFilter === "xp") {
      filtered = filtered.filter(t => (t.xp_reward || 0) > 0);
    } else if (rewardFilter === "high") {
      filtered = filtered.filter(t => (t.sol_reward || 0) > 0.1 || (t.xp_reward || 0) > 100);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTasks(filtered);
  }, [cityFilter, typeFilter, rewardFilter, searchQuery, marketplaceTasks]);

  const loadDailyLimit = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("daily_task_count, last_task_date")
      .eq("id", user.id)
      .single();
    
    const today = new Date().toISOString().split("T")[0];
    const remaining = data?.last_task_date === today ? 3 - (data?.daily_task_count || 0) : 3;
    setDailyTasksRemaining(remaining);
  };

  const loadStats = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();
    
    setTotalXP(profile?.xp || 0);
    
    // Calculate total SOL earned
    const { data: tasks } = await supabase
      .from("user_tasks")
      .select("sol_awarded")
      .eq("user_id", user.id)
      .eq("status", "completed");
    
    const solTotal = (tasks || []).reduce((sum: number, t: any) => sum + (t.sol_awarded || 0), 0);
    setTotalSOL(solTotal);
  };

  useEffect(() => { 
    loadMyTasks(); 
    loadDailyLimit();
    loadStats();
    loadMarketplaceTasks();
  }, [user]);

  useEffect(() => {
    if (myTasks.length > 0) {
      loadAvailableTasks();
    }
  }, [myTasks]);

  const handleTaskSelect = async (task: any) => {
    setSelectedTask(task);
    setSelectedTaskDetail(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    setSelectedTaskDetail(null);
  };

  const handleGenerateTasks = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to generate tasks", variant: "destructive" });
      return;
    }

    if (dailyTasksRemaining <= 0) {
      toast({ 
        title: "Daily Limit Reached", 
        description: "You've used all 3 task generation slots today. Come back tomorrow!",
        variant: "destructive" 
      });
      return;
    }

    setGeneratingTasks(true);
    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { data, error } = await supabase.functions.invoke("generate-location-task", {
        body: { 
          userId: user.id, 
          lat: position.coords.latitude, 
          lon: position.coords.longitude, 
          count: 3 
        }
      });

      if (error) throw error;

      if (data.limit_reached) {
        toast({ 
          title: "Daily Limit Reached", 
          description: "You can only generate tasks 3 times per day",
          variant: "destructive" 
        });
        return;
      }

      toast({
        title: "Tasks Generated! 🎯",
        description: `${data.tasks?.length || 0} new tasks in ${data.city}. Check the map!`,
      });

      loadDailyLimit();
      // Reload map to show new tasks
      window.location.reload();
    } catch (error: any) {
      if (error.code === 1) {
        toast({
          title: "Location Permission Denied",
          description: "Please enable location access to generate tasks",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate tasks",
          variant: "destructive"
        });
      }
    } finally {
      setGeneratingTasks(false);
    }
  };

  const handleAcceptTask = async (task: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to accept tasks", variant: "destructive" });
      return;
    }

    if (dailyTasksRemaining <= 0) {
      toast({ 
        title: "Daily Limit Reached", 
        description: "You can only accept 3 tasks per day. Come back tomorrow!",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-task", {
        body: { userId: user.id, taskId: task.id },
      });

      if (error) throw error;

      if (data.limit_reached) {
        toast({ 
          title: "Daily Limit Reached", 
          description: "You can only accept 3 tasks per day",
          variant: "destructive" 
        });
        return;
      }

      toast({ 
        title: "Task Accepted! 🎯", 
        description: `Task added to My Tasks. ${data.remaining_today} remaining today`,
      });
      
      loadMyTasks();
      loadDailyLimit();
      handleCloseTaskModal();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (task: any, userTaskId: string) => {
    if (!user) return;
    
    setCheckingIn(true);
    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      const taskLat = task.lat;
      const taskLon = task.lon;
      
      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (userLat * Math.PI) / 180;
      const φ2 = (taskLat * Math.PI) / 180;
      const Δφ = ((taskLat - userLat) * Math.PI) / 180;
      const Δλ = ((taskLon - userLon) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const radiusM = task.radius_m || 30;

      if (distance > radiusM) {
        toast({
          title: "Too Far! 📍",
          description: `You're ${Math.round(distance)}m away. Get within ${radiusM}m to check-in.`,
          variant: "destructive"
        });
        return;
      }

      // Update task as completed
      const { error } = await supabase
        .from("user_tasks")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
          geo_meta: { lat: userLat, lon: userLon, distance: Math.round(distance) }
        })
        .eq("id", userTaskId);

      if (error) throw error;

      // Award XP
      await supabase.rpc("increment_xp", {
        user_id: user.id,
        xp_amount: task.xp_reward || 0
      });

      toast({
        title: "Check-in Successful! ✅",
        description: `Earned ${task.xp_reward} XP! You were ${Math.round(distance)}m away.`,
      });

      loadMyTasks();
      loadStats();
      handleCloseTaskModal();
    } catch (error: any) {
      if (error.code === 1) {
        toast({
          title: "Location Permission Denied",
          description: "Please enable location access to check-in",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Check-in Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCancelTask = async (userTaskId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("user_tasks")
        .delete()
        .eq("id", userTaskId);

      if (error) throw error;

      toast({ 
        title: "Task Cancelled", 
        description: "Task removed from your list",
      });

      loadMyTasks();
      loadDailyLimit();
      handleCloseTaskModal();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleShareTask = async (userTaskData: any) => {
    const task = userTaskData.tasks;
    navigate(`/share/${task.id}`);
  };

  const handleShareToSocial = (platform: string, task: any, userTask?: any) => {
    const appUrl = window.location.origin;
    const taskUrl = `${appUrl}/share/${task.id}`;
    const text = userTask 
      ? `I just completed "${task.name || task.title}" and earned ${userTask.xp_awarded || task.xp_reward} XP! 🎯` 
      : `Check out this task: "${task.name || task.title}" - Earn ${task.xp_reward} XP! 🎯`;
    
    let shareUrl = '';
    
    switch(platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(taskUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(taskUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(taskUrl)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Find user task for selected task
  const userTask = selectedTask 
    ? myTasks.find(ut => ut.task_id === selectedTask.id)
    : null;

  const isTaskAccepted = !!userTask;
  const isTaskCompleted = userTask?.status === "completed";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* AI Generate & Create Task Buttons */}
        <Card className="p-3 sm:p-4 glass border-accent/30 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
            <div>
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Task Actions
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generate AI tasks or create sponsored tasks
              </p>
            </div>
            <Badge variant={dailyTasksRemaining > 0 ? "default" : "destructive"} className="w-fit">
              {dailyTasksRemaining} left
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleGenerateTasks}
              disabled={generatingTasks || dailyTasksRemaining <= 0}
              className="w-full sm:flex-1 h-10 sm:h-12 text-sm"
            >
              {generatingTasks ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="truncate">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="truncate">Generate Location Tasks</span>
                </>
              )}
            </Button>
            <CreateSponsoredTaskDialog />
          </div>
        </Card>

        {/* Top Info Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
          <Card className="p-3 sm:p-4 glass border-primary/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Daily</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">
              {dailyTasksCompleted}/3
            </div>
            <Badge variant={dailyTasksRemaining > 0 ? "default" : "destructive"} className="mt-1 text-xs">
              {dailyTasksRemaining} left
            </Badge>
          </Card>

          <Card className="p-4 glass border-accent/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Total XP</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {totalXP}
            </div>
          </Card>

          <Card className="p-4 glass border-success/30">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Total SOL</span>
            </div>
            <div className="text-2xl font-bold text-success">
              {totalSOL.toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Map and Task List */}
        <TasksMap onTaskSelect={handleTaskSelect} />

        {/* Task Marketplace Section */}
        <Card className="p-4 glass mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              Task Marketplace
            </h3>
            <Badge variant="outline">{filteredTasks.length} tasks</Badge>
          </div>

          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="photo_task">Photo</SelectItem>
                  <SelectItem value="selfie">Selfie</SelectItem>
                  <SelectItem value="qr_checkin">QR Check-in</SelectItem>
                </SelectContent>
              </Select>

              <Select value={rewardFilter} onValueChange={setRewardFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Reward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rewards</SelectItem>
                  <SelectItem value="sol">SOL Only</SelectItem>
                  <SelectItem value="xp">XP Only</SelectItem>
                  <SelectItem value="high">High Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task Grid */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
              {filteredTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="p-4 glass border-border/50 hover:border-accent/60 transition-colors cursor-pointer"
                  onClick={() => handleTaskSelect(task)}
                >
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      {task.type === 'photo_task' && <Camera className="w-5 h-5" />}
                      {task.type === 'selfie' && <Camera className="w-5 h-5" />}
                      {task.type === 'qr_checkin' && <MapPin className="w-5 h-5" />}
                      {!['photo_task', 'selfie', 'qr_checkin'].includes(task.type) && <Award className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{task.name || task.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                      {task.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {task.city}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {task.type.replace(/_/g, ' ')}
                        </Badge>
                        {task.xp_reward > 0 && (
                          <Badge className="bg-accent/20 text-accent text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            {task.xp_reward} XP
                          </Badge>
                        )}
                        {task.sol_reward > 0 && (
                          <Badge className="bg-success/20 text-success text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            {task.sol_reward} SOL
                          </Badge>
                        )}
                        {task.max_participants && (
                          <Badge variant="secondary" className="text-xs">
                            {task.current_participants || 0}/{task.max_participants}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* My Tasks Section */}
        <Card className="p-4 glass mt-6 border-primary/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              My Tasks ({myTasks.length})
            </h3>
          </div>

          {/* Instructions Card */}
          <Card className="p-4 bg-accent/10 border-accent/30 mb-4">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">How to Submit Proof</h4>
                <p className="text-xs text-muted-foreground">
                  1. Click "Submit Proof" button on any task below<br />
                  2. Upload photo or video proof of completion<br />
                  3. Your GPS location will be verified automatically<br />
                  4. Wait for verification to earn rewards!
                </p>
              </div>
            </div>
          </Card>
          
          {myTasks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Accept tasks from the map or marketplace above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map((ut) => {
                const t = ut.tasks;
                if (!t) return null;
                const isPending = ut.status === 'pending';
                const isCompleted = ut.status === 'completed';
                
                return (
                  <Card 
                    key={ut.id} 
                    className={`p-4 glass border-2 transition-all cursor-pointer ${
                      isPending ? 'border-warning/50 hover:border-warning' : 
                      isCompleted ? 'border-success/50' : 'border-border/50'
                    }`}
                    onClick={() => isPending && handleTaskSelect(t)}
                  >
                    <div className="flex gap-3">
                      <div className={`p-3 rounded-lg ${
                        isCompleted ? 'bg-success/20' : 
                        isPending ? 'bg-warning/20 animate-pulse' : 'bg-muted'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        ) : isPending ? (
                          <Clock className="w-6 h-6 text-warning" />
                        ) : (
                          <Clock className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-base">{t.name || t.title}</h4>
                            {(t.location_name || t.meta?.location_name) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {t.location_name || t.meta?.location_name}
                              </p>
                            )}
                          </div>
                          {isPending && (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 animate-pulse">
                              ⚡ Action Required
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-2">
                          <Badge variant={isCompleted ? "default" : "outline"} className={isCompleted ? "bg-success" : ""}>
                            {ut.status}
                          </Badge>
                          <Badge className="bg-accent/20 text-accent">
                            +{ut.xp_awarded || t.xp_reward} XP
                          </Badge>
                          {(ut.sol_awarded || t.sol_reward) > 0 && (
                            <Badge className="bg-success/20 text-success">
                              {ut.sol_awarded || t.sol_reward} SOL
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action Buttons - More Prominent */}
                        <div className="flex gap-2 mt-4">
                          {isPending && t.type === 'qr_checkin' && (
                            <Button 
                              onClick={() => handleCheckIn(t, ut.id)}
                              disabled={checkingIn}
                              className="flex-1 h-11"
                              variant="default"
                            >
                              {checkingIn ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                              ) : (
                                <><Navigation className="w-4 h-4 mr-2" />Check-in Now</>
                              )}
                            </Button>
                          )}
                          
                          {isPending && t.type !== 'qr_checkin' && (
                            <>
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProofTask(t);
                                  setSelectedProofUserTaskId(ut.id);
                                  setShowProofDialog(true);
                                }} 
                                className="flex-1 h-11 bg-accent hover:bg-accent/90"
                              >
                                <Upload className="w-5 h-5 mr-2" />
                                Submit Proof
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelTask(ut.id);
                                }}
                                variant="outline"
                                size="icon"
                                className="h-11 w-11"
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          {isCompleted && (
                            <>
                              <div className="flex gap-2 w-full">
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareToSocial('twitter', t, ut);
                                  }}
                                  variant="outline" 
                                  size="icon"
                                  className="h-11 w-11"
                                >
                                  <Twitter className="w-4 h-4" />
                                </Button>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareToSocial('facebook', t, ut);
                                  }}
                                  variant="outline" 
                                  size="icon"
                                  className="h-11 w-11"
                                >
                                  <Facebook className="w-4 h-4" />
                                </Button>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareToSocial('linkedin', t, ut);
                                  }}
                                  variant="outline" 
                                  size="icon"
                                  className="h-11 w-11"
                                >
                                  <Linkedin className="w-4 h-4" />
                                </Button>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProofTask(t);
                                    setSelectedProofUserTaskId(ut.id);
                                    setShowProofDialog(true);
                                  }} 
                                  variant="secondary"
                                  className="flex-1 h-11"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Add Proof
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        {/* Available Tasks Section */}
        {availableTasks.length > 0 && (
          <Card className="p-4 glass mt-6">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Available Sponsored Tasks
            </h3>
            <div className="space-y-3">
              {availableTasks.map((task) => (
                <Card key={task.id} className="p-4 glass border-accent/30 hover:border-accent/60 transition-colors cursor-pointer" onClick={() => handleTaskSelect(task)}>
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <Award className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{task.name || task.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{task.description?.substring(0, 100)}...</p>
                      {task.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {task.city}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-accent/20 text-accent">
                          +{task.xp_reward} XP
                        </Badge>
                        {task.sol_reward > 0 && (
                          <Badge className="bg-success/20 text-success">
                            {task.sol_reward} SOL
                          </Badge>
                        )}
                        {task.max_participants && (
                          <Badge variant="outline">
                            Max {task.max_participants} winners
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={handleCloseTaskModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {selectedTask.title || selectedTask.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedTask.description}
                </p>
                
                {(selectedTask.location_name || selectedTask.meta?.location_name) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedTask.location_name || selectedTask.meta?.location_name}</span>
                  </div>
                )}
              </div>

              {/* Rewards */}
              <div className="flex gap-2">
                <Badge className="bg-accent/20 text-accent">
                  <Zap className="w-3 h-3 mr-1" />
                  +{selectedTask.xp_reward} XP
                </Badge>
                {selectedTask.sol_reward > 0 && (
                  <Badge className="bg-success/20 text-success">
                    <Coins className="w-3 h-3 mr-1" />
                    {selectedTask.sol_reward} SOL
                  </Badge>
                )}
                <Badge variant="outline">
                  {selectedTask.type.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Task Details */}
              <Card className="p-3 bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{selectedTask.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Radius:</span>
                    <span className="font-medium">{selectedTask.radius_m}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-medium">
                      {(selectedTask.distance_meters / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Limit:</span>
                    <span className="font-medium">
                      {dailyTasksCompleted}/3 completed
                    </span>
                  </div>
                </div>
              </Card>

              {/* Sponsored Pool Info */}
              {selectedTask.pools && (
                <Card className="p-3 bg-success/10 border-success/30">
                  <p className="text-sm text-success flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span className="font-medium">
                      Sponsored Task - {selectedTask.pools.total_funded_sol} SOL Pool
                    </span>
                  </p>
                  {selectedTask.max_participants && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTask.current_participants}/{selectedTask.max_participants} joined
                    </p>
                  )}
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!isTaskAccepted ? (
                  <>
                    <Button
                      onClick={() => handleAcceptTask(selectedTask)}
                      disabled={loading || dailyTasksRemaining <= 0}
                      className="flex-1 h-12"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Accepting...</>
                      ) : (
                        <>Accept Task ({dailyTasksRemaining} left)</>
                      )}
                    </Button>
                    <Button
                      onClick={handleCloseTaskModal}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </>
                ) : isTaskCompleted ? (
                  <div className="space-y-2 w-full">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleShareToSocial('twitter', selectedTask, userTask)}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                      >
                        <Twitter className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => handleShareToSocial('facebook', selectedTask, userTask)}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                      >
                        <Facebook className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => handleShareToSocial('linkedin', selectedTask, userTask)}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                      >
                        <Linkedin className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => handleShareTask(userTask)}
                        className="flex-1 h-12"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isTaskAccepted && (
                      <div className="flex flex-col xs:flex-row gap-2 mb-2">
                        <Button
                          onClick={() => handleShareToSocial('twitter', selectedTask)}
                          variant="outline"
                          size="sm"
                          className="w-full xs:w-auto text-xs"
                        >
                          <Twitter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Twitter
                        </Button>
                        <Button
                          onClick={() => handleShareToSocial('facebook', selectedTask)}
                          variant="outline"
                          size="sm"
                          className="w-full xs:w-auto text-xs"
                        >
                          <Facebook className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Facebook
                        </Button>
                        <Button
                          onClick={() => handleShareToSocial('linkedin', selectedTask)}
                          variant="outline"
                          size="sm"
                          className="w-full xs:w-auto text-xs"
                        >
                          <Linkedin className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          LinkedIn
                        </Button>
                      </div>
                    )}
                    {selectedTask.type === 'qr_checkin' ? (
                      <Button
                        onClick={() => handleCheckIn(selectedTask, userTask.id)}
                        disabled={checkingIn}
                        className="flex-1 h-12"
                      >
                        {checkingIn ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                        ) : (
                          <><Navigation className="w-4 h-4 mr-2" />Check-in</>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setVerifyingTask(selectedTask);
                            setVerifyingUserTaskId(userTask.id);
                            handleCloseTaskModal();
                          }}
                          className="flex-1 h-12"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Content
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedProofTask(selectedTask);
                            setSelectedProofUserTaskId(userTask.id);
                            setShowProofDialog(true);
                          }}
                          variant="secondary"
                          className="flex-1 h-12"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Proof
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => handleCancelTask(userTask.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Task Proofs Section */}
              {selectedTask && (
                <div className="mt-6 pt-6 border-t">
                  <TaskProofsList taskId={selectedTask.id} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Verification Dialog */}
      {verifyingTask && verifyingUserTaskId && (
        <TaskVerificationDialog
          open={!!verifyingTask}
          onOpenChange={(open) => {
            if (!open) {
              setVerifyingTask(null);
              setVerifyingUserTaskId(null);
            }
          }}
          task={verifyingTask}
          userTaskId={verifyingUserTaskId}
          onVerified={() => {
            loadMyTasks();
            loadStats();
            setVerifyingTask(null);
            setVerifyingUserTaskId(null);
          }}
        />
      )}

      <TaskProofDialog
        open={showProofDialog}
        onOpenChange={setShowProofDialog}
        taskId={selectedProofTask?.id || ""}
        userTaskId={selectedProofUserTaskId || ""}
        taskLocation={selectedProofTask ? {
          lat: selectedProofTask.lat,
          lon: selectedProofTask.lon,
          radius_m: selectedProofTask.radius_m || 50
        } : undefined}
        onProofSubmitted={() => {
          loadMyTasks();
          loadStats();
          setShowProofDialog(false);
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Tasks;
