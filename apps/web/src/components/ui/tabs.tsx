import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full gap-1.5 overflow-x-auto rounded-lg border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] backdrop-blur">
      {children}
    </div>
  );
}

export function TabButton({ active, className, ...props }: TabButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-muted-foreground outline-none transition-all duration-200 hover:bg-white/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60",
        active && "bg-primary/12 text-white shadow-[inset_0_0_0_1px_rgb(49_230_168_/_0.18),0_0_30px_rgb(49_230_168_/_0.1)]",
        className
      )}
      aria-pressed={active}
      {...props}
    />
  );
}
