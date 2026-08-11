import { describe, expect, it } from "vitest";

import { HealthCheck, HealthCheckResult, HealthEvaluation } from "./index";

describe("HealthEvaluation", () => {
  it("marks a service healthy when all enabled checks are healthy", () => {
    const evaluation = HealthEvaluation.evaluate({
      id: evaluationId(),
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId(), isCritical: true }).toSnapshot()],
      latestResults: [result({ status: "healthy" }).toSnapshot()],
      evaluatedAt: now()
    });

    expect(evaluation.toSnapshot()).toMatchObject({
      status: "healthy",
      summary: "All enabled health checks are healthy."
    });
  });

  it("marks a service degraded when an optional dependency fails", () => {
    const evaluation = HealthEvaluation.evaluate({
      id: evaluationId(),
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId(), isCritical: false }).toSnapshot()],
      latestResults: [result({ status: "unhealthy" }).toSnapshot()],
      evaluatedAt: now()
    });

    expect(evaluation.toSnapshot().status).toBe("degraded");
  });

  it("marks a service unhealthy when a critical dependency fails", () => {
    const evaluation = HealthEvaluation.evaluate({
      id: evaluationId(),
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId(), isCritical: true }).toSnapshot()],
      latestResults: [result({ status: "unhealthy" }).toSnapshot()],
      evaluatedAt: now()
    });

    expect(evaluation.toSnapshot()).toMatchObject({
      status: "unhealthy",
      summary: "A critical health check is failing."
    });
  });

  it("marks a service unknown when a critical check is stale or missing", () => {
    const staleEvaluation = HealthEvaluation.evaluate({
      id: evaluationId(),
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId(), staleAfterSeconds: 60 }).toSnapshot()],
      latestResults: [
        result({
          status: "healthy",
          checkedAt: new Date("2026-08-11T09:58:00.000Z")
        }).toSnapshot()
      ],
      evaluatedAt: now()
    });
    const missingEvaluation = HealthEvaluation.evaluate({
      id: "52a083eb-05f0-411c-b938-c7c1a5bd36cf",
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId() }).toSnapshot()],
      latestResults: [],
      evaluatedAt: now()
    });

    expect(staleEvaluation.toSnapshot().status).toBe("unknown");
    expect(missingEvaluation.toSnapshot().status).toBe("unknown");
  });

  it("ignores disabled checks during service health evaluation", () => {
    const evaluation = HealthEvaluation.evaluate({
      id: evaluationId(),
      serviceId: serviceId(),
      checks: [check({ id: healthCheckId(), isEnabled: false }).toSnapshot()],
      latestResults: [result({ status: "unhealthy" }).toSnapshot()],
      evaluatedAt: now()
    });

    expect(evaluation.toSnapshot()).toMatchObject({
      status: "unknown",
      summary: "No enabled health checks are configured."
    });
  });
});

function check(overrides: Partial<Parameters<typeof HealthCheck.restore>[0]> = {}): HealthCheck {
  return HealthCheck.restore({
    id: healthCheckId(),
    serviceId: serviceId(),
    name: "Readiness",
    type: "http_endpoint",
    target: "https://api.plusops.dev/ready",
    description: null,
    isCritical: true,
    isEnabled: true,
    intervalSeconds: 60,
    timeoutMs: 5000,
    staleAfterSeconds: 300,
    configuration: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    ...overrides
  });
}

function result(
  overrides: Partial<Parameters<typeof HealthCheckResult.restore>[0]> = {}
): HealthCheckResult {
  return HealthCheckResult.restore({
    id: resultId(),
    serviceId: serviceId(),
    healthCheckId: healthCheckId(),
    status: "healthy",
    responseTimeMs: 42,
    message: null,
    checkedAt: now(),
    createdAt: now(),
    ...overrides
  });
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function healthCheckId(): string {
  return "d64ac402-25b7-4a22-aaab-a0b98eb7efab";
}

function resultId(): string {
  return "0462d2bb-8158-4dac-8c70-1c93c44192c8";
}

function evaluationId(): string {
  return "6fc0835f-0fa5-40d4-a593-75fed937aa31";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
