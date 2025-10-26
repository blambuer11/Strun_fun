import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, MapPin, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TaskVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  userTaskId: string;
  onVerified: () => void;
}

export function TaskVerificationDialog({
  open,
  onOpenChange,
  task,
  userTaskId,
  onVerified,
}: TaskVerificationDialogProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      requestNonce();
      getCurrentLocation();
    }
  }, [open]);

  const requestNonce = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase.functions.invoke("request-nonce", {
        body: { userId: userData.user.id, taskId: task.id },
      });

      if (error) throw error;
      setNonce(data.nonce);
    } catch (error: any) {
      console.error("Error requesting nonce:", error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Required",
            description: "Please enable location access to verify task",
            variant: "destructive",
          });
        }
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setPhoto(imageData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleVerify = async () => {
    if (!photo || !location || !nonce) {
      toast({
        title: "Missing Information",
        description: "Photo, location, and security token required",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
      };

      const { data, error } = await supabase.functions.invoke("verify-photo-task", {
        body: {
          taskId: task.id,
          userTaskId,
          imageBase64: photo,
          lat: location.lat,
          lon: location.lon,
          nonce,
          clientTimestamp: new Date().toISOString(),
          deviceInfo,
        },
      });

      if (error) throw error;

      setResult(data);

      if (data.verified) {
        toast({
          title: "✅ Task Verified!",
          description: `You earned ${data.xp_earned} XP${data.sol_earned > 0 ? ` and ${data.sol_earned} SOL` : ''}!`,
        });
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
        }, 2000);
      } else {
        toast({
          title: data.suspicious ? "⚠️ Verification Review" : "❌ Verification Failed",
          description: data.reason || "Task verification failed",
          variant: data.suspicious ? "default" : "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Verification failed",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="line-clamp-2">Verify Task: {task.title || task.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Task Info */}
          <div className="p-2 sm:p-3 bg-muted rounded-lg">
            <p className="text-xs sm:text-sm font-medium mb-2">{task.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>Must be within {task.radius_m || 30}m of location</span>
            </div>
          </div>

          {/* Security Status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={nonce ? "default" : "secondary"} className="text-xs">
              {nonce ? "🔐 Secured" : "⏳ Loading..."}
            </Badge>
            <Badge variant={location ? "default" : "secondary"} className="text-xs">
              {location ? "📍 Located" : "⏳ Finding..."}
            </Badge>
          </div>

          {/* Camera/Photo */}
          {!photo ? (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 flex justify-center">
                <Button
                  size="sm"
                  className="rounded-full h-10 sm:h-11 text-xs sm:text-sm"
                  onClick={photo ? () => setPhoto(null) : capturePhoto}
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Capture Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={photo}
                alt="Captured"
                className="w-full rounded-lg"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 text-xs h-8"
                onClick={() => {
                  setPhoto(null);
                  startCamera();
                }}
              >
                Retake
              </Button>
            </div>
          )}

          {/* Verification Result */}
          {result && (
            <div className={`p-3 sm:p-4 rounded-lg border-2 ${
              result.verified 
                ? 'bg-success/10 border-success' 
                : result.suspicious
                ? 'bg-warning/10 border-warning'
                : 'bg-destructive/10 border-destructive'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {result.verified ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                ) : result.suspicious ? (
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                ) : (
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                )}
                <span className="font-bold text-sm sm:text-base">
                  {result.verified ? 'Verified!' : result.suspicious ? 'Under Review' : 'Not Verified'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Verification Score:</span>
                  <span className="font-mono">{(result.verification_score * 100).toFixed(0)}%</span>
                </div>
                <Progress value={result.verification_score * 100} className="h-2" />

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <Badge variant={result.gps_verified ? "default" : "destructive"}>
                    📍 GPS: {result.gps_verified ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.ai_verified ? "default" : "destructive"}>
                    🤖 AI: {result.ai_verified ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.nonce_verified ? "default" : "destructive"}>
                    🔐 Auth: {result.nonce_verified ? '✓' : '✗'}
                  </Badge>
                </div>

                {result.distance_meters !== undefined && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Distance: {result.distance_meters}m from target
                  </p>
                )}

                <p className="text-xs sm:text-sm mt-2">{result.reason}</p>

                {result.verified && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-accent text-accent-foreground text-xs">
                      +{result.xp_earned} XP
                    </Badge>
                    {result.sol_earned > 0 && (
                      <Badge className="bg-success text-success-foreground text-xs">
                        💎 +{result.sol_earned} SOL
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {!result && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full sm:flex-1 h-10 text-sm"
                onClick={() => onOpenChange(false)}
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:flex-1 h-10 text-sm"
                onClick={!photo ? startCamera : handleVerify}
                disabled={verifying || !nonce || !location}
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                    <span className="truncate">Verifying...</span>
                  </>
                ) : !photo ? (
                  <>
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="truncate">Start Camera</span>
                  </>
                ) : (
                  <span className="truncate">Submit for Verification</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
