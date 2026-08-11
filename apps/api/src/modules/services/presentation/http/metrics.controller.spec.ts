import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  ArchiveMetricDefinitionUseCase,
  CreateMetricDefinitionUseCase,
  GetMetricDefinitionUseCase,
  ListMetricsUseCase,
  QueryMetricsUseCase,
  SubmitMetricSampleUseCase,
  UpdateMetricDefinitionUseCase
} from "../../application/use-cases";
import { MetricsController } from "./metrics.controller";

describe("MetricsController", () => {
  it("delegates metric lifecycle endpoints to use cases", async () => {
    const {
      controller,
      listMetricsUseCase,
      getMetricDefinitionUseCase,
      createMetricDefinitionUseCase,
      updateMetricDefinitionUseCase,
      archiveMetricDefinitionUseCase
    } = createController();

    await controller.list({ page: 2, includeDeleted: false }, actor());
    await controller.get(metricDefinitionId(), actor());
    await controller.create(createPayload(), actor());
    await controller.update(metricDefinitionId(), { displayName: "Success Rate" }, actor());
    await controller.archive(metricDefinitionId(), actor());

    expect(listMetricsUseCase.execute).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      includeDeleted: false,
      sortBy: "name",
      sortDirection: "asc",
      actor: actor()
    });
    expect(getMetricDefinitionUseCase.execute).toHaveBeenCalledWith({
      metricDefinitionId: metricDefinitionId(),
      actor: actor()
    });
    expect(createMetricDefinitionUseCase.execute).toHaveBeenCalledWith({
      ...createPayload(),
      actor: actor()
    });
    expect(updateMetricDefinitionUseCase.execute).toHaveBeenCalledWith({
      metricDefinitionId: metricDefinitionId(),
      displayName: "Success Rate",
      actor: actor()
    });
    expect(archiveMetricDefinitionUseCase.execute).toHaveBeenCalledWith({
      metricDefinitionId: metricDefinitionId(),
      actor: actor()
    });
  });

  it("delegates query and sample submission without domain logic", async () => {
    const { controller, queryMetricsUseCase, submitMetricSampleUseCase } = createController();

    await controller.query(
      {
        metricName: "request_success_rate",
        startTime: "2026-08-11T09:00:00.000Z",
        endTime: nowIso()
      },
      actor()
    );
    await controller.submitSample(
      metricDefinitionId(),
      {
        value: 99.9,
        labels: [{ key: "environment", value: "production" }]
      },
      actor()
    );

    expect(queryMetricsUseCase.execute).toHaveBeenCalledWith({
      metricName: "request_success_rate",
      metricDefinitionId: undefined,
      serviceId: undefined,
      startTime: "2026-08-11T09:00:00.000Z",
      endTime: nowIso(),
      filters: [],
      groupBy: [],
      aggregation: "average",
      percentile: undefined,
      page: 1,
      pageSize: 100,
      sortBy: "timestamp",
      sortDirection: "asc",
      limit: 100,
      actor: actor()
    });
    expect(submitMetricSampleUseCase.execute).toHaveBeenCalledWith({
      metricDefinitionId: metricDefinitionId(),
      timestamp: undefined,
      value: 99.9,
      labels: [{ key: "environment", value: "production" }],
      source: "manual",
      retentionPolicyId: undefined,
      actor: actor()
    });
  });
});

function createController() {
  const listMetricsUseCase = {
    execute: vi.fn(async () => ({
      data: [metricResponse()],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
    }))
  };
  const getMetricDefinitionUseCase = {
    execute: vi.fn(async () => metricResponse())
  };
  const createMetricDefinitionUseCase = {
    execute: vi.fn(async () => metricResponse())
  };
  const updateMetricDefinitionUseCase = {
    execute: vi.fn(async () => metricResponse())
  };
  const archiveMetricDefinitionUseCase = {
    execute: vi.fn(async () => undefined)
  };
  const queryMetricsUseCase = {
    execute: vi.fn(async () => ({
      query: {
        metricName: "request_success_rate",
        metricDefinitionId: null,
        serviceId: null,
        startTime: "2026-08-11T09:00:00.000Z",
        endTime: nowIso(),
        filters: [],
        groupBy: [],
        aggregation: "average",
        percentile: null,
        page: 1,
        pageSize: 100,
        sortBy: "timestamp",
        sortDirection: "asc",
        limit: 100
      },
      points: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      simulated: false
    }))
  };
  const submitMetricSampleUseCase = {
    execute: vi.fn(async () => sampleResponse())
  };

  return {
    controller: new MetricsController(
      listMetricsUseCase as unknown as ListMetricsUseCase,
      getMetricDefinitionUseCase as unknown as GetMetricDefinitionUseCase,
      createMetricDefinitionUseCase as unknown as CreateMetricDefinitionUseCase,
      updateMetricDefinitionUseCase as unknown as UpdateMetricDefinitionUseCase,
      archiveMetricDefinitionUseCase as unknown as ArchiveMetricDefinitionUseCase,
      queryMetricsUseCase as unknown as QueryMetricsUseCase,
      submitMetricSampleUseCase as unknown as SubmitMetricSampleUseCase
    ),
    listMetricsUseCase,
    getMetricDefinitionUseCase,
    createMetricDefinitionUseCase,
    updateMetricDefinitionUseCase,
    archiveMetricDefinitionUseCase,
    queryMetricsUseCase,
    submitMetricSampleUseCase
  };
}

function createPayload() {
  return {
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    type: "gauge" as const,
    unit: "percent" as const,
    defaultAggregation: "average" as const
  };
}

function metricResponse() {
  return {
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    description: null,
    type: "gauge" as const,
    unit: "percent" as const,
    customUnit: null,
    defaultAggregation: "average" as const,
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };
}

function sampleResponse() {
  return {
    id: "b42d6651-2d75-4217-8375-6bd0188d7e86",
    metricDefinitionId: metricDefinitionId(),
    metricSeriesId: "adcefe75-fdf1-4c12-9055-891b371bfe94",
    serviceId: serviceId(),
    timestamp: nowIso(),
    value: 99.9,
    labels: [{ key: "environment", value: "production" }],
    source: "manual",
    retentionPolicyId: null,
    createdAt: nowIso()
  };
}

function actor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "manager@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["engineering_manager"],
    permissions: ["metrics:view", "metrics:submit", "metrics:manage"]
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function metricDefinitionId(): string {
  return "5148fb61-6c4c-4214-8546-837958ee8e5f";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function nowIso(): string {
  return "2026-08-11T10:00:00.000Z";
}
