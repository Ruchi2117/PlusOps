import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-semibold tracking-normal shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)] backdrop-blur",
  {
    variants: {
      variant: {
        neutral: "border-white/[0.08] bg-white/[0.055] text-[#a3b0c2]",
        success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgb(16_185_129_/_0.08)]",
        warning: "border-amber-300/20 bg-amber-400/10 text-amber-200 shadow-[0_0_24px_rgb(245_158_11_/_0.08)]",
        danger: "border-red-300/20 bg-red-400/10 text-red-200 shadow-[0_0_24px_rgb(239_68_68_/_0.1)]",
        info: "border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-[0_0_24px_rgb(14_165_233_/_0.08)]"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
