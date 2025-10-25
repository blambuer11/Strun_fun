import { cn } from "@/lib/utils";

interface GradientCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "accent" | "dark";
}

export const GradientCard = ({ children, className, variant = "primary" }: GradientCardProps) => {
  const variants = {
    primary: "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30",
    accent: "bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border-accent/30",
    dark: "bg-gradient-to-br from-card via-card/80 to-background/50 border-border/50",
  };

  return (
    <div className={cn(
      "rounded-2xl border backdrop-blur-xl transition-all duration-300",
      "hover:shadow-lg hover:border-primary/50",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};
