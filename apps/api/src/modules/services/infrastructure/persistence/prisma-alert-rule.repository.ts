import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  AlertRuleListQuery,
  AlertRuleListResult,
  AlertRuleRepositoryPort,
  SaveAlertRuleOptions
} from "../../application/ports";
import type { AlertRule } from "../../domain";
import {
  mapAlertRule,
  toPrismaAlertRuleWrite,
  toPrismaAlertSeverity,
  toPrismaAlertState,
  toPrismaAlertTimelineEventCreate
} from "./alert-prisma.mappers";

@Injectable()
export class PrismaAlertRuleRepository implements AlertRuleRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(alert: AlertRule, options: SaveAlertRuleOptions = {}): Promise<void> {
    const snapshot = alert.toSnapshot();
    const data = toPrismaAlertRuleWrite(snapshot);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.alertRule.upsert({
        where: { id: snapshot.id },
        update: data,
        create: {
          id: snapshot.id,
          ...data
        }
      });

      if (options.timelineEvents && options.timelineEvents.length > 0) {
        await transaction.alertTimelineEvent.createMany({
          data: options.timelineEvents.map(toPrismaAlertTimelineEventCreate)
        });
      }
    });
  }

  async findById(
    alertRuleId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<AlertRule | null> {
    const alert = await this.prisma.alertRule.findFirst({
      where: {
        id: alertRuleId,
        ...(options.includeDeleted ? {} : { deletedAt: null })
      }
    });

    return alert ? mapAlertRule(alert) : null;
  }

  async list(query: AlertRuleListQuery): Promise<AlertRuleListResult> {
    const where = buildWhere(query);
    const skip = (query.page - 1) * query.pageSize;
    const [alerts, total] = await this.prisma.$transaction([
      this.prisma.alertRule.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.pageSize
      }),
      this.prisma.alertRule.count({ where })
    ]);

    return {
      alerts: alerts.map(mapAlertRule),
      total
    };
  }
}

function buildWhere(query: AlertRuleListQuery): Prisma.AlertRuleWhereInput {
  const filters = query.filters;

  return {
    ...(filters?.includeDeleted ? {} : { deletedAt: null }),
    ...(filters?.state ? { state: toPrismaAlertState(filters.state) } : {}),
    ...(filters?.severity ? { severity: toPrismaAlertSeverity(filters.severity) } : {}),
    ...(filters?.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { metricName: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}
