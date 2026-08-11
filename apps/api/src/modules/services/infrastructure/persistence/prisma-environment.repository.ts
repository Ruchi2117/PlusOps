import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { EnvironmentRepositoryPort } from "../../application/ports";

@Injectable()
export class PrismaEnvironmentRepository implements EnvironmentRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async activeEnvironmentsExist(environmentIds: string[]): Promise<boolean> {
    const uniqueEnvironmentIds = [...new Set(environmentIds)];

    if (uniqueEnvironmentIds.length === 0) {
      return true;
    }

    const count = await this.prisma.environment.count({
      where: {
        id: {
          in: uniqueEnvironmentIds
        },
        deletedAt: null
      }
    });

    return count === uniqueEnvironmentIds.length;
  }
}
