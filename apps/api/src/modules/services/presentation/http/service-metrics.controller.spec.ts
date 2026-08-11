import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type { ListServiceMetricsUseCase } from "../../application/use-cases";
import { ServiceMetricsController } from "./service-metrics.controller";

describe("ServiceMetricsController", () => {
  it("delegates service metric listing to the use case", async () => {
    const listServiceMetricsUseCase = {
      execute: vi.fn(async () => ({
        serviceId: serviceId(),
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
      }))
    };
    const controller = new ServiceMetricsController(
      listServiceMetricsUseCase as unknown as ListServiceMetricsUseCase
    );

    await controller.list(
      serviceId(),
      { pageSize: 10, type: "counter", includeDeleted: false },
      actor()
    );

    expect(listServiceMetricsUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      page: 1,
      pageSize: 10,
      type: "counter",
      includeDeleted: false,
      sortBy: "name",
      sortDirection: "asc",
      actor: actor()
    });
  });
});

function actor(): AuthenticatedUser {
  return {
    id: "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff",
    email: "viewer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["viewer"],
    permissions: ["metrics:view"]
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}
