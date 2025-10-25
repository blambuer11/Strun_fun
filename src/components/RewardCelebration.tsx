import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RewardCelebrationProps {
  show: boolean;
  onClose: () => void;
  reward: {
    type: "xp" | "sol" | "badge" | "level";
    amount?: number;
    title?: string;
    description?: string;
  };
}

export const RewardCelebration = ({ show, onClose, reward }: RewardCelebrationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    }
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!show && !visible) return null;

  const getIcon = () => {
    switch (reward.type) {
      case "badge":
        return <Award className="w-16 h-16 text-warning animate-bounce" />;
      case "level":
        return <Trophy className="w-16 h-16 text-accent animate-bounce" />;
      case "xp":
        return <Sparkles className="w-16 h-16 text-primary animate-bounce" />;
      case "sol":
        return <Award className="w-16 h-16 text-success animate-bounce" />;
    }
  };

  const getMessage = () => {
    switch (reward.type) {
      case "badge":
        return "New Badge Unlocked!";
      case "level":
        return "Level Up! Congratulations!";
      case "xp":
        return `+${reward.amount} XP Earned!`;
      case "sol":
        return `+${reward.amount} SOL Earned!`;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <Card
        className={`relative max-w-md w-full mx-4 p-8 bg-gradient-to-br from-primary/20 via-card to-accent/20 border-2 border-accent/50 shadow-2xl transition-all duration-300 ${
          visible ? "animate-scale-in" : "animate-scale-out"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent rounded-full animate-fade-in"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center space-y-4 relative z-10">
          <div className="flex justify-center mb-4">{getIcon()}</div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Congratulations!
          </h2>

          <p className="text-xl font-semibold">{getMessage()}</p>

          {reward.title && (
            <div className="space-y-2">
              <Badge variant="default" className="text-lg px-4 py-2">
                {reward.title}
              </Badge>
              {reward.description && (
                <p className="text-sm text-muted-foreground">{reward.description}</p>
              )}
            </div>
          )}

          <Button
            onClick={handleClose}
            className="mt-6 w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
          >
            Awesome!
          </Button>
        </div>
      </Card>
    </div>
  );
};
