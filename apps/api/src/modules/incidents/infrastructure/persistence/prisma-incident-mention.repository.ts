import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  IncidentMentionRepositoryPort,
  MentionableUserRecord
} from "../../application/ports";

@Injectable()
export class PrismaIncidentMentionRepository implements IncidentMentionRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async findMentionableUsersByHandles(handles: string[]): Promise<MentionableUserRecord[]> {
    const requestedHandles = new Set(handles.map(normalizeHandle));

    if (requestedHandles.size === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    return users
      .map((user) => ({
        id: user.id,
        displayName: user.name,
        handles: buildUserHandles(user)
      }))
      .filter((user) => user.handles.some((handle) => requestedHandles.has(handle)));
  }
}

function buildUserHandles(user: { email: string; name: string }): string[] {
  const emailHandle = user.email.split("@")[0] ?? "";
  const nameHandle = user.name.replace(/[^a-zA-Z0-9_-]+/g, "").toLowerCase();

  return Array.from(new Set([normalizeHandle(emailHandle), normalizeHandle(nameHandle)])).filter(
    Boolean
  );
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}
