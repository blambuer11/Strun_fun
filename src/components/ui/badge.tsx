import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-all shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.3)]",
        secondary: "bg-secondary/20 text-secondary border border-secondary/30 shadow-[0_0_15px_rgba(255,0,255,0.3)]",
        destructive: "bg-destructive/20 text-destructive border border-destructive/30",
        outline: "border border-border text-foreground",
        success: "bg-success/20 text-success border border-success/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
