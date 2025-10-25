import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Lock, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  level_required: number;
  earned: boolean;
}

export const RewardsSection = ({ userLevel }: { userLevel: number }) => {
  const { user } = useAuth();

  // Query all badges
  const { data: allBadges } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("level_required", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query user's earned badges
  const { data: earnedBadges } = useQuery({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data?.map(b => b.badge_id) || [];
    },
    enabled: !!user?.id,
  });

  // Combine badges with earned status
  const badges: Badge[] = (allBadges || []).map(badge => ({
    ...badge,
    earned: earnedBadges?.includes(badge.id) || false,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="w-6 h-6 text-accent" />
        Badge Collection
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {badges.map((badge) => {
          const isLocked = userLevel < badge.level_required;
          const isEarned = badge.earned;

          return (
            <Card
              key={badge.id}
              className={`
                p-4 text-center transition-all duration-300 
                ${isLocked ? "opacity-50 bg-card/50" : ""}
                ${isEarned ? "bg-accent/10 border-accent/50" : ""}
              `}
            >
              <div className="relative">
                <div className={`
                  inline-flex p-3 rounded-full mb-2 text-4xl
                  ${isLocked ? "grayscale opacity-50" : ""}
                `}>
                  {isLocked ? (
                    <Lock className="w-12 h-12 text-muted-foreground" />
                  ) : (
                    <span>{badge.icon}</span>
                  )}
                </div>
                
                {isLocked && (
                  <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                    Lv {badge.level_required}
                  </div>
                )}
                
                {isEarned && (
                  <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">
                    ✓
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  {badge.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
                
                {isEarned && (
                  <p className="text-xs text-accent font-bold mt-2">Earned!</p>
                )}
                
                {isLocked && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Unlock at Level {badge.level_required}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      <p className="text-sm text-muted-foreground text-center mt-4">
        Complete activities to earn badges and show off your achievements!
      </p>
    </div>
  );
};
