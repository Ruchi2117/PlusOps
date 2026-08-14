import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg border border-white/[0.04] bg-white/[0.055]",
        className
      )}
      {...props}
    />
  );
}
