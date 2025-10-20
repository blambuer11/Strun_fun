import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, CheckCircle } from "lucide-react";
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

    // Draw nonce overlay
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 70, canvas.width - 20, 60);
    ctx.fillStyle = '#10b981';
    ctx.fillText(nonce, 20, canvas.height - 20);

    setCapturedImage(canvas.toDataURL('image/jpeg'));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Take Selfie
          </DialogTitle>
          <DialogDescription>
            Take a selfie with the nonce code visible
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="p-8 bg-accent/10 text-center">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Submitted!</h3>
            <p className="text-muted-foreground mb-4">
              Your selfie has been submitted. Waiting for group formation.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {streaming && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 p-3 rounded">
                      <p className="text-accent font-mono font-bold text-center text-2xl">
                        {nonce}
                      </p>
                      <p className="text-white text-xs text-center mt-1">
                        Include this code in your selfie
                      </p>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="space-y-2">
              {capturedImage ? (
                <>
                  <Button
                    onClick={submitSelfie}
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Submit Selfie"}
                  </Button>
                  <Button
                    onClick={retake}
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                  >
                    Retake
                  </Button>
                </>
              ) : (
                <Button
                  onClick={capturePhoto}
                  className="w-full"
                  disabled={!streaming}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SelfieCamera;
