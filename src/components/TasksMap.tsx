import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Navigation, QrCode, Camera, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import GoogleMap from "./GoogleMap";

interface Task {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  task_type: string;
  xp_reward: number;
  rules?: any;
  distance_meters: number;
  lat: number;
  lon: number;
  created_by?: string;
  partner_location_id?: string;
}

interface TasksMapProps {
  onTaskSelect?: (task: Task) => void;
  onTaskDecline?: (taskId: string) => void;
}

const TasksMap = ({ onTaskSelect, onTaskDecline }: TasksMapProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const loadNearbyTasks = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nearby-tasks', {
        body: { lat, lon, radius_m: 5000 }
      });

      if (error) throw error;

      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load nearby tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          loadNearbyTasks(location.lat, location.lng);
        },
        (error) => {
          console.error('Location error:', error);
          toast({
            title: "Location Error",
            description: "Could not access your location",
            variant: "destructive",
          });
        }
      );
    }
  }, []);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'qr_scan':
        return QrCode;
      case 'selfie_group':
        return Camera;
      default:
        return MapPin;
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'qr_scan':
        return 'primary';
      case 'selfie_group':
        return 'secondary';
      default:
        return 'accent';
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Preview Card */}
      <Card className="p-4 glass border-border/50 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/20">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Nearby Tasks</h3>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => userLocation && loadNearbyTasks(userLocation.lat, userLocation.lng)}
            disabled={loading}
            className="hover:bg-primary/10"
          >
            <Navigation className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Map Container */}
      {userLocation && (
        <Card className="overflow-hidden glass border-primary/30 animate-scale-in">
          <div className="h-[300px] relative">
            <GoogleMap
              tracking={false}
              path={[]}
              markers={tasks.map(task => ({
                lat: task.lat,
                lng: task.lon,
                label: task.title || task.name || 'Task',
              }))}
              center={userLocation}
            />
            {/* Map Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <Badge className="glass border-primary/50 text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                {tasks.length} nearby
              </Badge>
              <Badge className="glass border-accent/50 text-xs">
                <Zap className="w-3 h-3 mr-1 text-accent" />
                Up to {Math.max(...tasks.map(t => t.xp_reward), 0)} XP
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 && !loading ? (
          <Card className="p-8 text-center glass border-border/50">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No tasks nearby</p>
            <p className="text-xs text-muted-foreground mt-1">Move around to discover new challenges</p>
          </Card>
        ) : (
          tasks.map((task, index) => {
            const TaskIcon = getTaskIcon(task.task_type);
            const taskColor = getTaskColor(task.task_type);
            
            return (
              <Card
                key={task.id}
                className="p-4 glass border-border/50 hover:border-primary/50 cursor-pointer transition-all hover:scale-[1.02] animate-slide-up group"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => onTaskSelect?.(task)}
              >
                <div className="flex items-start gap-4">
                  {/* Task Icon with Pulse Ring */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-ring" />
                    <div className={`p-3 rounded-full bg-${taskColor}/20 relative z-10`}>
                      <TaskIcon className={`w-6 h-6 text-${taskColor === 'primary' ? 'primary' : taskColor === 'secondary' ? 'secondary' : 'accent'}`} />
                    </div>
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-base group-hover:text-primary transition-colors">
                          {task.title || task.name || 'Task'}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      {/* XP Badge */}
                      <div className="glass border border-accent/50 rounded-full px-3 py-1 flex items-center gap-1">
                        <Zap className="w-4 h-4 text-accent" />
                        <span className="font-bold text-sm text-xp">+{task.xp_reward}</span>
                      </div>
                    </div>

                    {/* Task Meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className="text-xs border-primary/30 bg-primary/10"
                      >
                        {task.task_type.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="text-xs border-border/50 bg-background/50"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        {(task.distance_meters / 1000).toFixed(1)} km
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-border/50 bg-background/50"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Active now
                      </Badge>
                    </div>

                    {/* Creator Info */}
                    {task.created_by && task.created_by !== 'admin' && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-accent">★</span>
                          {task.created_by === 'system' ? 'AI Generated Task' : `Created by ${task.created_by}`}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskSelect) onTaskSelect(task);
                        }}
                        className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                      >
                        Accept Task
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskDecline) onTaskDecline(task.id);
                          setTasks(tasks.filter(t => t.id !== task.id));
                        }}
                        className="flex-1 px-4 py-2 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TasksMap;
