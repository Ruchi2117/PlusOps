import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Environment } from "../../../config/environment";
import { MetricsService } from "../../observability/metrics.service";
import type { RateLimitStorePort, RateLimitStoreResult } from "../../reliability/application/ports/rate-limit-store.port";
import { RATE_LIMIT_STORE } from "../../reliability/reliability.tokens";

export type AIRateLimitDecision = RateLimitStoreResult & {
  limit: number;
  degraded: boolean;
};

@Injectable()
export class AIRateLimiter {
  constructor(
    @Inject(RATE_LIMIT_STORE)
    private readonly store: RateLimitStorePort,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
    @Inject(MetricsService)
    private readonly metrics: MetricsService
  ) {}

  async consume(input: { actorUserId: string; route: string }): Promise<AIRateLimitDecision> {
    const limit = this.config.get("AI_RATE_LIMIT_MAX_REQUESTS", { infer: true });
    const windowSeconds = this.config.get("AI_RATE_LIMIT_WINDOW_SECONDS", { infer: true });

    try {
      const result = await this.store.consume({
        key: `plusops:rate-limit:ai:${input.actorUserId}:${input.route}`,
        limit,
        windowSeconds
      });
      this.metrics.observeAIRateLimit({
        route: input.route,
        outcome: result.allowed ? "allowed" : "blocked"
      });
      this.metrics.setRedisAvailability(true);

      return { ...result, limit, degraded: false };
    } catch {
      this.metrics.observeAIRateLimit({ route: input.route, outcome: "fail_open" });
      this.metrics.setRedisAvailability(false);

      return {
        allowed: true,
        remaining: limit,
        retryAfterSeconds: 0,
        limit,
        degraded: true
      };
    }
  }
}
