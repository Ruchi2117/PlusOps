import type { CSSProperties } from "react";

import { cn } from "../../lib/cn";

export type ThresholdBandState = "normal" | "warning" | "critical" | "firing" | "resolved";

export type ThresholdBandProps = {
  boundaryAt?: number;
  boundaryLabel?: string;
  className?: string;
  criticalAt?: number;
  label: string;
  max?: number;
  min?: number;
  state: ThresholdBandState;
  unit?: string;
  value: number;
  warningAt?: number;
};

type ThresholdBandStyle = CSSProperties & {
  "--threshold-critical"?: string;
  "--threshold-value"?: string;
  "--threshold-warning"?: string;
};

export function ThresholdBand({
  boundaryAt,
  boundaryLabel = "Boundary",
  className,
  criticalAt,
  label,
  max = 100,
  min = 0,
  state,
  unit = "",
  value,
  warningAt
}: ThresholdBandProps) {
  const singleBoundary = boundaryAt !== undefined;
  const resolvedWarningAt = warningAt ?? boundaryAt ?? min;
  const resolvedCriticalAt = criticalAt ?? boundaryAt ?? max;
  const style: ThresholdBandStyle = {
    "--threshold-critical": `${toPercent(resolvedCriticalAt, min, max)}%`,
    "--threshold-value": `${toPercent(value, min, max)}%`,
    "--threshold-warning": `${toPercent(resolvedWarningAt, min, max)}%`
  };

  return (
    <figure
      className={cn("threshold-band", className)}
      data-boundary={singleBoundary ? "single" : "range"}
      data-state={state}
      style={style}
    >
      <div className="threshold-band__header">
        <figcaption>
          <p className="threshold-band__label">{label}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {singleBoundary ? (
              <>
                {boundaryLabel} at {boundaryAt}
                {unit}
              </>
            ) : (
              <>
                Warning at {resolvedWarningAt}
                {unit}, critical at {resolvedCriticalAt}
                {unit}
              </>
            )}
          </p>
        </figcaption>
        <p className="threshold-band__value">
          {value}
          {unit}
        </p>
      </div>
      <div className="threshold-band__track" aria-label={`${label}: ${value}${unit}, ${state}`}>
        <span className="threshold-band__signal" />
        <span className="threshold-band__marker" />
      </div>
      <div className="threshold-band__legend" aria-hidden="true">
        {singleBoundary ? (
          <>
            <span>Within boundary</span>
            <span>{boundaryLabel}</span>
            <span>Beyond boundary</span>
          </>
        ) : (
          <>
            <span>Normal</span>
            <span>Warning</span>
            <span>Critical</span>
          </>
        )}
      </div>
    </figure>
  );
}

function toPercent(value: number, min: number, max: number) {
  const range = Math.max(max - min, 1);
  return Math.min(100, Math.max(0, ((value - min) / range) * 100));
}
