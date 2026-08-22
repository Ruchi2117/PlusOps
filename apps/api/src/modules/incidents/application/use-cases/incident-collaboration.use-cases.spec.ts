import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { IncidentPriority, IncidentSeverity } from "@plusops/contracts";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import {
  Incident,
  IncidentComment,
  IncidentTimelineEvent,
  type IncidentAttachment,
  type IncidentMention
} from "../../domain";
import type {
  IncidentAttachmentListResult,
  IncidentAttachmentRecord,
  IncidentAttachmentRepositoryPort,
  IncidentAttachmentStoragePort,
  IncidentCommentCollaborationRecord,
  IncidentCommentListResult,
  IncidentCommentRepositoryPort,
  IncidentDetailRecord,
  IncidentListResult,
  IncidentMentionRepositoryPort,
  IncidentRepositoryPort,
  IncidentTimelineListResult,
  IncidentTimelineRepositoryPort,
  MentionableUserRecord,
  SaveIncidentAttachmentOptions,
  SaveIncidentCommentOptions
} from "../ports";
import { CreateIncidentAttachmentUseCase } from "./create-incident-attachment.use-case";
import { CreateIncidentCommentUseCase } from "./create-incident-comment.use-case";
import { DeleteIncidentCommentUseCase } from "./delete-incident-comment.use-case";
import { ListIncidentTimelineUseCase } from "./list-incident-timeline.use-case";
import { UpdateIncidentCommentUseCase } from "./update-incident-comment.use-case";

const fixedNow = new Date("2026-08-07T12:00:00.000Z");

describe("Incident collaboration use cases", () => {
  let incidentRepository: FakeIncidentRepository;
  let commentRepository: FakeCommentRepository;
  let mentionRepository: FakeMentionRepository;
  let attachmentRepository: FakeAttachmentRepository;
  let timelineRepository: FakeTimelineRepository;
  let auditLog: FakeAuditLog;
  let clock: FixedClock;

  beforeEach(() => {
    incidentRepository = new FakeIncidentRepository();
    commentRepository = new FakeCommentRepository();
    mentionRepository = new FakeMentionRepository();
    attachmentRepository = new FakeAttachmentRepository();
    timelineRepository = new FakeTimelineRepository();
    auditLog = new FakeAuditLog();
    clock = new FixedClock(fixedNow);
  });

  it("creates comments with stored mentions, timeline evidence, and audit logs", async () => {
    const useCase = new CreateIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      mentionRepository,
      auditLog,
      clock
    );

    const result = await useCase.execute({
      incidentId: incidentId(),
      body: "Checking the checkout traces with @alice.",
      actor: developerActor()
    });

    expect(result.comment.body).toBe("Checking the checkout traces with @alice.");
    expect(result.comment.mentions).toEqual([
      {
        id: expect.any(String),
        userId: aliceId(),
        displayName: "Alice Patel",
        handle: "alice"
      }
    ]);
    expect(commentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      type: "comment_added",
      metadata: {
        mentionCount: 1
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.comment_added",
        entityType: "IncidentComment"
      })
    );
  });

  it("rejects comments from viewers and unknown mentions before persistence", async () => {
    const useCase = new CreateIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      mentionRepository,
      auditLog,
      clock
    );

    await expect(
      useCase.execute({
        incidentId: incidentId(),
        body: "Viewer comment",
        actor: viewerActor()
      })
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      useCase.execute({
        incidentId: incidentId(),
        body: "Looping in @unknown.",
        actor: developerActor()
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(commentRepository.save).not.toHaveBeenCalled();
  });

  it("prevents collaboration writes on deleted incidents", async () => {
    incidentRepository.incident = createDomainIncident({
      deletedAt: fixedNow
    });
    const useCase = new CreateIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      mentionRepository,
      auditLog,
      clock
    );

    await expect(
      useCase.execute({
        incidentId: incidentId(),
        body: "Should not be accepted.",
        actor: developerActor()
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows authors to edit their comments and replaces mentions", async () => {
    commentRepository.comment = createCommentRecord({
      comment: createComment()
    });
    const useCase = new UpdateIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      mentionRepository,
      auditLog,
      clock
    );

    const result = await useCase.execute({
      commentId: commentId(),
      body: "Mitigation is ready with @bob.",
      actor: developerActor()
    });

    expect(result.comment.body).toBe("Mitigation is ready with @bob.");
    expect(result.comment.editedAt).toBe("2026-08-07T12:00:00.000Z");
    expect(result.comment.mentions[0]).toMatchObject({
      userId: bobId(),
      handle: "bob"
    });
    expect(commentRepository.replaceMentions).toBe(true);
    expect(commentRepository.timelineEvents[0]?.toSnapshot().type).toBe("comment_edited");
  });

  it("prevents editing another user's comment unless the actor can manage incidents", async () => {
    commentRepository.comment = createCommentRecord({
      comment: createComment({ authorId: otherUserId() })
    });
    const useCase = new UpdateIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      mentionRepository,
      auditLog,
      clock
    );

    await expect(
      useCase.execute({
        commentId: commentId(),
        body: "Unauthorized edit.",
        actor: developerActor()
      })
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      useCase.execute({
        commentId: commentId(),
        body: "Manager edit.",
        actor: managerActor()
      })
    ).resolves.toMatchObject({
      comment: {
        body: "Manager edit."
      }
    });
  });

  it("soft deletes comments and records immutable activity", async () => {
    commentRepository.comment = createCommentRecord({
      comment: createComment()
    });
    const useCase = new DeleteIncidentCommentUseCase(
      incidentRepository,
      commentRepository,
      auditLog,
      clock
    );

    await useCase.execute({
      commentId: commentId(),
      actor: developerActor()
    });

    expect(commentRepository.comment.comment.toSnapshot().deletedAt).toEqual(fixedNow);
    expect(commentRepository.timelineEvents[0]?.toSnapshot().type).toBe("comment_deleted");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.comment_deleted"
      })
    );
  });

  it("persists attachment content with metadata, timeline evidence, and audit logs", async () => {
    const attachmentStorage = new FakeAttachmentStorage();
    const useCase = new CreateIncidentAttachmentUseCase(
      incidentRepository,
      attachmentRepository,
      attachmentStorage,
      auditLog,
      clock
    );

    const result = await useCase.execute({
      incidentId: incidentId(),
      filename: "checkout-errors.json",
      contentType: "application/json",
      size: 2,
      content: Buffer.from("{}"),
      actor: developerActor()
    });

    expect(result.attachment).toMatchObject({
      filename: "checkout-errors.json",
      storageKey: expect.stringContaining("/attachments/")
    });
    expect(attachmentStorage.save).toHaveBeenCalledWith(
      result.attachment.storageKey,
      Buffer.from("{}")
    );
    expect(attachmentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      type: "attachment_added",
      metadata: {
        filename: "checkout-errors.json"
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.attachment_added",
        entityType: "IncidentAttachment"
      })
    );
  });

  it("returns timeline activity in chronological repository order", async () => {
    timelineRepository.events = [
      timelineEvent("comment_added", new Date("2026-08-07T12:01:00.000Z")),
      timelineEvent("attachment_added", new Date("2026-08-07T12:02:00.000Z"))
    ];
    const useCase = new ListIncidentTimelineUseCase(incidentRepository, timelineRepository);

    const result = await useCase.execute({
      incidentId: incidentId(),
      page: 1,
      pageSize: 20,
      actor: viewerActor()
    });

    expect(result.data.map((event) => event.type)).toEqual(["comment_added", "attachment_added"]);
    expect(result.pagination.total).toBe(2);
  });
});

