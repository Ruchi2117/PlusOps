import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { AuthAuditLogPort, RecordAuthAuditEventInput } from "../../application/ports";

@Injectable()
export class PrismaAuthAuditLogRepository implements AuthAuditLogPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async record(input: RecordAuthAuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonObject | undefined
      }
    });
  }
}
