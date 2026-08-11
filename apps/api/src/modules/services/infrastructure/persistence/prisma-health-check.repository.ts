import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { HealthCheckListOptions, HealthCheckRepositoryPort } from "../../application/ports";
import type { HealthCheck } from "../../domain";
import { mapHealthCheck, toPrismaHealthCheckWrite } from "./health-prisma.mappers";

@Injectable()
export class PrismaHealthCheckRepository implements HealthCheckRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(healthCheck: HealthCheck): Promise<void> {
    const snapshot = healthCheck.toSnapshot();
    const data = toPrismaHealthCheckWrite(snapshot);

    await this.prisma.healthCheck.upsert({
      where: { id: snapshot.id },
      update: data,
      create: {
        id: snapshot.id,
        ...data
      }
    });
  }

  async findById(
    healthCheckId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<HealthCheck | null> {
    const healthCheck = await this.prisma.healthCheck.findFirst({
      where: {
        id: healthCheckId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return healthCheck ? mapHealthCheck(healthCheck) : null;
  }

  async listByService(
    serviceId: string,
    options: HealthCheckListOptions = {}
  ): Promise<HealthCheck[]> {
    const healthChecks = await this.prisma.healthCheck.findMany({
      where: {
        serviceId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.includeDisabled ? {} : { isEnabled: true })
      },
      orderBy: { createdAt: "asc" }
    });

    return healthChecks.map(mapHealthCheck);
  }
}
