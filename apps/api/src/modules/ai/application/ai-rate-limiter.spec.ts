import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "../../../config/environment";
import { MetricsService } from "../../observability/metrics.service";
import type { RateLimitStorePort } from "../../reliability/application/ports/rate-limit-store.port";
import { AIRateLimiter } from "./ai-rate-limiter";

describe("AIRateLimiter", () => {
  let metrics: MetricsService | undefined;

  afterEach(() => {
    metrics?.onModuleDestroy();
    metrics = undefined;
  });

  it("uses the configured distributed limit", async () => {
    const store = rateLimitStore({ allowed: false, remaining: 0, retryAfterSeconds: 12 });
    metrics = new MetricsService();
    const limiter = new AIRateLimiter(store, config(), metrics);

    await expect(
      limiter.consume({ actorUserId: "user-1", route: "AIController.chat" })
    ).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 12,
      limit: 2,
      degraded: false
    });
    expect(store.consume).toHaveBeenCalledWith({
      key: "plusops:rate-limit:ai:user-1:AIController.chat",
      limit: 2,
      windowSeconds: 60
    });
  });

  it("fails open and records degraded behavior when optional Redis is unavailable", async () => {
    const store = rateLimitStore(new Error("Redis unavailable"));
    metrics = new MetricsService();
    const limiter = new AIRateLimiter(store, config(), metrics);

    await expect(
      limiter.consume({ actorUserId: "user-1", route: "AIController.chat" })
    ).resolves.toMatchObject({ allowed: true, degraded: true, limit: 2 });

    const output = await metrics.render();
    expect(output).toContain('outcome="fail_open"');
    expect(output).toContain("plusops_redis_available 0");
  });
});

function config(): ConfigService<Environment, true> {
  return new ConfigService({
    AI_RATE_LIMIT_MAX_REQUESTS: 2,
    AI_RATE_LIMIT_WINDOW_SECONDS: 60
  }) as ConfigService<Environment, true>;
}

function rateLimitStore(
  result: Awaited<ReturnType<RateLimitStorePort["consume"]>> | Error
): RateLimitStorePort {
  return {
    consume:
      result instanceof Error
        ? vi.fn().mockRejectedValue(result)
        : vi.fn().mockResolvedValue(result),
    checkHealth: vi.fn().mockResolvedValue({ status: "available", message: "Redis is reachable." })
  };
}
