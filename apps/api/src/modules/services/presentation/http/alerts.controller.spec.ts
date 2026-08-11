import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  ArchiveAlertRuleUseCase,
  CreateAlertRuleUseCase,
  EvaluateAlertRuleUseCase,
  GetAlertRuleUseCase,
  ListAlertRulesUseCase,
  UpdateAlertRuleUseCase
} from "../../application/use-cases";
import { AlertsController } from "./alerts.controller";

describe("AlertsController", () => {
  it("delegates alert lifecycle endpoints to use cases", async () => {
    const {
      controller,
      listAlertRulesUseCase,
      getAlertRuleUseCase,
      createAlertRuleUseCase,
      updateAlertRuleUseCase,
      archiveAlertRuleUseCase,
      evaluateAlertRuleUseCase
    } = createController();

    await controller.list({ page: 2, includeDeleted: false }, actor());
    await controller.get(alertRuleId(), actor());
    await controller.create(createPayload(), actor());
    await controller.update(alertRuleId(), { severity: "warning" }, actor());
    await controller.archive(alertRuleId(), actor());
    await controller.evaluate(alertRuleId(), actor());

    expect(listAlertRulesUseCase.execute).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      search: undefined,
      state: undefined,
      severity: undefined,
      serviceId: undefined,
      includeDeleted: false,
      actor: actor()
    });
    expect(getAlertRuleUseCase.execute).toHaveBeenCalledWith({
      alertRuleId: alertRuleId(),
      actor: actor()
    });
    expect(createAlertRuleUseCase.execute).toHaveBeenCalledWith({
      ...createPayload(),
      condition: expect.objectContaining({
        filters: [{ key: "environment", value: "production" }],
        aggregation: "average",
        evaluationWindowSeconds: 3600
      }),
      actor: actor()
    });
    expect(updateAlertRuleUseCase.execute).toHaveBeenCalledWith({
      alertRuleId: alertRuleId(),
      severity: "warning",
      actor: actor()
    });
    expect(archiveAlertRuleUseCase.execute).toHaveBeenCalledWith({
      alertRuleId: alertRuleId(),
      actor: actor()
    });
    expect(evaluateAlertRuleUseCase.execute).toHaveBeenCalledWith({
      alertRuleId: alertRuleId(),
      actor: actor()
    });
  });
});

function createController() {
  const listAlertRulesUseCase = {
    execute: vi.fn(async () => ({
      data: [alertResponse()],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
    }))
  };
  const getAlertRuleUseCase = {
    execute: vi.fn(async () => ({ alert: alertResponse() }))
  };
  const createAlertRuleUseCase = {
    execute: vi.fn(async () => ({ alert: alertResponse() }))
  };
  const updateAlertRuleUseCase = {
    execute: vi.fn(async () => ({ alert: alertResponse() }))
  };
  const archiveAlertRuleUseCase = {
    execute: vi.fn(async () => undefined)
  };
  const evaluateAlertRuleUseCase = {
    execute: vi.fn(async () => ({
      alert: alertResponse(),
      evaluation: {
        id: "52141adf-70c0-4fb6-af0b-1ccb4f25d802",
        alertRuleId: alertRuleId(),
        previousState: "ok" as const,
        state: "firing" as const,
        observedValue: 650,
        thresholdSummary: "greater_than 500",
        message: "Observed value 650 breached threshold greater_than 500.",
        evaluatedAt: nowIso(),
        createdAt: nowIso()
      }
    }))
  };

  return {
    controller: new AlertsController(
      listAlertRulesUseCase as unknown as ListAlertRulesUseCase,
      getAlertRuleUseCase as unknown as GetAlertRuleUseCase,
      createAlertRuleUseCase as unknown as CreateAlertRuleUseCase,
      updateAlertRuleUseCase as unknown as UpdateAlertRuleUseCase,
      archiveAlertRuleUseCase as unknown as ArchiveAlertRuleUseCase,
      evaluateAlertRuleUseCase as unknown as EvaluateAlertRuleUseCase
    ),
    listAlertRulesUseCase,
    getAlertRuleUseCase,
    createAlertRuleUseCase,
    updateAlertRuleUseCase,
    archiveAlertRuleUseCase,
    evaluateAlertRuleUseCase
  };
}

function createPayload() {
  return {
    name: "High latency",
    severity: "critical" as const,
    condition: {
      metricName: "http_request_duration_ms",
      serviceId: serviceId(),
      filters: [{ key: "environment", value: "production" }],
      threshold: { operator: "greater_than" as const, value: 500 }
    }
  };
}

function alertResponse() {
  return {
    id: alertRuleId(),
    name: "High latency",
    description: null,
    severity: "critical" as const,
    state: "ok" as const,
    condition: {
      metricName: "http_request_duration_ms",
      metricDefinitionId: undefined,
      serviceId: serviceId(),
      filters: [{ key: "environment", value: "production" }],
      aggregation: "average" as const,
      percentile: undefined,
      evaluationWindowSeconds: 3600,
      threshold: { operator: "greater_than" as const, value: 500 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };
}

function actor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "manager@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["engineering_manager"],
    permissions: ["alerts:view", "alerts:evaluate", "alerts:manage"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function alertRuleId(): string {
  return "50c1f531-f3d4-4f92-bab4-a83108e4b6bf";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function nowIso(): string {
  return "2026-08-12T10:00:00.000Z";
}
