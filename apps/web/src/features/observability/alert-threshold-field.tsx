import type {
  AlertEvaluation,
  AlertRule,
  MetricDefinition,
  MetricQueryPoint,
  ServiceSummary
} from "@plusops/contracts";
import { BellRing, Play } from "lucide-react";

import {
  MotionReveal,
  OperationalScene,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode,
  SignalRibbon,
  ThresholdBand
} from "../../components/spatial";
import { Button } from "../../components/ui/button";
import { formatDateTime, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import {
  buildAlertInspectorItems,
  formatThreshold,
  getThresholdScale,
  thresholdBandState
} from "./metric-alert-model";

const nodePositions = [
  { x: 56, y: 16 },
  { x: 72, y: 16 },
  { x: 88, y: 16 },
  { x: 56, y: 34 },
  { x: 72, y: 34 },
  { x: 88, y: 34 }
];

type AlertThresholdFieldProps = {
  alerts: AlertRule[];
  evaluation?: AlertEvaluation;
  evaluationPending: boolean;
  metric?: MetricDefinition;
  onEvaluate: (alertId: string) => void;
  onSelect: (alertId: string) => void;
  points: MetricQueryPoint[];
  selectedAlert: AlertRule;
  service?: ServiceSummary;
};

export function AlertThresholdField({
  alerts,
  evaluation,
  evaluationPending,
  metric,
  onEvaluate,
  onSelect,
  points,
  selectedAlert,
  service
}: AlertThresholdFieldProps) {
  const latestPoint = points.at(-1);
  const thresholdScale = getThresholdScale(points, selectedAlert.condition.threshold);
  const ribbonPoints = points.map((point) => ({ label: formatDateTime(point.timestamp), value: point.value }));

  return (
    <OperationalScene
      aria-label="Alert threshold event field"
      className="alert-threshold-field"
      height="full"
      image={{
        src: visualAssets.redPanelCorridor,
        alt: "",
        focalPoint: "center",
        motion: "slow-drift",
        opacity: 0.48,
        scale: 1.06
      }}
      inspector={
        <SceneInspector
          actions={
            <Button
              disabled={evaluationPending}
              onClick={() => onEvaluate(selectedAlert.id)}
              size="sm"
            >
              <Play className="size-4" aria-hidden="true" />
              Evaluate rule
            </Button>
          }
          className="alert-threshold-field__inspector"
          items={buildAlertInspectorItems({
            alert: selectedAlert,
            evaluation,
            latestPoint,
            metric,
            service
          })}
          subtitle={`${titleCase(selectedAlert.severity)} severity`}
          title={selectedAlert.name}
        />
      }
      overlay="strong"
      spatialLayer={
        <>
          {alerts.slice(0, 6).map((alert, index) => {
            const position = nodePositions[index] ?? nodePositions[0]!;
            const selected = alert.id === selectedAlert.id;
            return (
              <SignalNode
                ariaLabel={`${alert.name}, ${alert.state}, ${alert.severity}, ${formatThreshold(alert.condition.threshold)}`}
                className="alert-threshold-field__node"
                glow={alert.state === "firing"}
                icon={BellRing}
                key={alert.id}
                kind="alert"
                label={alert.name}
                meta={formatThreshold(alert.condition.threshold)}
                onSelect={() => onSelect(alert.id)}
                selected={selected}
                severity={alert.severity}
                size={alert.state === "firing" ? "lg" : alert.state === "pending" ? "md" : "sm"}
                status={alert.state}
                value={titleCase(alert.state)}
                x={position.x}
                y={position.y}
              />
            );
          })}
        </>
      }
      tone={selectedAlert.state === "firing" ? "danger" : "default"}
    >
      <MotionReveal className="alert-threshold-field__copy">
        <ResponsiveEditorialTitle eyebrow="Threshold event field" size="section" width="tight">
          Boundaries make signals actionable.
        </ResponsiveEditorialTitle>
        <p className="alert-threshold-field__summary">
          Select a rule to isolate the metric behavior that produced its current state.
        </p>
      </MotionReveal>

      <MotionReveal className="alert-threshold-field__signal" delay={0.08}>
        <p className="art-eyebrow">
          {metric?.displayName ?? selectedAlert.condition.metricName ?? "Metric signal"}
        </p>
        {ribbonPoints.length ? (
          <SignalRibbon
            animated
            ariaLabel={`${selectedAlert.name} related metric signal`}
            height="11rem"
            label={`${points.length} query points · ${titleCase(selectedAlert.condition.aggregation)}`}
            points={ribbonPoints}
          />
        ) : (
          <p className="alert-threshold-field__empty-signal">No metric samples returned for this rule window.</p>
        )}
      </MotionReveal>

      {latestPoint && thresholdScale ? (
        <MotionReveal className="alert-threshold-field__threshold" delay={0.14}>
          <p className="alert-threshold-field__causal-label">Metric → threshold → {titleCase(selectedAlert.state)}</p>
          <ThresholdBand
            boundaryAt={thresholdScale.boundary}
            boundaryLabel={titleCase(selectedAlert.condition.threshold.operator)}
            label={selectedAlert.name}
            max={thresholdScale.max}
            min={thresholdScale.min}
            state={thresholdBandState(selectedAlert)}
            unit={metric?.unit === "milliseconds" ? "ms" : metric?.unit === "percent" ? "%" : ""}
            value={latestPoint.value}
          />
        </MotionReveal>
      ) : null}
    </OperationalScene>
  );
}
