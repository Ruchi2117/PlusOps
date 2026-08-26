import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type Redis from "ioredis";

import type {
  OptionalDependencyHealth,
  RateLimitStorePort,
  RateLimitStoreResult
} from "../../application/ports/rate-limit-store.port";
import { RateLimitStoreUnavailableError } from "../../application/ports/rate-limit-store.port";
import { REDIS_CLIENT } from "../../reliability.tokens";

const CONSUME_FIXED_WINDOW_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return { count, ttl }
`;

@Injectable()
export class RedisRateLimitStore implements RateLimitStorePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRateLimitStore.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  async onModuleInit(): Promise<void> {
    const health = await this.checkHealth();
    if (health.status === "unavailable") {
      this.logger.warn(`${health.message} AI rate limiting will fail open.`);
    }
  }

  async consume(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<RateLimitStoreResult> {
    const client = await this.connectedClient();

    try {
      const result = await client.eval(
        CONSUME_FIXED_WINDOW_SCRIPT,
        1,
        input.key,
        String(input.windowSeconds)
      );
      const [rawCount, rawTtl] = parseRedisTuple(result);
      const count = Number(rawCount);
      const ttl = Math.max(1, Number(rawTtl));

      if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
        throw new Error("Redis returned an invalid rate-limit result.");
      }

      return {
        allowed: count <= input.limit,
        remaining: Math.max(0, input.limit - count),
        retryAfterSeconds: count > input.limit ? ttl : 0
      };
    } catch (error) {
      throw new RateLimitStoreUnavailableError("Redis rate-limit operation failed.", {
        cause: error
      });
    }
  }

  async checkHealth(): Promise<OptionalDependencyHealth> {
    if (!this.client) {
      return {
        status: "disabled",
        message: "Redis is not configured; optional distributed rate limiting is disabled."
      };
    }

    try {
      const client = await this.connectedClient();
      const response = await client.ping();
      if (response !== "PONG") {
        throw new Error(`Unexpected Redis PING response: ${response}`);
      }
      return { status: "available", message: "Redis is reachable." };
    } catch {
      return {
        status: "unavailable",
        message: "Redis is configured but unavailable; optional rate limiting is degraded."
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    if (this.client.status === "ready") {
      await this.client.quit().catch(() => this.client?.disconnect());
      return;
    }
    this.client.disconnect();
  }

  private async connectedClient(): Promise<Redis> {
    if (!this.client) {
      throw new RateLimitStoreUnavailableError("Redis is not configured.");
    }

    if (this.client.status === "wait" || this.client.status === "end") {
      try {
        await this.client.connect();
      } catch (error) {
        throw new RateLimitStoreUnavailableError("Redis connection failed.", { cause: error });
      }
    }

    if (this.client.status !== "ready") {
      throw new RateLimitStoreUnavailableError(
        `Redis is not ready (current state: ${this.client.status}).`
      );
    }

    return this.client;
  }
}

function parseRedisTuple(value: unknown): [unknown, unknown] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("Redis returned an invalid rate-limit tuple.");
  }
  return [value[0], value[1]];
}
