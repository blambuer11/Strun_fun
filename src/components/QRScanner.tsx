import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, X, CheckCircle, Scan, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (xp: number) => void;
}

const QRScanner = ({ open, onClose, onSuccess }: QRScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setSuccess(false);
      setQrData("");
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
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
    setScanning(false);
  };

  const handleClaimTask = async () => {
    if (!qrData || !user) return;

    setClaiming(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { data, error } = await supabase.functions.invoke('qr-claim', {
        body: {
          qrSecret: qrData,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        },
      });

      if (error) throw error;

      setEarnedXP(data.xpAwarded);
      setSuccess(true);
      stopCamera();
      
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${data.xpAwarded} XP!`,
      });

      onSuccess?.(data.xpAwarded);
    } catch (error: any) {
      console.error('Error claiming task:', error);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim task",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleManualInput = () => {
    const input = prompt("Enter QR code:");
    if (input) {
      setQrData(input);
      handleClaimTask();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <QrCode className="w-5 h-5 text-primary" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the QR code at the partner location to claim your reward
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="p-8 bg-accent/10 text-center border-accent/30 animate-scale-in">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse-ring" />
              <CheckCircle className="w-20 h-20 text-accent relative z-10" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">Success!</h3>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 mb-4">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-2xl font-bold text-xp">+{earnedXP}</span>
              <span className="text-sm text-muted-foreground">XP</span>
            </div>
            <p className="text-muted-foreground mb-6">
              XP has been added to your account
            </p>
            <Button 
              onClick={onClose} 
              className="w-full bg-primary hover:bg-primary/90"
            >
              Awesome!
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Camera View */}
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden border-2 border-primary/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Scanning Overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Scanning Frame */}
                    <div className="w-48 h-48 border-4 border-primary rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent" />
                      
                      {/* Scanning Line */}
                      <div className="absolute inset-x-0 h-1 bg-accent/50 animate-bounce-slow" />
                    </div>
                    
                    {/* Instruction */}
                    <p className="text-center mt-4 text-sm font-medium glass px-4 py-2 rounded-full border border-primary/30">
                      <Scan className="w-4 h-4 inline mr-1" />
                      Align QR code in frame
                    </p>
                  </div>
                </div>
              )}
              
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <QrCode className="w-16 h-16 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleManualInput}
                variant="outline"
                className="w-full h-12 border-primary/30 hover:bg-primary/10 hover:border-primary"
                disabled={claiming}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Enter Code Manually
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full h-12"
              >
                Cancel
              </Button>
            </div>

            {/* Help Text */}
            <div className="glass rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                💡 Tip: Make sure you're within range of the partner location
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
