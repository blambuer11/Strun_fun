import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Share2, Camera, Image as ImageIcon, MapPin, Loader2 } from "lucide-react";
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

export const TaskProofDialog = ({ open, onOpenChange, taskId, userTaskId, taskLocation, onProofSubmitted }: TaskProofDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{lat: number; lon: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get GPS location on open
  useState(() => {
    if (open && !gpsLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setGpsError(null);
        },
        (error) => {
          console.error("GPS error:", error);
          setGpsError("GPS konumu alınamadı");
        }
      );
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Error",
        description: "Only image and video files are allowed",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!user) throw new Error("User not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('task-proofs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('task-proofs')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleSubmitProof = async (shareToCommunity: boolean = false) => {
    if (!user || !content.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen açıklama ekleyin",
        variant: "destructive",
      });
      return;
    }

    if (!gpsLocation) {
      toast({
        title: "Hata",
        description: "GPS konumu alınamadı. Lütfen konum izni verin.",
        variant: "destructive",
      });
      return;
    }

    // Verify GPS location if task location is provided
    if (taskLocation) {
      const distance = calculateDistance(
        gpsLocation.lat,
        gpsLocation.lon,
        taskLocation.lat,
        taskLocation.lon
      );
      const maxDistance = taskLocation.radius_m || 100;

      if (distance > maxDistance) {
        toast({
          title: "Konum Hatası",
          description: `Görev lokasyonuna çok uzaksınız (${Math.round(distance)}m uzakta). Görev alanı içinde olmalısınız (${maxDistance}m yarıçap).`,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      let mediaUrl = null;

      // Upload file if selected
      if (mediaFile) {
        setUploadingFile(true);
        mediaUrl = await uploadFile(mediaFile);
      }

      const { error } = await supabase
        .from("task_proofs")
        .insert({
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
        await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            content: content.trim(),
            image_url: mediaUrl,
          });
      }

      toast({
        title: "Başarılı!",
        description: shareToCommunity 
          ? "Kanıt gönderildi ve toplulukta paylaşıldı" 
          : "Kanıt başarıyla gönderildi",
      });

      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setGpsLocation(null);
      onProofSubmitted();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting proof:", error);
      toast({
        title: "Hata",
        description: error.message || "Kanıt gönderilemedi",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploadingFile(false);
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
        title: "Paylaşım açılıyor",
        description: `${platform} ile paylaşmak için açılıyor`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Görev Kanıtı Gönder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* GPS Status */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`w-4 h-4 ${gpsLocation ? 'text-success' : 'text-warning'}`} />
              {gpsLocation ? (
                <span className="text-success">GPS konumu alındı ✓</span>
              ) : gpsError ? (
                <span className="text-destructive">{gpsError}</span>
              ) : (
                <span className="text-muted-foreground">GPS konumu alınıyor...</span>
              )}
            </div>
          </Card>

          <div>
            <Label htmlFor="content">Açıklama *</Label>
            <Textarea
              id="content"
              placeholder="Görevi nasıl tamamladığınızı açıklayın..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Fotoğraf veya Video</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {mediaPreview ? (
              <div className="mt-2 relative">
                {mediaFile?.type.startsWith('video/') ? (
                  <video src={mediaPreview} controls className="w-full rounded-lg" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full rounded-lg" />
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Kaldır
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Dosya Seç
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handleSubmitProof(false)}
              disabled={submitting || !content.trim() || !gpsLocation || uploadingFile}
              className="w-full"
            >
              {uploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Yükleniyor...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Kanıt Gönder
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSubmitProof(true)}
              disabled={submitting || !content.trim() || !gpsLocation || uploadingFile}
              variant="secondary"
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Gönder ve Topluluğa Paylaş
            </Button>
          </div>

          <Card className="p-4 bg-muted/50">
            <p className="text-sm font-medium mb-3">Sosyal Medyada Paylaş</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("tiktok")}
                disabled={!content.trim()}
              >
                TikTok
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("twitter")}
                disabled={!content.trim()}
              >
                X (Twitter)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("instagram")}
                disabled={!content.trim()}
              >
                Instagram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare("telegram")}
                disabled={!content.trim()}
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
