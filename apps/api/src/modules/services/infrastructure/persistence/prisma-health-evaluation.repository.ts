import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  HealthEvaluationListQuery,
  HealthEvaluationListResult,
  HealthEvaluationRepositoryPort,
  SaveHealthEvaluationOptions
} from "../../application/ports";
import type { HealthEvaluation } from "../../domain";
import {
  mapHealthEvaluation,
  toPrismaHealthEvaluationCreate,
  toPrismaHealthResultCreate,
  toPrismaHealthTimelineEventCreate
} from "./health-prisma.mappers";

@Injectable()
export class PrismaHealthEvaluationRepository implements HealthEvaluationRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(
    evaluation: HealthEvaluation,
    options: SaveHealthEvaluationOptions = {}
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      if (options.result) {
        await transaction.healthCheckResult.create({
          data: toPrismaHealthResultCreate(options.result.toSnapshot())
        });
      }

      await transaction.serviceHealthEvaluation.create({
        data: toPrismaHealthEvaluationCreate(evaluation.toSnapshot())
      });

      if (options.timelineEvents && options.timelineEvents.length > 0) {
        await transaction.serviceHealthTimelineEvent.createMany({
          data: options.timelineEvents.map(toPrismaHealthTimelineEventCreate)
        });
      }
    });
  }

  async findLatestByService(serviceId: string): Promise<HealthEvaluation | null> {
    const evaluation = await this.prisma.serviceHealthEvaluation.findFirst({
      where: { serviceId },
      orderBy: { evaluatedAt: "desc" }
    });

    return evaluation ? mapHealthEvaluation(evaluation) : null;
  }

  async listByService(query: HealthEvaluationListQuery): Promise<HealthEvaluationListResult> {
    const skip = (query.page - 1) * query.pageSize;
    const where = { serviceId: query.serviceId };
    const [evaluations, total] = await this.prisma.$transaction([
      this.prisma.serviceHealthEvaluation.findMany({
        where,
        orderBy: { evaluatedAt: "desc" },
        skip,
        take: query.pageSize
      }),
      this.prisma.serviceHealthEvaluation.count({ where })
    ]);

    return {
      evaluations: evaluations.map(mapHealthEvaluation),
      total
    };
  }
}
