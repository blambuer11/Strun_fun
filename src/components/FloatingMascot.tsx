import { useState, useEffect } from "react";
import runnyMascot from "@/assets/runny-mascot.png";
import { RunnyChat } from "./RunnyChat";

type MascotMood = "idle" | "running" | "cheering" | "confused" | "tired" | "hype";

interface FloatingMascotProps {
  mood?: MascotMood;
  message?: string;
}

export const FloatingMascot = ({ mood = "idle", message }: FloatingMascotProps) => {
  const [showMessage, setShowMessage] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (message) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getMascotAnimation = () => {
    switch (mood) {
      case "running":
        return "animate-running";
      case "cheering":
        return "animate-bounce-slow";
      case "hype":
        return "animate-pulse-glow";
      case "confused":
        return "animate-pulse";
      case "tired":
        return "";
      default:
        return "animate-float";
    }
  };

  const getMascotEmoji = () => {
    switch (mood) {
      case "running":
        return "💨";
      case "cheering":
        return "🎉";
      case "hype":
        return "🔥";
      case "confused":
        return "🤔";
      case "tired":
        return "😴";
      default:
        return "👋";
    }
  };

  return (
    <>
      {/* Floating Mascot */}
      <div className="fixed bottom-24 left-4 z-40">
        <button
          onClick={() => setChatOpen(true)}
          className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-1 shadow-lg hover:scale-110 transition-transform ${getMascotAnimation()}`}
          aria-label="Chat with Runny"
        >
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
            <img
              src={runnyMascot}
              alt="Runny - Your AI Fitness Assistant"
              className="w-14 h-14 object-contain"
            />
          </div>
          {/* Mood Emoji Badge */}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs border-2 border-card">
            {getMascotEmoji()}
          </div>
        </button>

        {/* Speech Bubble */}
        {showMessage && message && (
          <div className="absolute bottom-full left-0 mb-2 animate-slide-up">
            <div className="relative bg-card/95 backdrop-blur-sm border border-primary/30 rounded-2xl px-4 py-2 shadow-lg max-w-[200px]">
              <p className="text-xs text-foreground font-medium">{message}</p>
              {/* Tail */}
              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-card/95 border-l border-b border-primary/30 rotate-45" />
            </div>
          </div>
        )}
      </div>

      {/* Chat Dialog */}
      <RunnyChat open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};
