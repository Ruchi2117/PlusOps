import type {
  AlertRule,
  MetricDefinition,
  MetricQueryPoint,
  ServiceSummary
} from "@plusops/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AlertThresholdField } from "./alert-threshold-field";
import {
  alertsForMetric,
  buildAlertInspectorItems,
  buildMetricInspectorItems,
  getMetricTrend,
  getThresholdScale,
  metricForAlert
} from "./metric-alert-model";
import { MetricsSignalField } from "./metrics-signal-field";

const serviceId = "11111111-1111-4111-8111-111111111111";
const metricId = "22222222-2222-4222-8222-222222222222";
const alertId = "33333333-3333-4333-8333-333333333333";
const now = "2026-08-17T10:00:00.000Z";

describe("metrics and alert visualization", () => {
  it("links rules to metrics only through real definition/name and service context", () => {
    const selectedMetric = metric();
    const matchingAlert = alert();
    const otherServiceAlert = alert({
      id: "44444444-4444-4444-8444-444444444444",
      condition: { ...matchingAlert.condition, serviceId: "55555555-5555-4555-8555-555555555555" }
    });

    expect(alertsForMetric([matchingAlert, otherServiceAlert], selectedMetric)).toEqual([matchingAlert]);
    expect(metricForAlert([selectedMetric], matchingAlert)).toEqual(selectedMetric);
  });

  it("derives trend and visual scale from query points without changing observed values", () => {
    const queryPoints = points();
    const trend = getMetricTrend(queryPoints);
    const scale = getThresholdScale(queryPoints, alert().condition.threshold);

    expect(trend).toMatchObject({ direction: "up", changePercent: 40 });
    expect(scale?.boundary).toBe(500);
    expect(scale!.min).toBeLessThan(400);
    expect(scale!.max).toBeGreaterThan(560);
    expect(queryPoints.map((point) => point.value)).toEqual([400, 480, 560]);
  });

  it("builds inspectors only from available metric, service, rule, and evaluation data", () => {
    const selectedMetric = metric();
    const selectedAlert = alert();
    const selectedService = service();
    const queryPoints = points();

    expect(buildMetricInspectorItems({
      aggregation: "average",
      alert: selectedAlert,
      metric: selectedMetric,
      points: queryPoints,
      service: selectedService,
      timeRangeLabel: "Last 24 hours"
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Service", value: "Payments API" }),
      expect.objectContaining({ label: "Related alert", value: "Latency above SLO" })
    ]));

    expect(buildAlertInspectorItems({
      alert: selectedAlert,
      latestPoint: queryPoints.at(-1),
      metric: selectedMetric,
      service: selectedService
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Current evaluation", value: "560" }),
      expect.objectContaining({ label: "Threshold", value: "Greater Than 500" })
    ]));
  });

  it("renders a selected metric with its real ribbon, boundary, and related alert", () => {
    const markup = renderToStaticMarkup(
      <MetricsSignalField
        aggregation="average"
        metric={metric()}
        onSelectAlert={() => undefined}
        points={points()}
        relatedAlerts={[alert()]}
        selectedAlertId={alertId}
        service={service()}
        timeRangeLabel="Last 24 hours"
      />
    );

    expect(markup).toContain("Behavior moving through time.");
    expect(markup).toContain("3 real query points");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Signal → boundary → alert");
    expect(markup).toContain("Latency above SLO");
  });

  it("renders alert states as selectable pulses connected to the selected metric threshold", () => {
    const selectedAlert = alert();
    const markup = renderToStaticMarkup(
      <AlertThresholdField
        alerts={[selectedAlert, alert({ id: "66666666-6666-4666-8666-666666666666", state: "ok" })]}
        evaluationPending={false}
        metric={metric()}
        onEvaluate={() => undefined}
        onSelect={() => undefined}
        points={points()}
        selectedAlert={selectedAlert}
        service={service()}
      />
    );

    expect(markup).toContain("Boundaries make signals actionable.");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Metric → threshold → Firing");
    expect(markup).toContain("Evaluate rule");
    expect(markup).toContain("Payments API");
  });
});

function metric(input: Partial<MetricDefinition> = {}): MetricDefinition {
  return {
    id: input.id ?? metricId,
    serviceId: input.serviceId ?? serviceId,
    name: input.name ?? "api_latency_ms",
    displayName: input.displayName ?? "API latency",
    description: input.description ?? "Request latency for the Payments API.",
    type: input.type ?? "gauge",
    unit: input.unit ?? "milliseconds",
    customUnit: input.customUnit ?? null,
    defaultAggregation: input.defaultAggregation ?? "average",
    retentionPolicyId: input.retentionPolicyId ?? null,
    isEnabled: input.isEnabled ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    deletedAt: input.deletedAt ?? null
  };
}

function alert(input: Partial<AlertRule> = {}): AlertRule {
  return {
    id: input.id ?? alertId,
    name: input.name ?? "Latency above SLO",
    description: input.description ?? "Latency crossed the service objective.",
    severity: input.severity ?? "critical",
    state: input.state ?? "firing",
    condition: input.condition ?? {
      metricDefinitionId: metricId,
      metricName: "api_latency_ms",
      serviceId,
      filters: [{ key: "environment", value: "production" }],
      aggregation: "average",
      evaluationWindowSeconds: 3600,
      threshold: { operator: "greater_than", value: 500 }
    },
    isEnabled: input.isEnabled ?? true,
    mutedUntil: input.mutedUntil ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    deletedAt: input.deletedAt ?? null
  };
}

function points(): MetricQueryPoint[] {
  return [400, 480, 560].map((value, index) => ({
    timestamp: new Date(Date.parse(now) + index * 60_000).toISOString(),
    value,
    labels: [{ key: "environment", value: "production" }],
    source: "seed",
    aggregation: "average",
    group: {},
    sampleCount: 1
  }));
}

function service(): ServiceSummary {
  return {
    id: serviceId,
    name: "Payments API",
    slug: "payments-api",
    description: "Processes customer payments.",
    ownerTeamId: "77777777-7777-4777-8777-777777777777",
    ownerTeamName: "Payments",
    repositoryUrl: null,
    apiBaseUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}
