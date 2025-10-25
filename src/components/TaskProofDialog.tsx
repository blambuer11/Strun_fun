import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TaskProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  userTaskId: string;
  onProofSubmitted: () => void;
}

export const TaskProofDialog = ({ open, onOpenChange, taskId, userTaskId, onProofSubmitted }: TaskProofDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareToSocial, setShareToSocial] = useState<string | null>(null);

  const handleSubmitProof = async (shareToCommunity: boolean = false) => {
    if (!user || !content.trim()) {
      toast({
        title: "Error",
        description: "Please add content to your proof",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("task_proofs")
        .insert({
          task_id: taskId,
          user_id: user.id,
          user_task_id: userTaskId,
          content: content.trim(),
          media_url: mediaUrl || null,
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
            image_url: mediaUrl || null,
          });
      }

      toast({
        title: "Success!",
        description: shareToCommunity 
          ? "Proof submitted and shared to community" 
          : "Proof submitted successfully",
      });

      setContent("");
      setMediaUrl("");
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
    }
  };

  const handleSocialShare = (platform: string) => {
    setShareToSocial(platform);
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
        title: "Opening share dialog",
        description: `Opening ${platform} to share your proof`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Task Proof</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="content">Proof Content</Label>
            <Textarea
              id="content"
              placeholder="Describe your completion or share your experience..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="media">Media URL (optional)</Label>
            <Input
              id="media"
              type="url"
              placeholder="https://..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handleSubmitProof(false)}
              disabled={submitting || !content.trim()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Proof"}
            </Button>

            <Button
              onClick={() => handleSubmitProof(true)}
              disabled={submitting || !content.trim()}
              variant="secondary"
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Submit & Share to Community
            </Button>
          </div>

          <Card className="p-4 bg-muted/50">
            <p className="text-sm font-medium mb-3">Share to Social Media</p>
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
