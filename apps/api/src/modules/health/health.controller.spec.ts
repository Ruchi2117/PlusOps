import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../common/prisma/prisma.service";
import type { MetricsService } from "../observability/metrics.service";
import type { RateLimitStorePort } from "../reliability/application/ports/rate-limit-store.port";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports PostgreSQL as required and Redis as an available optional dependency", async () => {
    const controller = new HealthController(
      prisma(),
      rateLimitStore("available"),
      metrics()
    );

    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: "ok",
      dependencies: {
        postgresql: { status: "ok", required: true },
        redis: { status: "ok", required: false }
      }
    });
  });

  it("reports degraded readiness without failing when optional Redis is unavailable", async () => {
    const controller = new HealthController(
      prisma(),
      rateLimitStore("unavailable"),
      metrics()
    );

    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: "degraded",
      dependencies: { redis: { status: "degraded", required: false } }
    });
  });

  it("still fails readiness when required PostgreSQL is unavailable", async () => {
    const controller = new HealthController(
      prisma(new Error("database unavailable")),
      rateLimitStore("available"),
      metrics()
    );

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function prisma(error?: Error): PrismaService {
  return {
    $queryRaw: error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue([{ "?column?": 1 }])
  } as unknown as PrismaService;
}

function rateLimitStore(status: "available" | "unavailable"): RateLimitStorePort {
  return {
    consume: vi.fn(),
    checkHealth: vi.fn().mockResolvedValue({
      status,
      message: status === "available" ? "Redis is reachable." : "Redis is unavailable."
    })
  };
}

function metrics(): MetricsService {
  return { setRedisAvailability: vi.fn() } as unknown as MetricsService;
}
