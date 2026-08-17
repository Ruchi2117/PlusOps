import type {
  AlertRule,
  MetricAggregation,
  MetricDefinition,
  MetricQueryPoint,
  ServiceSummary
} from "@plusops/contracts";
import { Activity, BellRing } from "lucide-react";

import {
  MotionReveal,
  OperationalScene,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode,
  SignalRibbon,
  ThresholdBand
} from "../../components/spatial";
import { formatDateTime, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import {
  buildMetricInspectorItems,
  formatMetricValue,
  formatThreshold,
  getThresholdScale,
  thresholdBandState
} from "./metric-alert-model";

const alertPositions = [
  { x: 78, y: 28 },
  { x: 84, y: 54 },
  { x: 72, y: 74 }
];

type MetricsSignalFieldProps = {
  aggregation: MetricAggregation;
  metric: MetricDefinition;
  onSelectAlert: (alertId: string) => void;
  points: MetricQueryPoint[];
  relatedAlerts: AlertRule[];
  selectedAlertId?: string;
  service?: ServiceSummary;
  timeRangeLabel: string;
};

export function MetricsSignalField({
  aggregation,
  metric,
  onSelectAlert,
  points,
  relatedAlerts,
  selectedAlertId,
  service,
  timeRangeLabel
}: MetricsSignalFieldProps) {
  const selectedAlert = relatedAlerts.find((alert) => alert.id === selectedAlertId) ?? relatedAlerts[0];
  const latestPoint = points.at(-1);
  const thresholdScale = selectedAlert ? getThresholdScale(points, selectedAlert.condition.threshold) : null;
  const ribbonPoints = points.map((point) => ({
    label: formatDateTime(point.timestamp),
    value: point.value
  }));

  return (
    <OperationalScene
      aria-label={`${metric.displayName} operational signal environment`}
      className="metrics-signal-field"
      height="full"
      image={{
        src: visualAssets.lightSail,
        alt: "",
        focalPoint: "center 62%",
        motion: "slow-drift",
        opacity: 0.5,
        scale: 1.08
      }}
      inspector={
        <SceneInspector
          className="metrics-signal-field__inspector"
          items={buildMetricInspectorItems({
            aggregation,
            alert: selectedAlert,
            metric,
            points,
            service,
            timeRangeLabel
          })}
          subtitle={`${service?.name ?? "Service"} · ${titleCase(metric.type)}`}
          title={metric.displayName}
        />
      }
      overlay="strong"
      spatialLayer={
        <>
          {relatedAlerts.slice(0, 3).map((alert, index) => {
            const position = alertPositions[index] ?? alertPositions[0]!;
            return (
              <SignalNode
                ariaLabel={`${alert.name}, ${alert.state}, threshold ${formatThreshold(alert.condition.threshold)}`}
                className="metrics-signal-field__alert-node"
                glow={alert.state === "firing"}
                icon={BellRing}
                key={alert.id}
                kind="alert"
                label={alert.name}
                meta={formatThreshold(alert.condition.threshold)}
                onSelect={() => onSelectAlert(alert.id)}
                selected={alert.id === selectedAlert?.id}
                severity={alert.severity}
                size={alert.state === "firing" ? "md" : "sm"}
                status={alert.state}
                value={titleCase(alert.state)}
                x={position.x}
                y={position.y}
              />
            );
          })}
        </>
      }
      tone={selectedAlert?.state === "firing" ? "danger" : "default"}
    >
      <div className="metrics-signal-field__copy">
        <MotionReveal>
          <ResponsiveEditorialTitle eyebrow="Flowing operational signal" size="section" width="tight">
            Behavior moving through time.
          </ResponsiveEditorialTitle>
          <p className="metrics-signal-field__summary">
            {metric.description ?? `${metric.displayName} observed for ${service?.name ?? "its service"}.`}
          </p>
        </MotionReveal>
      </div>

      <MotionReveal className="metrics-signal-field__stream" delay={0.08}>
        <div className="metrics-signal-field__stream-header">
          <div>
            <p className="art-eyebrow">{titleCase(aggregation)} signal</p>
            <p className="metrics-signal-field__value">
              {latestPoint ? formatMetricValue(latestPoint.value, metric) : "No samples"}
            </p>
          </div>
          <Activity className="size-5 text-primary" aria-hidden="true" />
        </div>
        {ribbonPoints.length ? (
          <SignalRibbon
            animated
            ariaLabel={`${metric.displayName} signal over ${timeRangeLabel}`}
            height="15rem"
            label={`${points.length} real query points · ${timeRangeLabel}`}
            points={ribbonPoints}
          />
        ) : (
          <p className="metrics-signal-field__empty-signal">No metric samples returned for this query window.</p>
        )}
      </MotionReveal>

      {selectedAlert && latestPoint && thresholdScale ? (
        <MotionReveal className="metrics-signal-field__threshold" delay={0.14}>
          <p className="metrics-signal-field__causal-label">Signal → boundary → alert</p>
          <ThresholdBand
            boundaryAt={thresholdScale.boundary}
            boundaryLabel={titleCase(selectedAlert.condition.threshold.operator)}
            label={selectedAlert.name}
            max={thresholdScale.max}
            min={thresholdScale.min}
            state={thresholdBandState(selectedAlert)}
            unit={metric.unit === "milliseconds" ? "ms" : metric.unit === "percent" ? "%" : ""}
            value={latestPoint.value}
          />
        </MotionReveal>
      ) : (
        <p className="metrics-signal-field__no-threshold">
          No alert rule in the current API matches this metric signal.
        </p>
      )}
    </OperationalScene>
  );
}
