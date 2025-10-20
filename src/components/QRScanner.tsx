import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, X, CheckCircle } from "lucide-react";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the QR code at the partner location to claim your reward
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Card className="p-8 bg-accent/10 text-center">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Success!</h3>
            <p className="text-muted-foreground mb-4">
              You earned {earnedXP} XP
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleManualInput}
                variant="outline"
                className="w-full"
                disabled={claiming}
              >
                Enter Code Manually
              </Button>
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

export default QRScanner;
