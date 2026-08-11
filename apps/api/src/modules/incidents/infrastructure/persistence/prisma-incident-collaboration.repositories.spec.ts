import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  IncidentAttachment,
  IncidentComment,
  IncidentMention,
  IncidentTimelineEvent
} from "../../domain";
import { PrismaIncidentAttachmentRepository } from "./prisma-incident-attachment.repository";
import { PrismaIncidentCommentRepository } from "./prisma-incident-comment.repository";
import { PrismaIncidentMentionRepository } from "./prisma-incident-mention.repository";
import { PrismaIncidentTimelineRepository } from "./prisma-incident-timeline.repository";

describe("Prisma incident collaboration repositories", () => {
  it("saves comments, mentions, and timeline events in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentCommentRepository(prisma as unknown as PrismaService);

    await repository.save(createComment(), {
      mentions: [createMention()],
      replaceMentions: true,
      timelineEvents: [timelineEvent("comment_added")]
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.incidentComment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          editedAt: null
        })
      })
    );
    expect(prisma.incidentMention.deleteMany).toHaveBeenCalledWith({
      where: { commentId: commentId() }
    });
    expect(prisma.incidentMention.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          commentId: commentId(),
          mentionedUserId: mentionedUserId(),
          handle: "alice"
        })
      ]
    });
    expect(prisma.incidentTimelineEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          type: "comment_added"
        })
      ]
    });
  });

  it("saves attachment metadata and timeline events in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentAttachmentRepository(prisma as unknown as PrismaService);

    await repository.save(createAttachment(), {
      timelineEvents: [timelineEvent("attachment_added")]
    });

    expect(prisma.incidentAttachment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          filename: "checkout-errors.json",
          contentType: "application/json",
          size: 2048,
          storageKey: "incidents/incident/attachments/file"
        })
      })
    );
    expect(prisma.incidentTimelineEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          type: "attachment_added"
        })
      ]
    });
  });

  it("resolves mentionable users by normalized handles", async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: mentionedUserId(),
        name: "Alice Patel",
        email: "alice@plusops.dev"
      },
      {
        id: otherUserId(),
        name: "Other User",
        email: "other@plusops.dev"
      }
    ]);
    const repository = new PrismaIncidentMentionRepository(prisma as unknown as PrismaService);

    const users = await repository.findMentionableUsersByHandles(["alice"]);

    expect(users).toEqual([
      {
        id: mentionedUserId(),
        displayName: "Alice Patel",
        handles: ["alice", "alicepatel"]
      }
    ]);
  });

  it("orders timeline activity chronologically", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentTimelineRepository(prisma as unknown as PrismaService);

    await repository.listByIncident({
      incidentId: incidentId(),
      page: 2,
      pageSize: 10
    });

    expect(prisma.incidentTimelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { incidentId: incidentId() },
        orderBy: { createdAt: "asc" },
        skip: 10,
        take: 10
      })
    );
  });
});

function createPrismaMock() {
  const prisma = {
    incidentComment: {
      upsert: vi.fn(async () => undefined),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0)
    },
    incidentMention: {
      deleteMany: vi.fn(async () => undefined),
      createMany: vi.fn(async () => undefined)
    },
    incidentAttachment: {
      upsert: vi.fn(async () => undefined),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0)
    },
    incidentTimelineEvent: {
      createMany: vi.fn(async () => undefined),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0)
    },
    user: {
      findMany: vi.fn(async (): Promise<Array<{ id: string; name: string; email: string }>> => [])
    },
    $transaction: vi.fn(async (operation: unknown) => {
      if (Array.isArray(operation)) {
        return Promise.all(operation);
      }

      if (typeof operation === "function") {
        return operation(prisma);
      }

      throw new Error("Unsupported Prisma transaction test input.");
    })
  };

  return prisma;
}

function createComment(): IncidentComment {
  return IncidentComment.create({
    id: commentId(),
    incidentId: incidentId(),
    authorId: userId(),
    body: "Checking logs with @alice.",
    createdAt: now()
  });
}

function createMention(): IncidentMention {
  return IncidentMention.create({
    id: "f4ee2ffa-12a6-43aa-8194-eb7f093fbdf1",
    incidentId: incidentId(),
    commentId: commentId(),
    mentionedUserId: mentionedUserId(),
    handle: "alice",
    createdAt: now()
  });
}

function createAttachment(): IncidentAttachment {
  return IncidentAttachment.create({
    id: attachmentId(),
    incidentId: incidentId(),
    uploadedByUserId: userId(),
    filename: "checkout-errors.json",
    contentType: "application/json",
    size: 2048,
    storageKey: "incidents/incident/attachments/file",
    uploadedAt: now()
  });
}

function timelineEvent(type: "comment_added" | "attachment_added"): IncidentTimelineEvent {
  return IncidentTimelineEvent.create({
    id: "c5364da0-6a10-4071-bd56-a07901a01d36",
    incidentId: incidentId(),
    actorUserId: userId(),
    type,
    message: "Activity recorded.",
    createdAt: now()
  });
}

function now(): Date {
  return new Date("2026-08-07T10:00:00.000Z");
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function otherUserId(): string {
  return "65c91c1d-9ce4-41a5-8a82-93fe93f1fdc0";
}

function mentionedUserId(): string {
  return "5645232b-0341-4999-9ae3-e7ca1612233c";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}

function commentId(): string {
  return "f6f4a0ea-301c-4bfc-9973-280ab0c742f8";
}

function attachmentId(): string {
  return "5d567c48-dcda-4497-9e8b-b0edaaef18f3";
}