class FakeIncidentRepository implements IncidentRepositoryPort {
  incident = createDomainIncident();

  save = vi.fn(async (): Promise<void> => undefined);

  findById = vi.fn(async () => {
    if (this.incident.toSnapshot().deletedAt) {
      return null;
    }

    return this.incident;
  });

  findDetailById = vi.fn(async (): Promise<IncidentDetailRecord | null> => null);
  list = vi.fn(async (): Promise<IncidentListResult> => ({
    incidents: [],
    total: 0
  }));
  referencesExist = vi.fn(async () => true);
  activeUserExists = vi.fn(async () => true);
}

class FakeCommentRepository implements IncidentCommentRepositoryPort {
  comment: IncidentCommentCollaborationRecord | null = null;
  timelineEvents: IncidentTimelineEvent[] = [];
  replaceMentions = false;

  save = vi.fn(async (comment: IncidentComment, options: SaveIncidentCommentOptions = {}) => {
    this.comment = createCommentRecord({
      comment,
      mentions: options.mentions ?? []
    });
    this.replaceMentions = options.replaceMentions ?? false;
    this.timelineEvents.push(...(options.timelineEvents ?? []));
  });

  findById = vi.fn(async () => this.comment);

  listByIncident = vi.fn(async (): Promise<IncidentCommentListResult> => ({
    comments: this.comment ? [this.comment] : [],
    total: this.comment ? 1 : 0
  }));
}

class FakeMentionRepository implements IncidentMentionRepositoryPort {
  users: MentionableUserRecord[] = [
    {
      id: aliceId(),
      displayName: "Alice Patel",
      handles: ["alice"]
    },
    {
      id: bobId(),
      displayName: "Bob Chen",
      handles: ["bob"]
    }
  ];

  findMentionableUsersByHandles = vi.fn(async (handles: string[]) =>
    this.users.filter((user) => user.handles.some((handle) => handles.includes(handle)))
  );
}

class FakeAttachmentRepository implements IncidentAttachmentRepositoryPort {
  attachment: IncidentAttachmentRecord | null = null;
  timelineEvents: IncidentTimelineEvent[] = [];

