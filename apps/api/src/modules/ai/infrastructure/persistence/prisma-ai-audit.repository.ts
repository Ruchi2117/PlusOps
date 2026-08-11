import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { AIAuditRepositoryPort } from "../../application/ports";
import type { AIAuditEvent } from "../../domain";
import { toPrismaAuditEventCreate } from "./ai-prisma.mappers";

@Injectable()
export class PrismaAIAuditRepository implements AIAuditRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(event: AIAuditEvent): Promise<void> {
    await this.prisma.aIAuditEvent.create({
      data: toPrismaAuditEventCreate(event.toSnapshot())
    });
  }
}
