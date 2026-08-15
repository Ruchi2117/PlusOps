import type {
  AlertRule,
  IncidentSummary,
  ServiceDependency,
  ServiceHealthResponse,
  ServiceSummary
} from "@plusops/contracts";
import { describe, expect, it } from "vitest";

import { buildServiceUniverseModel } from "./services-page";

const now = "2026-08-15T00:00:00.000Z";
const checkoutId = "11111111-1111-4111-8111-111111111111";
const paymentsId = "22222222-2222-4222-8222-222222222222";
const authId = "33333333-3333-4333-8333-333333333333";

describe("service universe model", () => {
  it("creates only real dependency arcs and preserves direction", () => {
    const model = buildServiceUniverseModel({
      alerts: [],
      dependencies: [dependency(checkoutId, paymentsId, "Checkout calls Payments API.")],
      health: [],
      incidents: [],
      services: [service(checkoutId, "Checkout", "checkout"), service(paymentsId, "Payments API", "payments-api"), service(authId, "Auth Service", "auth-service")]
    });

    expect(model.arcs).toEqual([
      expect.objectContaining({ fromId: checkoutId, toId: paymentsId, label: "Checkout calls Payments API." })
    ]);
    expect(model.nodes.find((node) => node.id === checkoutId)?.relatedIds).toEqual([paymentsId]);
    expect(model.nodes.find((node) => node.id === authId)?.relatedIds).toEqual([]);
  });

  it("promotes critical service signals and exposes operational context", () => {
    const model = buildServiceUniverseModel({
      alerts: [alert(paymentsId)],
      dependencies: [dependency(checkoutId, paymentsId, "Checkout calls Payments API.")],
      health: [health(paymentsId, "degraded")],
      incidents: [incident(paymentsId)],
      services: [service(checkoutId, "Checkout", "checkout"), service(paymentsId, "Payments API", "payments-api")]
    });
    const payments = model.nodes.find((node) => node.id === paymentsId);

    expect(payments).toMatchObject({ glow: true, severity: "critical", size: "lg", status: "degraded" });
    expect(payments?.inspectorItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dependents", value: "1" }),
        expect.objectContaining({ label: "Active incidents", value: "1" }),
        expect.objectContaining({ label: "Firing alerts", value: "1" })
      ])
    );
  });
});

function service(id: string, name: string, slug: string): ServiceSummary {
  return {
    id,
    name,
    slug,
    description: `${name} description`,
    ownerTeamId: "44444444-4444-4444-8444-444444444444",
    ownerTeamName: "Platform Engineering",
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

function dependency(fromId: string, toId: string, description: string): ServiceDependency {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    upstreamServiceId: fromId,
    upstreamServiceName: "Checkout",
    upstreamServiceSlug: "checkout",
    downstreamServiceId: toId,
    downstreamServiceName: "Payments API",
    downstreamServiceSlug: "payments-api",
    description,
    createdAt: now,
    deletedAt: null
  };
}

function health(serviceId: string, status: ServiceHealthResponse["status"]): ServiceHealthResponse {
  return {
    serviceId,
    status,
    summary: "Dependency latency is elevated.",
    evaluatedAt: now,
    latestPersistedEvaluation: null,
    checks: []
  };
}

function incident(serviceId: string): IncidentSummary {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    title: "Checkout latency above SLO",
    serviceId,
    serviceName: "Payments API",
    severity: "sev1",
    priority: "urgent",
    status: "investigating",
    assigneeId: null,
    assigneeName: null,
    startedAt: now,
    updatedAt: now,
    customerImpact: null
  };
}

function alert(serviceId: string): AlertRule {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Payments API latency",
    description: null,
    severity: "critical",
    state: "firing",
    condition: {
      metricName: "api_latency_ms",
      serviceId,
      filters: [],
      aggregation: "average",
      evaluationWindowSeconds: 300,
      threshold: { operator: "greater_than", value: 500 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}
