import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  SaveServiceOptions,
  ServiceDetailRecord,
  ServiceListQuery,
  ServiceListResult,
  ServiceRepositoryPort
} from "../../application/ports";
import type { Service } from "../../domain";
import {
  mapService,
  mapServiceDetail,
  mapServiceSummary,
  serviceDetailInclude,
  serviceSummaryInclude,
  toPrismaServiceLifecycleStatus,
  toPrismaServiceVisibility,
  toPrismaServiceWrite
} from "./service-prisma.mappers";

@Injectable()
export class PrismaServiceRepository implements ServiceRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(service: Service, options: SaveServiceOptions = {}): Promise<void> {
    const snapshot = service.toSnapshot();
    const data = toPrismaServiceWrite(snapshot);

    await this.prisma.$transaction(async (transaction) => {
      await upsertService(transaction, snapshot.id, data);

      if (options.environmentIds !== undefined) {
        await syncServiceEnvironments(
          transaction,
          snapshot.id,
          options.environmentIds,
          snapshot.updatedAt
        );
      }
    });
  }

  async findById(
    serviceId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<Service | null> {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return service ? mapService(service) : null;
  }

  async findDetailById(
    serviceId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<ServiceDetailRecord | null> {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      },
      include: serviceDetailInclude
    });

    return service ? mapServiceDetail(service) : null;
  }

  async findBySlug(
    slug: string,
    options: { excludeServiceId?: string; includeDeleted?: boolean } = {}
  ): Promise<Service | null> {
    const service = await this.prisma.service.findFirst({
      where: {
        slug,
        ...(options.excludeServiceId ? { id: { not: options.excludeServiceId } } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return service ? mapService(service) : null;
  }

  async list(query: ServiceListQuery): Promise<ServiceListResult> {
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query);
    const skip = (query.page - 1) * query.pageSize;

    const [services, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        include: serviceSummaryInclude,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.service.count({ where })
    ]);

    return {
      services: services.map(mapServiceSummary),
      total
    };
  }

  async ownerTeamExists(teamId: string): Promise<boolean> {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deletedAt: null
      },
      select: { id: true }
    });

    return team !== null;
  }

  async actorBelongsToTeam(actorUserId: string, teamId: string): Promise<boolean> {
    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId: actorUserId,
        teamId,
        team: {
          deletedAt: null
        },
        user: {
          deletedAt: null,
          isActive: true
        }
      },
      select: { id: true }
    });

    return membership !== null;
  }
}

async function upsertService(
  prisma: Prisma.TransactionClient | PrismaService,
  serviceId: string,
  data: ReturnType<typeof toPrismaServiceWrite>
): Promise<void> {
  await prisma.service.upsert({
    where: { id: serviceId },
    update: data,
    create: {
      id: serviceId,
      ...data
    }
  });
}

async function syncServiceEnvironments(
  prisma: Prisma.TransactionClient | PrismaService,
  serviceId: string,
  environmentIds: string[],
  changedAt: Date
): Promise<void> {
  const nextEnvironmentIds = [...new Set(environmentIds)];

  await prisma.serviceEnvironment.updateMany({
    where: {
      serviceId,
      deletedAt: null,
      ...(nextEnvironmentIds.length > 0
        ? { environmentId: { notIn: nextEnvironmentIds } }
        : {})
    },
    data: {
      deletedAt: changedAt
    }
  });

  await Promise.all(
    nextEnvironmentIds.map((environmentId) =>
      prisma.serviceEnvironment.upsert({
        where: {
          serviceId_environmentId: {
            serviceId,
            environmentId
          }
        },
        update: {
          deletedAt: null
        },
        create: {
          serviceId,
          environmentId,
          createdAt: changedAt
        }
      })
    )
  );
}

function buildWhere(query: ServiceListQuery): Prisma.ServiceWhereInput {
  const filters = query.filters;

  return {
    ...(filters?.includeDeleted ? {} : { deletedAt: null }),
    ...(filters?.ownerTeamId ? { ownerTeamId: filters.ownerTeamId } : {}),
    ...(filters?.lifecycleStatus
      ? { lifecycleStatus: toPrismaServiceLifecycleStatus(filters.lifecycleStatus) }
      : {}),
    ...(filters?.visibility ? { visibility: toPrismaServiceVisibility(filters.visibility) } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { slug: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

function buildOrderBy(query: ServiceListQuery): Prisma.ServiceOrderByWithRelationInput {
  const field = query.sort?.field ?? "name";
  const direction = query.sort?.direction ?? "asc";

  return {
    [field]: direction
  };
}
