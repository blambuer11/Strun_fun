import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RewardBox {
  level: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  xpAmount?: number;
}

const REWARD_LEVELS = [1, 2, 5, 10, 15, 20, 25, 30];

export const RewardsSection = ({ userLevel, userId }: { userLevel: number; userId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  // Fetch claimed rewards
  const { data: claimedRewards } = useQuery({
    queryKey: ["user-rewards", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_rewards")
        .select("*")
        .eq("user_id", userId)
        .eq("is_claimed", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const claimReward = useMutation({
    mutationFn: async (level: number) => {
      // Generate random XP between 50-500
      const randomXP = Math.floor(Math.random() * 451) + 50;

      // Insert reward claim
      const { error: rewardError } = await supabase
        .from("user_rewards")
        .insert({
          user_id: userId,
          reward_level: level,
          is_claimed: true,
          xp_amount: randomXP,
          claimed_at: new Date().toISOString(),
        });

      if (rewardError) throw rewardError;

      // Update user XP
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ xp: (profile?.xp || 0) + randomXP })
        .eq("id", userId);

      if (updateError) throw updateError;

      return randomXP;
    },
    onSuccess: (xpAmount) => {
      queryClient.invalidateQueries({ queryKey: ["user-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      toast({
        title: "🎉 Ödül Kazandın!",
        description: `Kutundan +${xpAmount} XP çıktı!`,
      });
      
      setClaimingLevel(null);
    },
    onError: (error) => {
      console.error("Error claiming reward:", error);
      toast({
        title: "Hata",
        description: "Ödül alınırken bir hata oluştu",
        variant: "destructive",
      });
      setClaimingLevel(null);
    },
  });

  const handleClaimReward = async (level: number) => {
    setClaimingLevel(level);
    // Add delay for animation effect
    setTimeout(() => {
      claimReward.mutate(level);
    }, 500);
  };

  const rewardBoxes: RewardBox[] = REWARD_LEVELS.map(level => {
    const isClaimed = claimedRewards?.some(r => r.reward_level === level);
    return {
      level,
      isUnlocked: userLevel >= level,
      isClaimed: !!isClaimed,
      xpAmount: claimedRewards?.find(r => r.reward_level === level)?.xp_amount,
    };
  });

  const getBoxEmoji = (level: number) => {
    const emojis = ["🎁", "🏆", "💎", "👟", "🔥", "⚡", "🌟", "👑"];
    const index = REWARD_LEVELS.indexOf(level);
    return emojis[index] || "🎁";
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">🎁 Ödül Kutuları</h2>
        <p className="text-sm text-muted-foreground">
          Seviye atlayarak kutuları aç ve rastgele XP kazan!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rewardBoxes.map((box) => (
          <Card
            key={box.level}
            className={`p-6 relative overflow-hidden transition-all ${
              box.isClaimed
                ? "bg-card/50 opacity-60"
                : box.isUnlocked
                ? "bg-gradient-to-br from-accent/20 via-card to-primary/10 border-accent/30 hover:scale-105"
                : "bg-card/80 opacity-80"
            }`}
          >
            {/* Claiming animation */}
            {claimingLevel === box.level && (
              <div className="absolute inset-0 bg-accent/20 animate-pulse z-10 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-accent animate-spin" />
              </div>
            )}

            <div className="text-center space-y-3">
              {/* Box icon/emoji */}
              <div
                className={`text-6xl mx-auto ${
                  box.isClaimed ? "grayscale" : "animate-bounce-slow"
                }`}
              >
                {box.isUnlocked && !box.isClaimed ? getBoxEmoji(box.level) : "📦"}
              </div>

              {/* Lock icon for locked boxes */}
              {!box.isUnlocked && (
                <div className="absolute top-4 right-4">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {/* Level badge */}
              <div className="text-sm font-bold">
                Level {box.level}
              </div>

              {/* Status/Action */}
              {box.isClaimed ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Açıldı ✓</div>
                  {box.xpAmount && (
                    <div className="text-accent font-bold text-sm">
                      +{box.xpAmount} XP
                    </div>
                  )}
                </div>
              ) : box.isUnlocked ? (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => handleClaimReward(box.level)}
                  disabled={claimingLevel !== null}
                  className="w-full"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Aç
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Level {box.level}'e ulaş
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};