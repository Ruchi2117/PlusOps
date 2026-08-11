import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  AlertEvaluationRepositoryPort,
  SaveAlertEvaluationOptions
} from "../../application/ports";
import type { AlertEvaluation } from "../../domain";
import {
  mapAlertEvaluation,
  toPrismaAlertEvaluationCreate,
  toPrismaAlertTimelineEventCreate
} from "./alert-prisma.mappers";

@Injectable()
export class PrismaAlertEvaluationRepository implements AlertEvaluationRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(evaluation: AlertEvaluation, options: SaveAlertEvaluationOptions = {}): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.alertEvaluation.create({
        data: toPrismaAlertEvaluationCreate(evaluation.toSnapshot())
      });

      if (options.alertRuleTimelineEvents && options.alertRuleTimelineEvents.length > 0) {
        await transaction.alertTimelineEvent.createMany({
          data: options.alertRuleTimelineEvents.map(toPrismaAlertTimelineEventCreate)
        });
      }
    });
  }

  async findLatestByAlertRule(alertRuleId: string): Promise<AlertEvaluation | null> {
    const evaluation = await this.prisma.alertEvaluation.findFirst({
      where: { alertRuleId },
      orderBy: { evaluatedAt: "desc" }
    });

    return evaluation ? mapAlertEvaluation(evaluation) : null;
  }
}
