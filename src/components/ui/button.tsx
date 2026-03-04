import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange hover:brightness-110 hover:shadow-glow-orange",
        gold: "bg-gradient-to-r from-stork-gold to-stork-gold-dark text-black shadow-glow-gold hover:brightness-110",
        destructive: "bg-destructive/90 text-white hover:bg-destructive border border-destructive/30",
        outline: "border border-stork-dark-border bg-transparent hover:bg-stork-dark-card hover:border-stork-orange/40 text-foreground",
        secondary: "bg-stork-dark-card text-foreground border border-stork-dark-border hover:border-stork-orange/30",
        ghost: "hover:bg-stork-dark-card hover:text-stork-orange text-muted-foreground",
        link: "text-stork-orange underline-offset-4 hover:underline hover:text-stork-gold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
