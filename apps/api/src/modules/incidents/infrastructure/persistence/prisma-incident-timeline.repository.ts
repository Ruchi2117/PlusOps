import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  IncidentTimelineListQuery,
  IncidentTimelineListResult,
  IncidentTimelineRepositoryPort
} from "../../application/ports";
import { IncidentTimelineEvent } from "../../domain";
import { mapIncidentTimelineEventType } from "./incident-prisma.mappers";

@Injectable()
export class PrismaIncidentTimelineRepository implements IncidentTimelineRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async append(event: IncidentTimelineEvent): Promise<void> {
    const snapshot = event.toSnapshot();

    await this.prisma.incidentTimelineEvent.create({
      data: {
        id: snapshot.id,
        incidentId: snapshot.incidentId,
        actorUserId: snapshot.actorUserId,
        type: snapshot.type,
        message: snapshot.message,
        metadata: snapshot.metadata as Prisma.InputJsonObject | undefined,
        createdAt: snapshot.createdAt
      }
    });
  }

  async listByIncident(query: IncidentTimelineListQuery): Promise<IncidentTimelineListResult> {
    const skip = (query.page - 1) * query.pageSize;
    const [events, total] = await this.prisma.$transaction([
      this.prisma.incidentTimelineEvent.findMany({
        where: { incidentId: query.incidentId },
        orderBy: { createdAt: "asc" },
        skip,
        take: query.pageSize
      }),
      this.prisma.incidentTimelineEvent.count({
        where: { incidentId: query.incidentId }
      })
    ]);

    return {
      events: events.map((event) =>
        IncidentTimelineEvent.restore({
          id: event.id,
          incidentId: event.incidentId,
          actorUserId: event.actorUserId,
          type: mapIncidentTimelineEventType(event.type),
          message: event.message,
          metadata: toRecord(event.metadata),
          createdAt: event.createdAt
        })
      ),
      total
    };
  }
}

function toRecord(value: Prisma.JsonValue): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}
