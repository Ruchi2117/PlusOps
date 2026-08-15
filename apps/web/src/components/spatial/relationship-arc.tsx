import { useId } from "react";

import { cn } from "../../lib/cn";

export type RelationshipArcPoint = {
  x: number;
  y: number;
};

export type RelationshipArcTone = "primary" | "danger" | "muted";

export type RelationshipArcProps = {
  active?: boolean;
  animated?: boolean;
  className?: string;
  curve?: number;
  directional?: boolean;
  from: RelationshipArcPoint;
  label?: string;
  to: RelationshipArcPoint;
  tone?: RelationshipArcTone;
};

export function RelationshipArc({
  active = true,
  animated = false,
  className,
  curve = 0.24,
  directional = false,
  from,
  label,
  to,
  tone = "primary"
}: RelationshipArcProps) {
  const markerId = `relationship-arrow-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("relationship-arc", className)}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      viewBox="0 0 100 100"
    >
      {label ? <title>{label}</title> : null}
      {directional ? (
        <defs>
          <marker id={markerId} markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="rgb(255 181 108 / 0.72)" />
          </marker>
        </defs>
      ) : null}
      <path
        className="relationship-arc__path"
        d={buildArcPath(from, to, curve)}
        data-active={active ? "true" : "false"}
        data-animated={animated ? "true" : "false"}
        data-tone={tone}
        markerEnd={directional ? `url(#${markerId})` : undefined}
      />
    </svg>
  );
}

function buildArcPath(from: RelationshipArcPoint, to: RelationshipArcPoint, curve: number) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const normalX = -dy * curve;
  const normalY = dx * curve;

  return `M ${from.x} ${from.y} Q ${midX + normalX} ${midY + normalY} ${to.x} ${to.y}`;
}
