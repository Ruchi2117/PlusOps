import type Redis from "ioredis";
import { describe, expect, it, vi } from "vitest";

import { RateLimitStoreUnavailableError } from "../../application/ports/rate-limit-store.port";
import { RedisRateLimitStore } from "./redis-rate-limit-store";

describe("RedisRateLimitStore", () => {
  it("atomically consumes a fixed-window allowance", async () => {
    const client = redisClient({ evalResult: [2, 47] });
    const store = new RedisRateLimitStore(client.value);

    await expect(
      store.consume({ key: "plusops:rate-limit:ai:user:chat", limit: 3, windowSeconds: 60 })
    ).resolves.toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("INCR", KEYS[1])'),
      1,
      "plusops:rate-limit:ai:user:chat",
      "60"
    );
  });

  it("rejects requests beyond the limit and returns the Redis TTL", async () => {
    const client = redisClient({ evalResult: [4, 31] });
    const store = new RedisRateLimitStore(client.value);

    await expect(
      store.consume({ key: "key", limit: 3, windowSeconds: 60 })
    ).resolves.toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 31 });
  });

  it("reports disabled when no Redis URL configured a client", async () => {
    const store = new RedisRateLimitStore(null);

    await expect(store.checkHealth()).resolves.toEqual({
      status: "disabled",
      message: "Redis is not configured; optional distributed rate limiting is disabled."
    });
  });

  it("wraps Redis command failures without leaking client errors", async () => {
    const client = redisClient({ evalError: new Error("connection refused") });
    const store = new RedisRateLimitStore(client.value);

    await expect(store.consume({ key: "key", limit: 3, windowSeconds: 60 })).rejects.toBeInstanceOf(
      RateLimitStoreUnavailableError
    );
  });
});

function redisClient(options: { evalResult?: unknown; evalError?: Error }) {
  const evalCommand = options.evalError
    ? vi.fn().mockRejectedValue(options.evalError)
    : vi.fn().mockResolvedValue(options.evalResult);
  const client = {
    status: "ready",
    connect: vi.fn(),
    eval: evalCommand,
    ping: vi.fn().mockResolvedValue("PONG"),
    quit: vi.fn().mockResolvedValue("OK"),
    disconnect: vi.fn()
  };
  return { value: client as unknown as Redis, eval: evalCommand };
}