  save = vi.fn(
    async (attachment: IncidentAttachment, options: SaveIncidentAttachmentOptions = {}) => {
      this.attachment = {
        attachment,
        uploadedByName: "PlusOps Developer"
      };
      this.timelineEvents.push(...(options.timelineEvents ?? []));
    }
  );

  findById = vi.fn(async () => this.attachment);

  listByIncident = vi.fn(async (): Promise<IncidentAttachmentListResult> => ({
    attachments: this.attachment ? [this.attachment] : [],
    total: this.attachment ? 1 : 0
  }));
}

class FakeTimelineRepository implements IncidentTimelineRepositoryPort {
  events: IncidentTimelineEvent[] = [];

  append = vi.fn(async (event: IncidentTimelineEvent) => {
    this.events.push(event);
  });

  listByIncident = vi.fn(async (): Promise<IncidentTimelineListResult> => ({
    events: this.events,
    total: this.events.length
  }));
}

class FakeAttachmentStorage implements IncidentAttachmentStoragePort {
  readonly files = new Map<string, Buffer>();

  createStorageKey(input: { incidentId: string; attachmentId: string; filename: string }): string {
    return `incidents/${input.incidentId}/attachments/${input.attachmentId}/${input.filename}`;
  }

  save = vi.fn(async (storageKey: string, content: Buffer) => {
    this.files.set(storageKey, content);
  });

  read = vi.fn(async (storageKey: string) => this.files.get(storageKey) ?? Buffer.alloc(0));

  remove = vi.fn(async (storageKey: string) => {
    this.files.delete(storageKey);
  });
}

class FakeAuditLog implements AuthAuditLogPort {
  record = vi.fn(async () => undefined);
}

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}

function createCommentRecord(input: {
  comment: IncidentComment;
  mentions?: IncidentMention[];
}): IncidentCommentCollaborationRecord {
  return {
    comment: input.comment,
    authorName: "PlusOps Developer",
    mentions: (input.mentions ?? []).map((mention) => {
      const snapshot = mention.toSnapshot();
      const user = snapshot.mentionedUserId === aliceId() ? "Alice Patel" : "Bob Chen";

      return {
        id: snapshot.id,
        userId: snapshot.mentionedUserId,
        displayName: user,
        handle: snapshot.handle
      };
    })
  };
}

function createComment(overrides: Partial<ReturnType<IncidentComment["toSnapshot"]>> = {}) {
  return IncidentComment.restore({
    id: commentId(),
    incidentId: incidentId(),
    authorId: userId(),
    body: "Checking logs.",
    editedAt: null,
    createdAt: new Date("2026-08-07T11:55:00.000Z"),
    deletedAt: null,
    ...overrides
  });
}

function createDomainIncident(
  overrides: Partial<ReturnType<Incident["toSnapshot"]>> = {}
): Incident {
  return Incident.restore({
    id: incidentId(),
    title: "Checkout authorization failures",
    description: "Authorization requests are timing out.",
    serviceId: serviceId(),
    reporterId: userId(),
    assigneeId: null,
    severity: "sev2" satisfies IncidentSeverity,
    priority: "high" satisfies IncidentPriority,
    status: "open",
    customerImpact: "Some customers cannot complete checkout.",
    startedAt: new Date("2026-08-07T09:55:00.000Z"),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date("2026-08-07T09:55:00.000Z"),
    updatedAt: new Date("2026-08-07T09:55:00.000Z"),
    deletedAt: null,
    ...overrides
  });
}

function timelineEvent(
  type: "comment_added" | "attachment_added",
  createdAt: Date
): IncidentTimelineEvent {
  return IncidentTimelineEvent.create({
    id: randomUUID(),
    incidentId: incidentId(),
    actorUserId: userId(),
    type,
    message: "Activity recorded.",
    createdAt
  });
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["incidents:read", "incidents:write"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    id: "3c30f832-ac4c-4c2e-b5c1-7f5acacb0f0f",
    email: "manager@plusops.dev",
    sessionId: "17a76105-6ff4-44f6-9786-34a97b5f9b37",
    roles: ["engineering_manager"],
    permissions: ["incidents:read", "incidents:write", "incidents:manage"]
  };
}

function viewerActor(): AuthenticatedUser {
  return {
    id: otherUserId(),
    email: "viewer@plusops.dev",
    sessionId: "ce28ff9f-ed84-41bb-b67f-27410aecf6de",
    roles: ["viewer"],
    permissions: ["incidents:read"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function otherUserId(): string {
  return "65c91c1d-9ce4-41a5-8a82-93fe93f1fdc0";
}

function aliceId(): string {
  return "5645232b-0341-4999-9ae3-e7ca1612233c";
}

function bobId(): string {
  return "26f46ba9-9f57-4a98-96d5-489129389d17";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}

function commentId(): string {
  return "f6f4a0ea-301c-4bfc-9973-280ab0c742f8";
}
