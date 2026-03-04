import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black",
        secondary: "border-stork-dark-border bg-stork-dark-card text-foreground",
        destructive: "border-red-500/30 bg-red-500/15 text-red-400",
        outline: "border-stork-dark-border text-muted-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning: "border-stork-gold/40 bg-stork-gold/10 text-stork-gold",
        gold: "border-stork-gold/40 bg-gradient-to-r from-stork-gold/20 to-stork-gold-dark/20 text-stork-gold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
