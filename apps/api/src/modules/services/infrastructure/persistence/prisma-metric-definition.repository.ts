import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  MetricDefinitionListQuery,
  MetricDefinitionListResult,
  MetricDefinitionRepositoryPort,
  SaveMetricDefinitionOptions
} from "../../application/ports";
import type { MetricDefinition } from "../../domain";
import {
  mapMetricDefinition,
  toPrismaMetricDefinitionWrite,
  toPrismaMetricTimelineEventCreate,
  toPrismaMetricType
} from "./metric-prisma.mappers";

@Injectable()
export class PrismaMetricDefinitionRepository implements MetricDefinitionRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(metric: MetricDefinition, options: SaveMetricDefinitionOptions = {}): Promise<void> {
    const snapshot = metric.toSnapshot();
    const data = toPrismaMetricDefinitionWrite(snapshot);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.metricDefinition.upsert({
        where: { id: snapshot.id },
        update: data,
        create: {
          id: snapshot.id,
          ...data
        }
      });

      if (options.timelineEvents && options.timelineEvents.length > 0) {
        await transaction.serviceMetricTimelineEvent.createMany({
          data: options.timelineEvents.map(toPrismaMetricTimelineEventCreate)
        });
      }
    });
  }

  async findById(
    metricDefinitionId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<MetricDefinition | null> {
    const metric = await this.prisma.metricDefinition.findFirst({
      where: {
        id: metricDefinitionId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return metric ? mapMetricDefinition(metric) : null;
  }

  async findByServiceAndName(
    serviceId: string,
    name: string,
    options: { excludeMetricDefinitionId?: string; includeDeleted?: boolean } = {}
  ): Promise<MetricDefinition | null> {
    const metric = await this.prisma.metricDefinition.findFirst({
      where: {
        serviceId,
        name: name.trim().toLowerCase(),
        ...(options.excludeMetricDefinitionId
          ? { id: { not: options.excludeMetricDefinitionId } }
          : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return metric ? mapMetricDefinition(metric) : null;
  }

  async list(query: MetricDefinitionListQuery): Promise<MetricDefinitionListResult> {
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query);
    const skip = (query.page - 1) * query.pageSize;
    const [metrics, total] = await this.prisma.$transaction([
      this.prisma.metricDefinition.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.metricDefinition.count({ where })
    ]);

    return {
      metrics: metrics.map(mapMetricDefinition),
      total
    };
  }
}

function buildWhere(query: MetricDefinitionListQuery): Prisma.MetricDefinitionWhereInput {
  const filters = query.filters;

  return {
    ...(filters?.includeDeleted ? {} : { deletedAt: null }),
    ...(filters?.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters?.type ? { type: toPrismaMetricType(filters.type) } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { displayName: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

function buildOrderBy(
  query: MetricDefinitionListQuery
): Prisma.MetricDefinitionOrderByWithRelationInput {
  const field = query.sort?.field ?? "name";
  const direction = query.sort?.direction ?? "asc";

  return { [field]: direction };
}
