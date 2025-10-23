import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2, CheckCircle2 } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image or video",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!imagePreview) {
      toast({
        title: "No Image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );

      // Call verification function
      const { data, error } = await supabase.functions.invoke("verify-photo-task", {
        body: {
          taskId: task.id,
          userTaskId: userTaskId,
          imageBase64: imagePreview.split(",")[1],
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        },
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: "Task Verified! 🎉",
          description: `You earned ${data.xp_earned} XP! ${data.reason}`,
        });
        onVerified();
        onOpenChange(false);
      } else {
        toast({
          title: "Verification Failed",
          description: data.reason || "Task could not be verified",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify task",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Task Completion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">{task.name}</h4>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-accent font-bold">+{task.xp_reward} XP</span>
              {task.challenge_type && (
                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                  {task.challenge_type}
                </span>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-32"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8" />
                  <span>Take Photo or Upload</span>
                </div>
              </Button>
            </div>
          )}

          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              📸 <strong>AI Verification:</strong> Our AI will analyze your photo to verify you
              completed the task correctly. Make sure your photo clearly shows the required
              activity!
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={!imagePreview || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying with AI...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify & Complete Task
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
