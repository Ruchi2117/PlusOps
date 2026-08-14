import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgb(255_181_108_/_0.2),0_12px_42px_rgb(255_111_38_/_0.24)] hover:-translate-y-0.5 hover:bg-[#ff9b3d] hover:shadow-[0_0_0_1px_rgb(255_181_108_/_0.3),0_18px_60px_rgb(255_111_38_/_0.32)] active:translate-y-0",
        secondary:
          "border border-white/[0.08] bg-white/[0.055] text-foreground shadow-panel backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/[0.09] hover:shadow-glow active:translate-y-0",
        ghost:
          "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground active:bg-white/[0.08]"
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "size-10"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ className, size, variant }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
