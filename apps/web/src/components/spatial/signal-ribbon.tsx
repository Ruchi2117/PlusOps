import type { CSSProperties } from "react";
import { useId } from "react";

import { cn } from "../../lib/cn";

export type SignalRibbonPoint = {
  label: string;
  value: number;
};

export type SignalRibbonProps = {
  animated?: boolean;
  ariaLabel?: string;
  className?: string;
  color?: string;
  height?: string;
  label?: string;
  onPointHover?: (point: SignalRibbonPoint) => void;
  points?: SignalRibbonPoint[];
};

type SignalRibbonStyle = CSSProperties & {
  "--signal-ribbon-color"?: string;
  "--signal-ribbon-height"?: string;
};

const samplePoints: SignalRibbonPoint[] = [
  { label: "12:00", value: 260 },
  { label: "12:10", value: 310 },
  { label: "12:20", value: 284 },
  { label: "12:30", value: 356 },
  { label: "12:40", value: 330 },
  { label: "12:50", value: 390 },
  { label: "13:00", value: 348 }
];

export function SignalRibbon({
  animated = true,
  ariaLabel,
  className,
  color = "var(--ops-color-amber)",
  height = "12rem",
  label,
  onPointHover,
  points = samplePoints
}: SignalRibbonProps) {
  const gradientId = `signal-ribbon-fill-${useId().replace(/:/g, "")}`;
  const coordinates = normalizePoints(points);
  const linePath = buildLinePath(coordinates);
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;
  const style: SignalRibbonStyle = {
    "--signal-ribbon-color": color,
    "--signal-ribbon-height": height
  };

  return (
    <figure
      aria-label={ariaLabel ?? label ?? "Operational signal ribbon"}
      className={cn("signal-ribbon", className)}
      data-animated={animated ? "true" : "false"}
      role="img"
      style={style}
    >
      <svg preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(255 181 108 / 0.38)" />
            <stop offset="72%" stopColor="rgb(255 132 43 / 0.08)" />
            <stop offset="100%" stopColor="rgb(255 132 43 / 0)" />
          </linearGradient>
        </defs>
        <path className="signal-ribbon__area" d={areaPath} fill={`url(#${gradientId})`} />
        <path className="signal-ribbon__line" d={linePath} />
        {coordinates.map((point, index) => (
          <circle
            key={`${point.label}-${point.value}-${index}`}
            aria-label={`${point.label}: ${point.value}`}
            className="signal-ribbon__point"
            cx={point.x}
            cy={point.y}
            onFocus={() => onPointHover?.({ label: point.label, value: point.value })}
            onMouseEnter={() => onPointHover?.({ label: point.label, value: point.value })}
            r="2.8"
            tabIndex={onPointHover ? 0 : undefined}
          />
        ))}
      </svg>
      {label ? <figcaption className="signal-ribbon__caption">{label}</figcaption> : null}
    </figure>
  );
}

function normalizePoints(points: SignalRibbonPoint[]) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? 50 : (index / (points.length - 1)) * 100,
    y: 88 - ((point.value - min) / range) * 72
  }));
}

function buildLinePath(points: Array<SignalRibbonPoint & { x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}
