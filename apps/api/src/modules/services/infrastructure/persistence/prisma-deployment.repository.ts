import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { DeploymentRepositoryPort, ServiceDeploymentRecord } from "../../application/ports";
import { mapDeploymentStatus } from "./service-prisma.mappers";

@Injectable()
export class PrismaDeploymentRepository implements DeploymentRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async listRecentByService(serviceId: string, limit: number): Promise<ServiceDeploymentRecord[]> {
    const deployments = await this.prisma.deployment.findMany({
      where: {
        serviceId
      },
      include: {
        environment: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startedAt: "desc"
      },
      take: limit
    });

    return deployments.map((deployment) => ({
      id: deployment.id,
      serviceId: deployment.serviceId,
      environmentId: deployment.environmentId,
      environmentName: deployment.environment.name,
      version: deployment.version,
      commitSha: deployment.commitSha,
      repositoryUrl: deployment.repositoryUrl,
      status: mapDeploymentStatus(deployment.status),
      deployedByUserId: deployment.deployedByUserId,
      startedAt: deployment.startedAt,
      finishedAt: deployment.finishedAt
    }));
  }
}
