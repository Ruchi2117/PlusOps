import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { UsageRecordRepositoryPort } from "../../application/ports";
import type { UsageRecord } from "../../domain";
import { toPrismaUsageRecordCreate } from "./ai-prisma.mappers";

@Injectable()
export class PrismaUsageRecordRepository implements UsageRecordRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(record: UsageRecord): Promise<void> {
    await this.prisma.aIUsageRecord.create({
      data: toPrismaUsageRecordCreate(record.toSnapshot())
    });
  }
}
