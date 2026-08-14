import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "../../lib/cn";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, trend = "flat", icon: Icon }: MetricCardProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;

  return (
    <article className="rounded-lg border border-white/[0.07] bg-surface/70 p-5 shadow-panel backdrop-blur-2xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:bg-[#141b24]/72 hover:shadow-glow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid size-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.045]">
          <Icon className="size-4 text-primary/80" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="min-w-0 break-words text-3xl font-bold leading-tight tracking-normal text-white">{value}</span>
        {detail ? (
          <span
            className={cn(
              "inline-flex max-w-[48%] items-center gap-1 pb-1 text-right text-xs font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-danger",
              trend === "flat" && "text-muted-foreground"
            )}
          >
            <TrendIcon className="size-3" aria-hidden="true" />
            {detail}
          </span>
        ) : null}
      </div>
    </article>
  );
}
