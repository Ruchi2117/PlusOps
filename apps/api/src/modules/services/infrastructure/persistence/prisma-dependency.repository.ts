import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  DependencyRepositoryPort,
  ServiceDependencyRecord
} from "../../application/ports";
import type { ServiceDependency } from "../../domain";
import {
  mapServiceDependency,
  mapServiceDependencyRecord,
  serviceDependencyInclude,
  toPrismaServiceDependencyWrite
} from "./service-prisma.mappers";

@Injectable()
export class PrismaDependencyRepository implements DependencyRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(dependency: ServiceDependency): Promise<ServiceDependency> {
    const snapshot = dependency.toSnapshot();
    const data = toPrismaServiceDependencyWrite(snapshot);
    const savedDependency = await this.prisma.serviceDependency.upsert({
      where: {
        upstreamServiceId_downstreamServiceId: {
          upstreamServiceId: snapshot.upstreamServiceId,
          downstreamServiceId: snapshot.downstreamServiceId
        }
      },
      update: data,
      create: {
        id: snapshot.id,
        ...data
      }
    });

    return mapServiceDependency(savedDependency);
  }

  async findById(dependencyId: string): Promise<ServiceDependency | null> {
    const dependency = await this.prisma.serviceDependency.findFirst({
      where: {
        id: dependencyId,
        deletedAt: null
      }
    });

    return dependency ? mapServiceDependency(dependency) : null;
  }

  async findActiveBetween(
    upstreamServiceId: string,
    downstreamServiceId: string
  ): Promise<ServiceDependency | null> {
    const dependency = await this.prisma.serviceDependency.findFirst({
      where: {
        upstreamServiceId,
        downstreamServiceId,
        deletedAt: null
      }
    });

    return dependency ? mapServiceDependency(dependency) : null;
  }

  async listByService(serviceId: string): Promise<ServiceDependencyRecord[]> {
    const dependencies = await this.prisma.serviceDependency.findMany({
      where: {
        deletedAt: null,
        OR: [{ upstreamServiceId: serviceId }, { downstreamServiceId: serviceId }]
      },
      include: serviceDependencyInclude,
      orderBy: {
        createdAt: "asc"
      }
    });

    return dependencies.map(mapServiceDependencyRecord);
  }

  async wouldCreateCycle(
    upstreamServiceId: string,
    downstreamServiceId: string
  ): Promise<boolean> {
    if (upstreamServiceId === downstreamServiceId) {
      return true;
    }

    const dependencies = await this.prisma.serviceDependency.findMany({
      where: {
        deletedAt: null
      },
      select: {
        upstreamServiceId: true,
        downstreamServiceId: true
      }
    });
    const adjacency = new Map<string, string[]>();

    for (const dependency of dependencies) {
      const downstreamServices = adjacency.get(dependency.upstreamServiceId) ?? [];
      downstreamServices.push(dependency.downstreamServiceId);
      adjacency.set(dependency.upstreamServiceId, downstreamServices);
    }

    return pathExists(adjacency, downstreamServiceId, upstreamServiceId);
  }
}

function pathExists(
  adjacency: Map<string, string[]>,
  startServiceId: string,
  targetServiceId: string
): boolean {
  const visited = new Set<string>();
  const stack = [startServiceId];

  while (stack.length > 0) {
    const serviceId = stack.pop();

    if (!serviceId || visited.has(serviceId)) {
      continue;
    }

    if (serviceId === targetServiceId) {
      return true;
    }

    visited.add(serviceId);
    stack.push(...(adjacency.get(serviceId) ?? []));
  }

  return false;
}
