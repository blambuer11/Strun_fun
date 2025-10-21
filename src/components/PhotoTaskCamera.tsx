import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, CheckCircle, RotateCcw, Upload, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PhotoTaskCameraProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  userTaskId: string;
  taskTitle: string;
  taskDescription: string;
  onSuccess?: () => void;
}

const PhotoTaskCamera = ({ 
  open, 
  onClose, 
  taskId, 
  userTaskId, 
  taskTitle, 
  taskDescription,
  onSuccess 
}: PhotoTaskCameraProps) => {
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setSuccess(false);
      setVerificationResult(null);
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
        
        toast({
          title: "Camera Ready",
          description: "Take a photo of the requested subject",
        });
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      
      let errorMessage = "Could not access camera";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on this device";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const submitPhoto = async () => {
    if (!capturedImage || !user) return;

    setUploading(true);
    setVerifying(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { data, error } = await supabase.functions.invoke('verify-photo-task', {
        body: {
          taskId,
          userTaskId,
          imageBase64: capturedImage,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        },
      });

      if (error) throw error;

      setVerificationResult(data);

      if (data.verified) {
        setSuccess(true);
        toast({
          title: "Photo Verified! ✓",
          description: `You earned ${data.xp_earned} XP`,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Verification Failed",
          description: data.reason || "Photo doesn't match task requirements",
          variant: "destructive",
        });
        setCapturedImage(null);
        startCamera();
      }
    } catch (error: any) {
      console.error('Error submitting photo:', error);
      toast({
        title: "Submit Failed",
        description: error.message || "Failed to submit photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setVerifying(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-secondary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="w-5 h-5 text-secondary" />
            {taskTitle}
          </DialogTitle>
          <DialogDescription>
            {taskDescription}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="p-8 bg-secondary/10 text-center border-secondary/30 animate-scale-in">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-secondary/20 rounded-full animate-pulse-ring" />
              <CheckCircle className="w-20 h-20 text-secondary relative z-10" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">Verified!</h3>
            <p className="text-muted-foreground mb-2">
              {verificationResult?.reason || "Your photo has been verified successfully"}
            </p>
            <div className="glass rounded-lg p-3 border border-secondary/30 mb-6">
              <p className="text-sm font-bold text-accent">
                +{verificationResult?.xp_earned || 0} XP Earned
              </p>
            </div>
            <Button 
              onClick={onClose} 
              className="w-full bg-secondary hover:bg-secondary/90"
            >
              Got it!
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Camera/Preview */}
            <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden border-2 border-secondary/30">
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Task Hint Overlay */}
                  {streaming && (
                    <div className="absolute top-4 left-4 right-4 animate-pulse-glow">
                      <div className="glass rounded-lg p-3 border-2 border-accent">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-accent" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Task Objective
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {taskDescription}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {capturedImage ? (
                <>
                  <Button
                    onClick={submitPhoto}
                    className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    disabled={uploading}
                  >
                    {uploading ? (
                      verifying ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          AI Verifying...
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Uploading...
                        </>
                      )
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Photo
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={retake}
                    variant="outline"
                    className="w-full h-12 border-secondary/30 hover:bg-secondary/10"
                    disabled={uploading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                </>
              ) : (
                <Button
                  onClick={capturePhoto}
                  className="w-full h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground relative overflow-hidden group"
                  disabled={!streaming}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-secondary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Camera className="w-5 h-5 mr-2 relative z-10" />
                  <span className="relative z-10">Capture Photo</span>
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full h-12"
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>

            {/* Help Text */}
            <div className="glass rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                💡 Tip: Make sure the photo clearly shows what's requested. AI will verify your submission.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhotoTaskCamera;
