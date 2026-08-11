import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { HealthResultRepositoryPort } from "../../application/ports";
import type { HealthCheckResult } from "../../domain";
import {
  mapHealthCheckResult,
  toPrismaHealthResultCreate
} from "./health-prisma.mappers";

@Injectable()
export class PrismaHealthResultRepository implements HealthResultRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(result: HealthCheckResult): Promise<void> {
    await this.prisma.healthCheckResult.create({
      data: toPrismaHealthResultCreate(result.toSnapshot())
    });
  }

  async findLatestByCheckId(healthCheckId: string): Promise<HealthCheckResult | null> {
    const result = await this.prisma.healthCheckResult.findFirst({
      where: { healthCheckId },
      orderBy: { checkedAt: "desc" }
    });

    return result ? mapHealthCheckResult(result) : null;
  }

  async findLatestByCheckIds(healthCheckIds: string[]): Promise<HealthCheckResult[]> {
    if (healthCheckIds.length === 0) {
      return [];
    }

    const results = await this.prisma.healthCheckResult.findMany({
      where: {
        healthCheckId: {
          in: healthCheckIds
        }
      },
      orderBy: { checkedAt: "desc" }
    });
    const latestByCheckId = new Map<string, HealthCheckResult>();

    for (const result of results) {
      if (!latestByCheckId.has(result.healthCheckId)) {
        latestByCheckId.set(result.healthCheckId, mapHealthCheckResult(result));
      }
    }

    return [...latestByCheckId.values()];
  }
}
