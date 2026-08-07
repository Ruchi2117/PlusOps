import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  IncidentDetailRecord,
  IncidentListQuery,
  IncidentListResult,
  IncidentRepositoryPort,
  SaveIncidentOptions
} from "../../application/ports";
import type { Incident } from "../../domain";
import {
  incidentDetailInclude,
  incidentSummaryInclude,
  mapIncident,
  mapIncidentDetail,
  mapIncidentSummary,
  toPrismaTimelineEventCreate,
  toPrismaIncidentPriority,
  toPrismaIncidentSeverity,
  toPrismaIncidentStatus,
  toPrismaIncidentWrite
} from "./incident-prisma.mappers";

@Injectable()
export class PrismaIncidentRepository implements IncidentRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(incident: Incident, options: SaveIncidentOptions = {}): Promise<void> {
    const snapshot = incident.toSnapshot();
    const data = toPrismaIncidentWrite(snapshot);
    const timelineEvents = options.timelineEvents ?? [];

    if (timelineEvents.length === 0) {
      await upsertIncident(this.prisma, snapshot.id, data);
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      await upsertIncident(transaction, snapshot.id, data);
      await transaction.incidentTimelineEvent.createMany({
        data: timelineEvents.map(toPrismaTimelineEventCreate)
      });
    });
  }

  async findById(
    incidentId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<Incident | null> {
    const incident = await this.prisma.incident.findFirst({
      where: {
        id: incidentId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return incident ? mapIncident(incident) : null;
  }

  async findDetailById(
    incidentId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<IncidentDetailRecord | null> {
    const incident = await this.prisma.incident.findFirst({
      where: {
        id: incidentId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      },
      include: incidentDetailInclude
    });

    return incident ? mapIncidentDetail(incident) : null;
  }

  async list(query: IncidentListQuery): Promise<IncidentListResult> {
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query);
    const skip = (query.page - 1) * query.pageSize;

    const [incidents, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: incidentSummaryInclude,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.incident.count({ where })
    ]);

    return {
      incidents: incidents.map(mapIncidentSummary),
      total
    };
  }

  async referencesExist(references: { serviceId: string; reporterId: string }): Promise<boolean> {
    const [service, reporter] = await this.prisma.$transaction([
      this.prisma.service.findFirst({
        where: {
          id: references.serviceId,
          deletedAt: null
        },
        select: { id: true }
      }),
      this.prisma.user.findFirst({
        where: {
          id: references.reporterId,
          deletedAt: null,
          isActive: true
        },
        select: { id: true }
      })
    ]);

    return service !== null && reporter !== null;
  }

  async activeUserExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        isActive: true
      },
      select: { id: true }
    });

    return user !== null;
  }
}

async function upsertIncident(
  prisma: Prisma.TransactionClient | PrismaService,
  incidentId: string,
  data: ReturnType<typeof toPrismaIncidentWrite>
): Promise<void> {
  await prisma.incident.upsert({
    where: { id: incidentId },
    update: data,
    create: {
      id: incidentId,
      ...data
    }
  });
}

function buildWhere(query: IncidentListQuery): Prisma.IncidentWhereInput {
  const filters = query.filters;

  return {
    ...(filters?.includeDeleted ? {} : { deletedAt: null }),
    ...(filters?.status ? { status: toPrismaIncidentStatus(filters.status) } : {}),
    ...(filters?.severity ? { severity: toPrismaIncidentSeverity(filters.severity) } : {}),
    ...(filters?.priority ? { priority: toPrismaIncidentPriority(filters.priority) } : {}),
    ...(filters?.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters?.assigneeId !== undefined ? { assigneeId: filters.assigneeId } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { customerImpact: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

function buildOrderBy(query: IncidentListQuery): Prisma.IncidentOrderByWithRelationInput {
  const field = query.sort?.field ?? "updatedAt";
  const direction = query.sort?.direction ?? "desc";

  return {
    [field]: direction
  };
}
