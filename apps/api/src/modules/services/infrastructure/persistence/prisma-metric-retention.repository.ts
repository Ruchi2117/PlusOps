import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { MetricRetentionRepositoryPort } from "../../application/ports";
import type { MetricRetentionPolicy } from "../../domain";
import { mapMetricRetentionPolicy } from "./metric-prisma.mappers";

@Injectable()
export class PrismaMetricRetentionRepository implements MetricRetentionRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async findById(retentionPolicyId: string): Promise<MetricRetentionPolicy | null> {
    const policy = await this.prisma.metricRetentionPolicy.findUnique({
      where: { id: retentionPolicyId }
    });

    return policy ? mapMetricRetentionPolicy(policy) : null;
  }

  async findDefault(): Promise<MetricRetentionPolicy | null> {
    const policy = await this.prisma.metricRetentionPolicy.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: "asc" }
    });

    return policy ? mapMetricRetentionPolicy(policy) : null;
  }

  async exists(retentionPolicyId: string): Promise<boolean> {
    const policy = await this.prisma.metricRetentionPolicy.findUnique({
      where: { id: retentionPolicyId },
      select: { id: true }
    });

    return policy !== null;
  }
}
