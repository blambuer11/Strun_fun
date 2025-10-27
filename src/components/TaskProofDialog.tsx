import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Share2, MapPin, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  userTaskId: string;
  taskLocation?: { lat: number; lon: number; radius_m?: number };
  onProofSubmitted: () => void;
}

export const TaskProofDialog = ({ 
  open, 
  onOpenChange, 
  taskId, 
  userTaskId, 
  taskLocation,
  onProofSubmitted 
}: TaskProofDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "verified" | "failed" | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get GPS location when dialog opens
  useEffect(() => {
    if (open && taskLocation) {
      setGpsStatus("checking");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          setUserLocation({ lat: userLat, lon: userLon });

          // Calculate distance
          const distance = calculateDistance(
            userLat,
            userLon,
            taskLocation.lat,
            taskLocation.lon
          );

          const radiusM = taskLocation.radius_m || 50;
          if (distance <= radiusM) {
            setGpsStatus("verified");
          } else {
            setGpsStatus("failed");
            toast({
              title: "GPS Verification Failed",
              description: `You're ${Math.round(distance)}m away. You need to be within ${radiusM}m.`,
              variant: "destructive",
            });
          }
        },
        (error) => {
          console.error("GPS error:", error);
          setGpsStatus("failed");
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable GPS.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [open, taskLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image or video file",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmitProof = async (shareToCommunity: boolean = false) => {
    if (!user || !content.trim()) {
      toast({
        title: "Error",
        description: "Please add content to your proof",
        variant: "destructive",
      });
      return;
    }

    if (taskLocation && gpsStatus !== "verified") {
      toast({
        title: "GPS Verification Required",
        description: "You must be at the task location to submit proof",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    let mediaUrl: string | null = null;

    try {
      // Upload media if provided
      if (mediaFile) {
        setUploading(true);
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("task-proofs")
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("task-proofs")
          .getPublicUrl(fileName);

        mediaUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { error } = await supabase.from("task_proofs").insert({
        task_id: taskId,
        user_id: user.id,
        user_task_id: userTaskId,
        content: content.trim(),
        media_url: mediaUrl,
        is_shared_to_community: shareToCommunity,
      });

      if (error) throw error;

      // If sharing to community, also create a post
      if (shareToCommunity) {
        await supabase.from("posts").insert({
          user_id: user.id,
          content: content.trim(),
          image_url: mediaUrl,
        });
      }

      toast({
        title: "Proof Submitted!",
        description: shareToCommunity
          ? "Proof submitted and shared with community"
          : "Proof submitted successfully",
      });

      setContent("");
      setMediaFile(null);
      setMediaPreview("");
      onProofSubmitted();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting proof:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit proof",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(content);
    const url = encodeURIComponent(window.location.href);

    const shareUrls: Record<string, string> = {
      tiktok: `https://www.tiktok.com/upload?caption=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      instagram: `https://www.instagram.com/create/story`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank");

      toast({
        title: "Opening share",
        description: `Opening to share on ${platform}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Submit Task Proof</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* GPS Status */}
          {taskLocation && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">GPS Location:</span>
                {gpsStatus === "checking" && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Checking...
                  </Badge>
                )}
                {gpsStatus === "verified" && (
                  <Badge className="bg-green-500 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {gpsStatus === "failed" && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <div>
            <Label htmlFor="content" className="text-sm">Proof Description</Label>
            <Textarea
              id="content"
              placeholder="Describe how you completed the task..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="media" className="text-sm">Photo/Video</Label>
            <Input
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="mt-1 text-sm"
            />
            {mediaPreview && (
              <div className="mt-2 relative">
                {mediaFile?.type.startsWith("image/") ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                    controls
                  />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview("");
                  }}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handleSubmitProof(false)}
              disabled={
                submitting ||
                uploading ||
                !content.trim() ||
                (taskLocation && gpsStatus !== "verified")
              }
              className="w-full h-10 sm:h-11 text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  <span className="truncate">Uploading...</span>
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  <span className="truncate">Submitting...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="truncate">Submit Proof</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSubmitProof(true)}
              disabled={
                submitting ||
                uploading ||
                !content.trim() ||
                (taskLocation && gpsStatus !== "verified")
              }
              variant="secondary"
              className="w-full h-10 sm:h-11 text-sm"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              <span className="truncate">Submit & Share with Community</span>
            </Button>
          </div>

          <Card className="p-3 sm:p-4 bg-muted/50">
            <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Share on Social Media</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("tiktok")}
                disabled={!content.trim()}
                className="h-9 text-xs"
              >
                TikTok
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("twitter")}
                disabled={!content.trim()}
                className="h-9 text-xs"
              >
                X (Twitter)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("instagram")}
                disabled={!content.trim()}
                className="h-9 text-xs"
              >
                Instagram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("telegram")}
                disabled={!content.trim()}
                className="h-9 text-xs"
              >
                Telegram
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
