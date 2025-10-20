import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Zap, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import GoogleMap from "./GoogleMap";

interface Task {
  id: string;
  name: string;
  task_type: string;
  xp_reward: number;
  rules: any;
  distance_meters: number;
  partner_location: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    radius_m: number;
    sponsor_name: string | null;
    sponsor_banner_url: string | null;
  };
}

interface TasksMapProps {
  onTaskSelect?: (task: Task) => void;
}

const TasksMap = ({ onTaskSelect }: TasksMapProps) => {
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

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card/95">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Nearby Tasks
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => userLocation && loadNearbyTasks(userLocation.lat, userLocation.lng)}
            disabled={loading}
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} nearby`}
        </p>
      </Card>

      {userLocation && (
        <div className="h-[300px] rounded-lg overflow-hidden">
          <GoogleMap
            tracking={false}
            path={[]}
            markers={tasks.map(task => ({
              lat: task.partner_location.lat,
              lng: task.partner_location.lon,
              label: task.name,
            }))}
            center={userLocation}
          />
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="p-4 bg-card/95 hover:bg-card cursor-pointer transition-colors"
            onClick={() => onTaskSelect?.(task)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-bold mb-1">{task.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {task.partner_location.name}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-accent/10 text-accent px-2 py-1 rounded">
                    {task.task_type}
                  </span>
                  <span className="text-muted-foreground">
                    {(task.distance_meters / 1000).toFixed(1)} km away
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-accent font-bold">
                  <Zap className="w-4 h-4" />
                  +{task.xp_reward}
                </div>
                <p className="text-xs text-muted-foreground mt-1">XP</p>
              </div>
            </div>
            {task.partner_location.sponsor_name && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Sponsored by {task.partner_location.sponsor_name}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TasksMap;
