import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/cn";

export type SignalNodeKind = "service" | "incident" | "alert" | "metric" | "health" | "ai" | "core";
export type SignalNodeStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown"
  | "archived"
  | "open"
  | "investigating"
  | "identified"
  | "mitigated"
  | "monitoring"
  | "closed"
  | "ok"
  | "pending"
  | "firing"
  | "resolved"
  | "muted"
  | "warning"
  | "critical";
export type SignalNodeSeverity = "info" | "warning" | "critical";
export type SignalNodeSize = "sm" | "md" | "lg" | "core";

export type SignalNodeProps = {
  ariaLabel?: string;
  className?: string;
  glow?: boolean;
  icon?: LucideIcon;
  kind: SignalNodeKind;
  label: string;
  mark?: ReactNode;
  meta?: string;
  onSelect?: () => void;
  selected?: boolean;
  severity?: SignalNodeSeverity;
  size?: SignalNodeSize;
  status?: SignalNodeStatus;
  value?: string;
  x?: number;
  y?: number;
};

type SignalNodeStyle = CSSProperties & {
  "--signal-x"?: string;
  "--signal-y"?: string;
};

export function SignalNode({
  ariaLabel,
  className,
  glow = false,
  icon: Icon,
  kind,
  label,
  mark,
  meta,
  onSelect,
  selected = false,
  severity,
  size = "md",
  status,
  value,
  x,
  y
}: SignalNodeProps) {
  const floating = typeof x === "number" && typeof y === "number";
  const style: SignalNodeStyle = floating
    ? {
        "--signal-x": `${x}%`,
        "--signal-y": `${y}%`
      }
    : {};
  const accessibleLabel = ariaLabel ?? [label, status, severity, value].filter(Boolean).join(", ");
  const content = (
    <>
      {mark ?? (Icon ? <Icon className="signal-node__icon" aria-hidden="true" /> : null)}
      {status ? <span className="signal-node__eyebrow">{status}</span> : null}
      <span className="signal-node__label">{label}</span>
      {value ? <span className="signal-node__value">{value}</span> : null}
      {meta ? <span className="signal-node__meta">{meta}</span> : null}
    </>
  );

  if (onSelect) {
    return (
      <button
        aria-label={accessibleLabel}
        aria-pressed={selected}
        className={cn("signal-node", className)}
        data-floating={floating ? "true" : "false"}
        data-glow={glow ? "true" : "false"}
        data-kind={kind}
        data-selected={selected ? "true" : "false"}
        data-severity={severity}
        data-size={size}
        data-status={status}
        onClick={onSelect}
        style={style}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-label={accessibleLabel}
      className={cn("signal-node", className)}
      data-floating={floating ? "true" : "false"}
      data-glow={glow ? "true" : "false"}
      data-kind={kind}
      data-selected={selected ? "true" : "false"}
      data-severity={severity}
      data-size={size}
      data-status={status}
      role="img"
      style={style}
    >
      {content}
    </div>
  );
}
