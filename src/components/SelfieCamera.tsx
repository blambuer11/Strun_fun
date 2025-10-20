import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, CheckCircle, RotateCcw, Upload, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SelfieCameraProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  userTaskId: string;
  nonce: string;
  onSuccess?: () => void;
}

const SelfieCamera = ({ open, onClose, taskId, userTaskId, nonce, onSuccess }: SelfieCameraProps) => {
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
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
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera",
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

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Draw nonce overlay with Strun styling
    const overlayHeight = 80;
    const overlayY = canvas.height - overlayHeight - 20;
    
    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(20, overlayY, canvas.width - 40, overlayHeight);
    
    // Border
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, overlayY, canvas.width - 40, overlayHeight);
    
    // Nonce text
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FFB020';
    ctx.textAlign = 'center';
    ctx.fillText(nonce, canvas.width / 2, overlayY + 50);

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const submitSelfie = async () => {
    if (!capturedImage || !user) return;

    setUploading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Convert base64 to blob
      const blob = await (await fetch(capturedImage)).blob();

      const { data, error } = await supabase.functions.invoke('selfie-submit', {
        body: {
          taskId,
          userTaskId,
          image: blob,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          nonce,
        },
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Selfie Submitted! 📸",
        description: "Waiting for other participants to form a group",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting selfie:', error);
      toast({
        title: "Submit Failed",
        description: error.message || "Failed to submit selfie",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
            Take Selfie
          </DialogTitle>
          <DialogDescription>
            Take a selfie with the nonce code visible in the frame
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="p-8 bg-secondary/10 text-center border-secondary/30 animate-scale-in">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-secondary/20 rounded-full animate-pulse-ring" />
              <CheckCircle className="w-20 h-20 text-secondary relative z-10" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">Submitted!</h3>
            <p className="text-muted-foreground mb-2">
              Your selfie has been submitted successfully
            </p>
            <div className="glass rounded-lg p-3 border border-secondary/30 mb-6">
              <p className="text-sm text-muted-foreground">
                ⏳ Waiting for group formation...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be notified when the group is complete
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
            <div className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden border-2 border-secondary/30">
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
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Nonce Overlay (Live Preview) */}
                  {streaming && (
                    <div className="absolute bottom-6 left-4 right-4 animate-pulse-glow">
                      <div className="glass rounded-lg p-4 border-2 border-accent">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-accent" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Include this code
                          </p>
                        </div>
                        <p className="text-accent font-mono font-bold text-center text-2xl">
                          {nonce}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Camera Guide */}
                  {streaming && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-48 h-48 border-2 border-dashed border-secondary/50 rounded-full" />
                      <p className="text-center mt-2 text-xs text-muted-foreground glass px-3 py-1 rounded-full">
                        Center your face
                      </p>
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
                    onClick={submitSelfie}
                    className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Selfie
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
                💡 Tip: Make sure your face and the nonce code are clearly visible
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SelfieCamera;
