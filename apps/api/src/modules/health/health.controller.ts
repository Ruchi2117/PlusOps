import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@plusops/contracts";

import { PrismaService } from "../../common/prisma/prisma.service";
import { MetricsService } from "../observability/metrics.service";
import type { RateLimitStorePort } from "../reliability/application/ports/rate-limit-store.port";
import { RATE_LIMIT_STORE } from "../reliability/reliability.tokens";

@ApiTags("Health")
@Controller({
  path: "health",
  version: "1"
})
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RATE_LIMIT_STORE) private readonly rateLimitStore: RateLimitStorePort,
    @Inject(MetricsService) private readonly metrics: MetricsService
  ) {}

  @Get()
  @ApiOkResponse({ description: "Service health status" })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "plusops-api",
      version: "0.1.0",
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  @ApiOkResponse({ description: "API and PostgreSQL readiness status" })
  async getReadiness(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const redis = await this.rateLimitStore.checkHealth();
      const redisAvailable = redis.status === "available";
      this.metrics.setRedisAvailability(redisAvailable);

      return {
        status: redis.status === "unavailable" ? "degraded" : "ok",
        service: "plusops-api",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        dependencies: {
          postgresql: {
            status: "ok",
            required: true,
            message: "PostgreSQL is reachable."
          },
          redis: {
            status:
              redis.status === "available"
                ? "ok"
                : redis.status === "disabled"
                  ? "disabled"
                  : "degraded",
            required: false,
            message: redis.message
          }
        }
      };
    } catch {
      throw new ServiceUnavailableException("PostgreSQL is not ready.");
    }
  }
}
