import { describe, expect, it } from "vitest";

import { AlertDomainError, AlertEvaluation, AlertRule, AlertThreshold } from "./index";

describe("alert domain", () => {
  it("evaluates single-value and range thresholds", () => {
    expect(AlertThreshold.create({ operator: "greater_than", value: 500 }).evaluate(501)).toBe(
      true
    );
    expect(AlertThreshold.create({ operator: "less_than", value: 99 }).evaluate(99)).toBe(false);
    expect(AlertThreshold.create({ operator: "between", min: 99, max: 100 }).evaluate(99.9)).toBe(
      true
    );
    expect(
      AlertThreshold.create({ operator: "outside_range", min: 99, max: 100 }).evaluate(97)
    ).toBe(true);
  });

  it("rejects invalid threshold shapes", () => {
    expect(() => AlertThreshold.create({ operator: "between", value: 10 })).toThrow(
      AlertDomainError
    );
    expect(() => AlertThreshold.create({ operator: "greater_than" })).toThrow(AlertDomainError);
  });

  it("normalizes alert rules and validates conditions", () => {
    const alert = AlertRule.create({
      id: alertRuleId(),
      name: " High latency ",
      severity: "critical",
      condition: {
        metricName: " HTTP_REQUEST_DURATION_MS ",
        filters: [{ key: "environment", value: "production" }],
        aggregation: "percentile",
        percentile: 95,
        evaluationWindowSeconds: 3600,
        threshold: { operator: "greater_than", value: 500 }
      },
      createdAt: now()
    });

    expect(alert.toSnapshot()).toMatchObject({
      name: "High latency",
      state: "ok",
      condition: {
        metricName: "http_request_duration_ms",
        evaluationWindowSeconds: 3600
      }
    });
    expect(() =>
      AlertRule.create({
        id: "1488251f-87b2-457b-971f-d00886024571",
        name: "Bad alert",
        severity: "warning",
        condition: {
          filters: [],
          aggregation: "average",
          evaluationWindowSeconds: 3600,
          threshold: { operator: "greater_than", value: 1 }
        },
        createdAt: now()
      })
    ).toThrow(AlertDomainError);
  });

  it("records alert evaluations as immutable history", () => {
    const evaluation = AlertEvaluation.create({
      id: alertEvaluationId(),
      alertRuleId: alertRuleId(),
      previousState: "ok",
      state: "firing",
      observedValue: 600,
      thresholdSummary: "greater_than 500",
      message: "Observed value 600 breached threshold greater_than 500.",
      evaluatedAt: now(),
      createdAt: now()
    });

    expect(evaluation.toSnapshot()).toMatchObject({
      state: "firing",
      observedValue: 600
    });
  });
});

function alertRuleId(): string {
  return "50c1f531-f3d4-4f92-bab4-a83108e4b6bf";
}

function alertEvaluationId(): string {
  return "52141adf-70c0-4fb6-af0b-1ccb4f25d802";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
