import type { AlertRule, IncidentSummary, MetricDefinition, ServiceSummary } from "@plusops/contracts";
import { describe, expect, it } from "vitest";

import { buildContextNodes } from "./ai-copilot-page";

const now = "2026-08-18T10:00:00.000Z";
const serviceId = "11111111-1111-4111-8111-111111111111";
const incidentId = "22222222-2222-4222-8222-222222222222";
const metricId = "33333333-3333-4333-8333-333333333333";
const alertId = "44444444-4444-4444-8444-444444444444";

describe("AI context model", () => {
  it("builds selectable context from real operational signals", () => {
    const nodes = buildContextNodes({
      incidents: [incident()],
      services: [service()],
      metrics: [metric()],
      alerts: [alert()],
      healthByServiceId: new Map()
    });

    expect(nodes.map((node) => node.kind)).toEqual(["incident", "alert", "service", "metric"]);
    expect(nodes[0]?.context).toMatchObject({ incidentId, serviceId, environment: "production" });
    expect(nodes[1]?.context).toMatchObject({ serviceId, environment: "production" });
    expect(nodes[3]?.context.metadata).toMatchObject({ metricId, metricName: "api_latency_ms" });
  });

  it("does not invent context nodes when operational data is empty", () => {
    expect(buildContextNodes({ incidents: [], services: [], metrics: [], alerts: [], healthByServiceId: new Map() })).toEqual([]);
  });
});

function service(): ServiceSummary {
  return {
    id: serviceId,
    name: "Payments API",
    slug: "payments-api",
    description: "Processes payments.",
    ownerTeamId: "55555555-5555-4555-8555-555555555555",
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

function incident(): IncidentSummary {
  return {
    id: incidentId,
    title: "Checkout latency above SLO",
    serviceId,
    serviceName: "Payments API",
    severity: "sev2",
    priority: "high",
    status: "investigating",
    assigneeId: null,
    assigneeName: null,
    startedAt: now,
    updatedAt: now,
    customerImpact: "Checkout requests are slow."
  };
}

function metric(): MetricDefinition {
  return {
    id: metricId,
    serviceId,
    name: "api_latency_ms",
    displayName: "API latency",
    description: "Request latency.",
    type: "gauge",
    unit: "milliseconds",
    customUnit: null,
    defaultAggregation: "average",
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}

function alert(): AlertRule {
  return {
    id: alertId,
    name: "Payments latency alert",
    description: "Latency is too high.",
    severity: "critical",
    state: "firing",
    condition: {
      metricName: "api_latency_ms",
      metricDefinitionId: metricId,
      serviceId,
      filters: [],
      aggregation: "average",
      evaluationWindowSeconds: 3600,
      threshold: { operator: "greater_than", value: 500 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}
