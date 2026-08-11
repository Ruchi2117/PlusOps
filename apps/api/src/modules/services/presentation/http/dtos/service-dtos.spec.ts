import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import {
  CreateHealthCheckDto,
  CreateAlertRuleDto,
  CreateMetricDefinitionDto,
  CreateServiceDto,
  HealthHistoryQueryDto,
  ListAlertsQueryDto,
  ListMetricsQueryDto,
  ListServicesQueryDto,
  QueryMetricsDto,
  RegisterServiceDependencyDto,
  RunHealthCheckDto,
  SubmitMetricSampleDto,
  UpdateAlertRuleDto,
  UpdateHealthCheckDto
} from "./index";

describe("Service HTTP DTOs", () => {
  it("accepts and normalizes a valid create service payload", async () => {
    const dto = plainToInstance(CreateServiceDto, {
      name: "  Payments API  ",
      slug: "Payments-API",
      description: "  Owns payment authorization.  ",
      ownerTeamId: teamId(),
      repositoryUrl: " https://github.com/plusops/payments-api ",
      lifecycleStatus: "active",
      visibility: "internal",
      tier: 2,
      environmentIds: [environmentId()]
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe("Payments API");
    expect(dto.slug).toBe("payments-api");
    expect(dto.description).toBe("Owns payment authorization.");
  });

  it("rejects invalid service creation payloads", async () => {
    const dto = plainToInstance(CreateServiceDto, {
      name: "P",
      slug: "Payments API!",
      ownerTeamId: "not-a-uuid",
      repositoryUrl: "not-a-url",
      lifecycleStatus: "unknown",
      tier: 7
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "ownerTeamId",
        "repositoryUrl",
        "lifecycleStatus",
        "tier"
      ])
    );
  });

  it("parses includeDeleted=false as false instead of truthy", async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      includeDeleted: "false"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.includeDeleted).toBe(false);
  });

  it("rejects invalid list filters", async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      ownerTeamId: "not-a-uuid",
      lifecycleStatus: "retired",
      includeDeleted: "sometimes",
      sortBy: "owner",
      sortDirection: "sideways"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "ownerTeamId",
        "lifecycleStatus",
        "includeDeleted",
        "sortBy",
        "sortDirection"
      ])
    );
  });

  it("validates dependency registration payloads", async () => {
    const validDto = plainToInstance(RegisterServiceDependencyDto, {
      downstreamServiceId: serviceId(),
      description: "  Payments API calls Identity API.  "
    });
    const invalidDto = plainToInstance(RegisterServiceDependencyDto, {
      downstreamServiceId: "not-a-uuid",
      description: "x".repeat(501)
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.description).toBe("Payments API calls Identity API.");

    const errors = await validate(invalidDto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["downstreamServiceId", "description"])
    );
  });

  it("accepts and normalizes health check configuration payloads", async () => {
    const dto = plainToInstance(CreateHealthCheckDto, {
      name: "  Readiness  ",
      type: "http_endpoint",
      target: " https://api.plusops.dev/ready ",
      isCritical: true,
      intervalSeconds: 60,
      timeoutMs: 5000,
      configuration: { method: "GET" }
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe("Readiness");
    expect(dto.target).toBe("https://api.plusops.dev/ready");
  });

  it("rejects invalid health check payloads", async () => {
    const dto = plainToInstance(CreateHealthCheckDto, {
      name: "R",
      type: "icmp",
      intervalSeconds: 5,
      timeoutMs: 50,
      configuration: ["not", "an", "object"]
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["name", "type", "intervalSeconds", "timeoutMs", "configuration"])
    );
  });

  it("allows nullable health check fields during updates", async () => {
    const dto = plainToInstance(UpdateHealthCheckDto, {
      target: null,
      description: null,
      configuration: null
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.target).toBeNull();
  });

  it("validates simulated health check runs and history pagination", async () => {
    const runDto = plainToInstance(RunHealthCheckDto, {
      status: "unhealthy",
      responseTimeMs: 1200,
      message: "  HTTP 500  "
    });
    const historyDto = plainToInstance(HealthHistoryQueryDto, {
      page: "2",
      pageSize: "10"
    });

    await expect(validate(runDto)).resolves.toHaveLength(0);
    await expect(validate(historyDto)).resolves.toHaveLength(0);
    expect(runDto.message).toBe("HTTP 500");
    expect(historyDto.page).toBe(2);
    expect(historyDto.pageSize).toBe(10);

    const invalidRunDto = plainToInstance(RunHealthCheckDto, {
      status: "sideways",
      responseTimeMs: 700_000
    });
    const invalidRunErrors = await validate(invalidRunDto);

    expect(invalidRunErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "responseTimeMs"])
    );
  });

  it("validates metric definitions and normalizes metric names", async () => {
    const dto = plainToInstance(CreateMetricDefinitionDto, {
      serviceId: serviceId(),
      name: " HTTP_REQUESTS_TOTAL ",
      displayName: " HTTP Requests Total ",
      type: "counter",
      unit: "requests",
      defaultAggregation: "rate"
    });
    const invalidDto = plainToInstance(CreateMetricDefinitionDto, {
      serviceId: "not-a-uuid",
      name: "HTTP Requests!",
      displayName: "x",
      type: "timer",
      unit: "widgets",
      defaultAggregation: "sideways"
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe("http_requests_total");
    expect(dto.displayName).toBe("HTTP Requests Total");

    const errors = await validate(invalidDto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "serviceId",
        "name",
        "displayName",
        "type",
        "unit",
        "defaultAggregation"
      ])
    );
  });

  it("parses metric includeDeleted=false as false instead of truthy", async () => {
    const dto = plainToInstance(ListMetricsQueryDto, {
      includeDeleted: "false",
      page: "2",
      pageSize: "10"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.includeDeleted).toBe(false);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(10);
  });

  it("validates metric sample submission and query payloads", async () => {
    const sampleDto = plainToInstance(SubmitMetricSampleDto, {
      value: 99.9,
      labels: [{ key: " Environment ", value: " production " }]
    });
    const queryDto = plainToInstance(QueryMetricsDto, {
      metricName: " Request_Success_Rate ",
      startTime: "2026-08-11T09:00:00.000Z",
      endTime: "2026-08-11T10:00:00.000Z",
      filters: [{ key: "method", value: "GET" }],
      groupBy: ["environment"],
      aggregation: "average",
      limit: 100
    });
    const invalidSampleDto = plainToInstance(SubmitMetricSampleDto, {
      value: "not-a-number",
      labels: [{ key: "bad-label!", value: "" }]
    });

    await expect(validate(sampleDto)).resolves.toHaveLength(0);
    await expect(validate(queryDto)).resolves.toHaveLength(0);
    expect(sampleDto.labels?.[0]).toEqual({
      key: "environment",
      value: "production"
    });
    expect(queryDto.metricName).toBe("request_success_rate");

    const errors = await validate(invalidSampleDto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["value", "labels"])
    );
  });

  it("validates alert rules and transforms numeric condition fields", async () => {
    const dto = plainToInstance(CreateAlertRuleDto, {
      name: " High latency ",
      severity: "critical",
      condition: {
        metricName: " HTTP_REQUEST_DURATION_MS ",
        serviceId: serviceId(),
        filters: [{ key: " Environment ", value: " production " }],
        aggregation: "percentile",
        percentile: "95",
        evaluationWindowSeconds: "300",
        threshold: { operator: "greater_than", value: "500" }
      }
    });
    const invalidDto = plainToInstance(CreateAlertRuleDto, {
      name: "x",
      severity: "severe",
      condition: {
        metricName: "Bad Metric!",
        aggregation: "sideways",
        threshold: { operator: "near", value: "fast" }
      }
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe("High latency");
    expect(dto.condition.metricName).toBe("http_request_duration_ms");
    expect(dto.condition.percentile).toBe(95);
    expect(dto.condition.evaluationWindowSeconds).toBe(300);
    expect(dto.condition.threshold.value).toBe(500);

    const errors = await validate(invalidDto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["name", "severity", "condition"])
    );
  });

  it("parses alert includeDeleted=false as false and allows nullable update fields", async () => {
    const listDto = plainToInstance(ListAlertsQueryDto, {
      includeDeleted: "false",
      page: "2",
      pageSize: "10"
    });
    const updateDto = plainToInstance(UpdateAlertRuleDto, {
      description: null,
      mutedUntil: null
    });

    await expect(validate(listDto)).resolves.toHaveLength(0);
    await expect(validate(updateDto)).resolves.toHaveLength(0);
    expect(listDto.includeDeleted).toBe(false);
    expect(listDto.page).toBe(2);
    expect(updateDto.description).toBeNull();
  });
});

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function environmentId(): string {
  return "e67bd8c4-1cb5-4070-89f9-585854cce7ac";
}
