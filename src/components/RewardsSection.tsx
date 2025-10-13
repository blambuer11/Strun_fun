import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Lock, Sparkles, Trophy, Zap, Crown, Star } from "lucide-react";
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
        title: "🎉 Reward Unlocked!",
        description: `You earned +${xpAmount} XP from the box!`,
      });
      
      setClaimingLevel(null);
    },
    onError: (error) => {
      console.error("Error claiming reward:", error);
      toast({
        title: "Error",
        description: "Failed to claim reward",
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

  const getBoxIcon = (level: number) => {
    const icons = [
      { icon: Gift, color: "text-blue-500" },
      { icon: Trophy, color: "text-yellow-500" },
      { icon: Zap, color: "text-orange-500" },
      { icon: Star, color: "text-purple-500" },
      { icon: Crown, color: "text-amber-500" },
      { icon: Sparkles, color: "text-pink-500" },
      { icon: Trophy, color: "text-emerald-500" },
      { icon: Crown, color: "text-red-500" },
    ];
    const index = REWARD_LEVELS.indexOf(level);
    return icons[index] || icons[0];
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 pb-24">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8" />
          Reward Boxes
        </h2>
        <p className="text-sm text-muted-foreground">
          Level up to unlock boxes and earn random XP rewards!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rewardBoxes.map((box) => {
          const BoxIcon = getBoxIcon(box.level);
          return (
            <Card
              key={box.level}
              className={`p-6 relative overflow-hidden transition-all duration-300 ${
                box.isClaimed
                  ? "bg-card/50 opacity-70"
                  : box.isUnlocked
                  ? "bg-gradient-to-br from-primary/10 via-card to-accent/20 border-2 border-primary/30 hover:scale-105 hover:border-primary/50 shadow-lg hover:shadow-primary/20"
                  : "bg-card/80 opacity-80 border border-border"
              }`}
            >
              {/* Claiming animation */}
              {claimingLevel === box.level && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse z-10 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-16 h-16 text-primary animate-spin" />
                </div>
              )}

              {/* Background decoration */}
              {box.isUnlocked && !box.isClaimed && (
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-2 right-2">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Star className="w-6 h-6 text-accent" />
                  </div>
                </div>
              )}

              <div className="text-center space-y-3 relative z-10">
                {/* Box icon */}
                <div className="mx-auto w-20 h-20 flex items-center justify-center">
                  {box.isUnlocked && !box.isClaimed ? (
                    <BoxIcon.icon 
                      className={`w-16 h-16 ${BoxIcon.color} animate-bounce-slow drop-shadow-lg`}
                    />
                  ) : (
                    <Gift className={`w-16 h-16 ${box.isClaimed ? "text-muted-foreground" : "text-muted"}`} />
                  )}
                </div>

                {/* Lock icon for locked boxes */}
                {!box.isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                {/* Level badge */}
                <div className={`text-sm font-bold ${box.isUnlocked && !box.isClaimed ? 'text-primary' : ''}`}>
                  Level {box.level}
                </div>

                {/* Status/Action */}
                {box.isClaimed ? (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Claimed ✓</div>
                    {box.xpAmount && (
                      <div className="text-primary font-bold text-sm">
                        +{box.xpAmount} XP
                      </div>
                    )}
                  </div>
                ) : box.isUnlocked ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleClaimReward(box.level)}
                    disabled={claimingLevel !== null}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Reach Level {box.level}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};