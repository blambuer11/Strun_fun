import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  Square, 
  Pause,
  Timer,
  Activity,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import GoogleMap from "@/components/GoogleMap";

const Run = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [calories, setCalories] = useState(0);
  const [coordinates, setCoordinates] = useState<Array<{ lat: number; lng: number }>>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
        setCalories((prev) => prev + 0.5);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const calculateDistance = (coords: Array<{ lat: number; lng: number }>) => {
    if (coords.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const R = 6371; // Earth's radius in km
      const dLat = toRad(coords[i + 1].lat - coords[i].lat);
      const dLon = toRad(coords[i + 1].lng - coords[i].lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coords[i].lat)) * Math.cos(toRad(coords[i + 1].lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  };

  const toRad = (value: number) => (value * Math.PI) / 180;

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setStartTime(new Date());
    setCoordinates([]);
    setDistance(0);
    setDuration(0);
    setCalories(0);
    toast({
      title: "Run Started!",
      description: "GPS tracking activated. Good luck!",
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Resumed" : "Paused",
      description: isPaused ? "Keep going!" : "Take a breather",
    });
  };

  const handleStop = async () => {
    if (!isRunning || !user || !startTime) return;
    
    setIsRunning(false);
    setIsPaused(false);
    
    const earnedXP = Math.floor(distance * 10);
    const pace = duration > 0 ? distance / (duration / 3600) : 0;

    try {
      // Save run to database
      const { data: runData, error: runError } = await supabase
        .from("runs")
        .insert({
          user_id: user.id,
          distance: distance,
          duration: duration,
          calories: Math.floor(calories),
          pace: pace,
          xp_earned: earnedXP,
          route_coordinates: coordinates,
          started_at: startTime.toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      // Update user XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, level")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newXP = profile.xp + earnedXP;
        const newLevel = Math.floor(newXP / 1000) + 1;
        
        await supabase
          .from("profiles")
          .update({ xp: newXP, level: newLevel })
          .eq("id", user.id);
      }

      toast({
        title: "Run Complete!",
        description: `Earned ${earnedXP} XP! Distance: ${distance.toFixed(2)} km`,
      });

      // Mint NFT if area is large enough
      if (coordinates.length > 3 && distance > 0.5) {
        await mintLandNFT(runData.id, coordinates);
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error saving run:", error);
      toast({
        title: "Error",
        description: "Failed to save run. Please try again.",
        variant: "destructive",
      });
    }
  };

  const mintLandNFT = async (runId: string, coords: Array<{ lat: number; lng: number }>) => {
    try {
      // Calculate polygon area
      const area = calculatePolygonArea(coords);
      
      const { error } = await supabase
        .from("land_nfts")
        .insert({
          user_id: user!.id,
          run_id: runId,
          name: `Territory-${new Date().getTime()}`,
          polygon_coordinates: coords,
          area_size: area,
        });

      if (error) throw error;

      toast({
        title: "NFT Minted!",
        description: `Your territory (${area.toFixed(2)} km²) has been claimed!`,
      });
    } catch (error) {
      console.error("Error minting NFT:", error);
    }
  };

  const calculatePolygonArea = (coords: Array<{ lat: number; lng: number }>) => {
    if (coords.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i].lat * coords[j].lng;
      area -= coords[j].lat * coords[i].lng;
    }
    return Math.abs(area / 2) * 12365; // Approximate km² conversion
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold text-gradient">Track Run</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <GoogleMap 
          tracking={isRunning && !isPaused}
          path={coordinates}
          onLocationUpdate={(location) => {
            if (isRunning && !isPaused) {
              const newCoord = { lat: location.lat, lng: location.lng };
              setCoordinates((prev) => [...prev, newCoord]);
              const newDistance = calculateDistance([...coordinates, newCoord]);
              setDistance(newDistance);
            }
          }}
        />
        
        {/* Floating Stats */}
        {isRunning && (
          <div className="absolute top-4 left-4 right-4 space-y-2">
            <Card className="p-4 bg-card/90 backdrop-blur-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-accent">{distance.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">km</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">{formatTime(duration)}</div>
                  <div className="text-xs text-muted-foreground">time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">{Math.floor(calories)}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-card/90 backdrop-blur-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">XP Earning</span>
                </div>
                <span className="text-accent font-bold">+{Math.floor(distance * 10)} XP</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="border-t border-border/50 bg-card/95 backdrop-blur-lg p-6">
        <div className="container mx-auto space-y-4">
          {!isRunning ? (
            <Button 
              variant="hero" 
              size="xl" 
              className="w-full"
              onClick={handleStart}
            >
              <Play className="w-6 h-6" />
              Start Run
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={isPaused ? "accent" : "warning"}
                size="lg"
                onClick={handlePause}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button 
                variant="destructive"
                size="lg"
                onClick={handleStop}
              >
                <Square className="w-5 h-5" />
                Stop Run
              </Button>
            </div>
          )}

            <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Activity, label: "Distance", value: `${distance.toFixed(2)} km` },
              { icon: Timer, label: "Pace", value: duration > 0 ? `${(duration / 60 / (distance || 1)).toFixed(1)} min/km` : "0 min/km" },
              { icon: Zap, label: "XP", value: `+${Math.floor(distance * 10)}` },
            ].map((stat) => (
              <Card key={stat.label} className="p-3 bg-background/50 text-center">
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="font-bold text-sm">{stat.value}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Run;
