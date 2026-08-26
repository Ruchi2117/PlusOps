import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import type { HealthCheckSnapshot, ServiceSnapshot } from "../../domain";
import { NetworkHealthCheckExecutor } from "./network-health-check.executor";

const servers: Array<ReturnType<typeof createServer>> = [];

describe("NetworkHealthCheckExecutor", () => {
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) => new Promise<void>((resolve) => server.close(() => resolve()))
      )
    );
  });

  it("executes an HTTP probe against the configured target", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(204);
      response.end();
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const executor = new NetworkHealthCheckExecutor(prisma(), config());

    const result = await executor.execute({
      healthCheck: check({ target: `http://127.0.0.1:${address.port}/ready` }),
      service: service()
    });

    expect(result.status).toBe("healthy");
    expect(result.message).toContain("HTTP 204");
    expect(result.responseTimeMs).toBeTypeOf("number");
  });

  it("reports an actual failed HTTP probe as unhealthy", async () => {
    const executor = new NetworkHealthCheckExecutor(prisma(), config());
    const result = await executor.execute({
      healthCheck: check({ target: "http://127.0.0.1:1/ready", timeoutMs: 200 }),
      service: service()
    });

    expect(result.status).toBe("unhealthy");
    expect(result.message).toContain("HTTP probe failed");
  });

  it("uses a real Prisma readiness query for database checks", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ result: 1 }]);
    const executor = new NetworkHealthCheckExecutor(prisma(queryRaw), config());

    const result = await executor.execute({
      healthCheck: check({ type: "database", target: null }),
      service: service()
    });

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "healthy",
      message: "PostgreSQL accepted a readiness query."
    });
  });

  it("returns unknown for an unconfigured cache probe instead of simulating success", async () => {
    const executor = new NetworkHealthCheckExecutor(prisma(), config());
    const result = await executor.execute({
      healthCheck: check({ type: "cache", target: null }),
      service: service()
    });

    expect(result.status).toBe("unknown");
    expect(result.message).toContain("No cache probe is configured");
  });

  it("refuses outbound probes to hosts outside the configured allowlist", async () => {
    const executor = new NetworkHealthCheckExecutor(prisma(), config("localhost"));
    const result = await executor.execute({
      healthCheck: check({ target: "https://metadata.example.test/ready" }),
      service: service()
    });

    expect(result).toMatchObject({
      status: "unknown",
      message: "Health check target is not in HEALTH_CHECK_ALLOWED_HOSTS."
    });
  });
});

function config(allowedHosts = "localhost,127.0.0.1"): ConfigService {
  return new ConfigService({ HEALTH_CHECK_ALLOWED_HOSTS: allowedHosts });
}

function prisma(queryRaw = vi.fn()): PrismaService {
  return {
    $queryRaw: queryRaw,
    service: { findFirst: vi.fn() }
  } as unknown as PrismaService;
}

function check(overrides: Partial<HealthCheckSnapshot> = {}): HealthCheckSnapshot {
  const now = new Date("2026-08-25T00:00:00.000Z");
  return {
    id: "check-1",
    serviceId: "service-1",
    name: "Readiness",
    type: "http_endpoint",
    target: "https://example.test/ready",
    description: null,
    isCritical: true,
    isEnabled: true,
    intervalSeconds: 60,
    timeoutMs: 1000,
    staleAfterSeconds: 300,
    configuration: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides
  };
}

function service(): ServiceSnapshot {
  const now = new Date("2026-08-25T00:00:00.000Z");
  return {
    id: "service-1",
    name: "Payments API",
    slug: "payments-api",
    description: null,
    ownerTeamId: "team-1",
    tier: 1,
    lifecycleStatus: "active",
    visibility: "internal",
    repositoryUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    apiBaseUrl: "https://payments.example.test",
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}
