import type {
  AlertRule,
  AlertThreshold,
  MetricDefinition,
  MetricQueryPoint,
  ServiceSummary
} from "@plusops/contracts";

import type { SceneInspectorItem, ThresholdBandState } from "../../components/spatial";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";

export type MetricTrend = {
  changePercent: number | null;
  direction: "up" | "down" | "flat" | "unavailable";
  label: string;
};

export type ThresholdScale = {
  boundary: number;
  max: number;
  min: number;
};

export function alertMatchesMetric(alert: AlertRule, metric: MetricDefinition) {
  const condition = alert.condition;
  const identityMatches = condition.metricDefinitionId
    ? condition.metricDefinitionId === metric.id
    : condition.metricName === metric.name;
  const serviceMatches = !condition.serviceId || condition.serviceId === metric.serviceId;

  return identityMatches && serviceMatches;
}

export function alertsForMetric(alerts: AlertRule[], metric?: MetricDefinition) {
  return metric ? alerts.filter((alert) => alertMatchesMetric(alert, metric)) : [];
}

export function metricForAlert(metrics: MetricDefinition[], alert?: AlertRule) {
  if (!alert) {
    return undefined;
  }

  return metrics.find((metric) => alertMatchesMetric(alert, metric));
}

export function getMetricTrend(points: MetricQueryPoint[]): MetricTrend {
  if (points.length < 2) {
    return { changePercent: null, direction: "unavailable", label: "Not enough samples" };
  }

  const first = points[0]!.value;
  const latest = points.at(-1)!.value;
  const delta = latest - first;
  const changePercent = first === 0 ? null : (delta / Math.abs(first)) * 100;
  const tolerance = Math.max(Math.abs(first) * 0.005, Number.EPSILON);
  const direction = Math.abs(delta) <= tolerance ? "flat" : delta > 0 ? "up" : "down";
  const label = changePercent === null
    ? `${direction} from the first sample`
    : `${changePercent >= 0 ? "+" : ""}${formatNumber(changePercent, { maximumFractionDigits: 1 })}% across the window`;

  return { changePercent, direction, label };
}

export function thresholdBoundary(threshold: AlertThreshold) {
  if (threshold.value !== undefined) {
    return threshold.value;
  }

  if (threshold.max !== undefined) {
    return threshold.max;
  }

  return threshold.min;
}

export function formatThreshold(threshold: AlertThreshold) {
  const operator = titleCase(threshold.operator);

  if (threshold.value !== undefined) {
    return `${operator} ${formatNumber(threshold.value, { maximumFractionDigits: 2 })}`;
  }

  return `${operator} ${formatNumber(threshold.min ?? 0, { maximumFractionDigits: 2 })}–${formatNumber(threshold.max ?? 0, { maximumFractionDigits: 2 })}`;
}

export function getThresholdScale(points: MetricQueryPoint[], threshold: AlertThreshold): ThresholdScale | null {
  const boundary = thresholdBoundary(threshold);
  if (boundary === undefined) {
    return null;
  }

  const values = points.map((point) => point.value);
  const rawMin = Math.min(boundary, ...values);
  const rawMax = Math.max(boundary, ...values);
  const range = Math.max(rawMax - rawMin, Math.abs(boundary) * 0.2, 1);
  const padding = range * 0.16;

  return {
    boundary,
    min: rawMin - padding,
    max: rawMax + padding
  };
}

export function thresholdBandState(alert?: AlertRule): ThresholdBandState {
  if (!alert) {
    return "normal";
  }

  if (alert.state === "firing") {
    return "firing";
  }

  if (alert.state === "resolved") {
    return "resolved";
  }

  if (alert.state === "pending") {
    return "warning";
  }

  return "normal";
}

export function buildMetricInspectorItems(input: {
  aggregation: string;
  alert?: AlertRule;
  metric: MetricDefinition;
  points: MetricQueryPoint[];
  service?: ServiceSummary;
  timeRangeLabel: string;
}): SceneInspectorItem[] {
  const latest = input.points.at(-1);
  const trend = getMetricTrend(input.points);

  return [
    {
      label: "Current value",
      value: latest ? formatMetricValue(latest.value, input.metric) : "No samples",
      detail: latest ? `Sampled ${formatDateTime(latest.timestamp)}` : undefined
    },
    {
      label: "Service",
      value: input.service?.name ?? "Service unavailable"
    },
    {
      label: "Trend",
      value: titleCase(trend.direction),
      detail: trend.label,
      state: trend.direction === "up" ? "warning" : trend.direction === "down" ? "success" : "neutral"
    },
    {
      label: "Query",
      value: titleCase(input.aggregation),
      detail: input.timeRangeLabel
    },
    {
      label: "Related alert",
      value: input.alert?.name ?? "No matching rule",
      detail: input.alert ? `${titleCase(input.alert.state)} · ${formatThreshold(input.alert.condition.threshold)}` : undefined,
      state: input.alert?.state === "firing" ? "danger" : input.alert?.state === "pending" ? "warning" : "neutral"
    }
  ];
}

export function buildAlertInspectorItems(input: {
  alert: AlertRule;
  evaluation?: { evaluatedAt: string; observedValue: number | null };
  latestPoint?: MetricQueryPoint;
  metric?: MetricDefinition;
  service?: ServiceSummary;
}): SceneInspectorItem[] {
  const observedValue = input.evaluation?.observedValue ?? input.latestPoint?.value;
  const updatedAt = input.evaluation?.evaluatedAt ?? input.alert.updatedAt;

  return [
    {
      label: "State",
      value: titleCase(input.alert.state),
      detail: input.alert.isEnabled ? "Rule enabled" : "Rule disabled",
      state: input.alert.state === "firing" ? "danger" : input.alert.state === "pending" ? "warning" : input.alert.state === "ok" || input.alert.state === "resolved" ? "success" : "neutral"
    },
    {
      label: "Service",
      value: input.service?.name ?? "Not scoped by the rule"
    },
    {
      label: "Metric",
      value: input.metric?.displayName ?? input.alert.condition.metricName ?? "Metric definition unavailable",
      detail: titleCase(input.alert.condition.aggregation)
    },
    {
      label: "Threshold",
      value: formatThreshold(input.alert.condition.threshold),
      detail: `${Math.round(input.alert.condition.evaluationWindowSeconds / 60)} minute evaluation window`
    },
    {
      label: "Current evaluation",
      value: observedValue === undefined || observedValue === null
        ? "No observed value"
        : formatNumber(observedValue, { maximumFractionDigits: 2 }),
      detail: `Last evaluated ${formatDateTime(updatedAt)}`
    }
  ];
}

export function formatMetricValue(value: number, metric: MetricDefinition) {
  const formatted = formatNumber(value, { maximumFractionDigits: 2 });
  const unit = metric.unit === "custom" ? metric.customUnit : metric.unit;
  const suffix = unit === "percent" ? "%" : unit === "milliseconds" ? "ms" : unit ? ` ${unit}` : "";

  return `${formatted}${suffix}`;
}
