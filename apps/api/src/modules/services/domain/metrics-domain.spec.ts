import { describe, expect, it } from "vitest";

import {
  MetricDefinition,
  MetricDomainError,
  MetricLabel,
  MetricQuery,
  MetricRetentionPolicy,
  MetricSample,
  MetricSeries
} from "./index";

describe("metrics domain", () => {
  it("normalizes metric definitions and enforces aggregation rules by type", () => {
    const metric = MetricDefinition.create({
      id: metricDefinitionId(),
      serviceId: serviceId(),
      name: "  HTTP_REQUESTS_TOTAL  ",
      displayName: " HTTP Requests Total ",
      type: "counter",
      unit: "requests",
      defaultAggregation: "rate",
      createdAt: now()
    });

    expect(metric.toSnapshot()).toMatchObject({
      name: "http_requests_total",
      displayName: "HTTP Requests Total",
      defaultAggregation: "rate"
    });
    expect(() =>
      MetricDefinition.create({
        id: "20a0eea8-bcd5-401b-8f33-6c66a5dadf08",
        serviceId: serviceId(),
        name: "latency_ms",
        displayName: "Latency",
        type: "counter",
        unit: "milliseconds",
        defaultAggregation: "percentile",
        createdAt: now()
      })
    ).toThrow(MetricDomainError);
  });

  it("protects metric series from duplicate and high-cardinality labels", () => {
    expect(
      MetricLabel.normalizeMany([
        { key: "method", value: "GET" },
        { key: "environment", value: "production" }
      ])
    ).toEqual([
      { key: "environment", value: "production" },
      { key: "method", value: "GET" }
    ]);
    expect(() =>
      MetricLabel.normalizeMany([
        { key: "method", value: "GET" },
        { key: "method", value: "POST" }
      ])
    ).toThrow(MetricDomainError);
    expect(() => MetricLabel.normalizeMany([{ key: "user_id", value: userId() }])).toThrow(
      MetricDomainError
    );
  });

  it("creates stable series hashes and records the latest sample timestamp", () => {
    const series = MetricSeries.create({
      id: metricSeriesId(),
      metricDefinitionId: metricDefinitionId(),
      serviceId: serviceId(),
      labels: [
        { key: "method", value: "GET" },
        { key: "environment", value: "production" }
      ],
      source: "  manual  ",
      createdAt: now()
    });

    series.recordSample(new Date("2026-08-11T10:05:00.000Z"));

    expect(series.toSnapshot()).toMatchObject({
      labelHash: "environment=production|method=GET",
      source: "manual",
      lastSampleAt: new Date("2026-08-11T10:05:00.000Z")
    });
  });

  it("validates sample values against metric semantics", () => {
    expect(() =>
      MetricSample.create({
        id: metricSampleId(),
        metricDefinition: metricDefinition({ unit: "percent" }).toSnapshot(),
        metricSeriesId: metricSeriesId(),
        timestamp: now(),
        value: 101,
        source: "manual",
        createdAt: now()
      })
    ).toThrow(MetricDomainError);
    expect(() =>
      MetricSample.create({
        id: "e13e1fe7-cd10-4994-9865-74309125c28a",
        metricDefinition: metricDefinition({ type: "counter", unit: "requests" }).toSnapshot(),
        metricSeriesId: metricSeriesId(),
        timestamp: now(),
        value: -1,
        source: "manual",
        createdAt: now()
      })
    ).toThrow(MetricDomainError);
  });

  it("validates metric queries and retention policies before persistence exists", () => {
    const query = MetricQuery.create({
      metricName: "http_request_duration_ms",
      startTime: new Date("2026-08-11T09:00:00.000Z"),
      endTime: now(),
      aggregation: "percentile",
      percentile: 95,
      groupBy: ["method"],
      limit: 100
    });
    const retention = MetricRetentionPolicy.create({
      id: retentionPolicyId(),
      name: "Default 30 days",
      retentionDays: 30,
      resolutionSeconds: 60,
      isDefault: true,
      createdAt: now(),
      updatedAt: now()
    });

    expect(query.toSnapshot()).toMatchObject({
      aggregation: "percentile",
      percentile: 95,
      groupBy: ["method"]
    });
    expect(retention.toSnapshot().retentionDays).toBe(30);
    expect(() =>
      MetricQuery.create({
        startTime: now(),
        endTime: new Date("2026-08-11T09:00:00.000Z"),
        aggregation: "average"
      })
    ).toThrow(MetricDomainError);
  });
});

function metricDefinition(
  overrides: Partial<Parameters<typeof MetricDefinition.create>[0]> = {}
): MetricDefinition {
  return MetricDefinition.create({
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    type: "gauge",
    unit: "percent",
    defaultAggregation: "average",
    createdAt: now(),
    ...overrides
  });
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function metricDefinitionId(): string {
  return "5148fb61-6c4c-4214-8546-837958ee8e5f";
}

function metricSeriesId(): string {
  return "adcefe75-fdf1-4c12-9055-891b371bfe94";
}

function metricSampleId(): string {
  return "b42d6651-2d75-4217-8375-6bd0188d7e86";
}

function retentionPolicyId(): string {
  return "74fcfc0c-d6d2-4e72-89c8-aeba56743d03";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
