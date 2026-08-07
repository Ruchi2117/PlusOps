import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type { AssignIncidentUseCase } from "../../application/use-cases/assign-incident.use-case";
import type {
  ChangeIncidentSeverityUseCase
} from "../../application/use-cases/change-incident-severity.use-case";
import type {
  ChangeIncidentStatusUseCase
} from "../../application/use-cases/change-incident-status.use-case";
import type { CloseIncidentUseCase } from "../../application/use-cases/close-incident.use-case";
import type {
  CreateIncidentAttachmentUseCase
} from "../../application/use-cases/create-incident-attachment.use-case";
import type {
  CreateIncidentCommentUseCase
} from "../../application/use-cases/create-incident-comment.use-case";
import type { CreateIncidentUseCase } from "../../application/use-cases/create-incident.use-case";
import type { DeleteIncidentUseCase } from "../../application/use-cases/delete-incident.use-case";
import type { GetIncidentUseCase } from "../../application/use-cases/get-incident.use-case";
import type {
  ListIncidentAttachmentsUseCase
} from "../../application/use-cases/list-incident-attachments.use-case";
import type {
  ListIncidentCommentsUseCase
} from "../../application/use-cases/list-incident-comments.use-case";
import type {
  ListIncidentTimelineUseCase
} from "../../application/use-cases/list-incident-timeline.use-case";
import type { ListIncidentsUseCase } from "../../application/use-cases/list-incidents.use-case";
import type { ReopenIncidentUseCase } from "../../application/use-cases/reopen-incident.use-case";
import type { ResolveIncidentUseCase } from "../../application/use-cases/resolve-incident.use-case";
import type { UpdateIncidentUseCase } from "../../application/use-cases/update-incident.use-case";
import { IncidentsController } from "./incidents.controller";

describe("IncidentsController", () => {
  it("delegates incident creation to the create use case with the authenticated actor", async () => {
    const { controller, createIncidentUseCase } = createController();

    await controller.create(
      {
        title: "Checkout authorization failures",
        serviceId: serviceId(),
        severity: "sev2",
        priority: "high"
      },
      actor()
    );

    expect(createIncidentUseCase.execute).toHaveBeenCalledWith({
      title: "Checkout authorization failures",
      serviceId: serviceId(),
      severity: "sev2",
      priority: "high",
      actor: actor()
    });
  });

  it("normalizes missing list query values before calling the list use case", async () => {
    const { controller, listIncidentsUseCase } = createController();

    await controller.list({}, actor());

    expect(listIncidentsUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: undefined,
      severity: undefined,
      priority: undefined,
      serviceId: undefined,
      assigneeId: undefined,
      includeDeleted: false,
      search: undefined,
      sortBy: "updatedAt",
      sortDirection: "desc",
      actor: actor()
    });
  });

  it("delegates detail updates without adding controller business logic", async () => {
    const { controller, updateIncidentUseCase } = createController();

    await controller.update(
      incidentId(),
      {
        title: "Checkout failures after deploy"
      },
      actor()
    );

    expect(updateIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      title: "Checkout failures after deploy",
      description: undefined,
      customerImpact: undefined,
      actor: actor()
    });
  });

  it("delegates soft deletion to the delete use case", async () => {
    const { controller, deleteIncidentUseCase } = createController();

    await controller.delete(incidentId(), actor());

    expect(deleteIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      actor: actor()
    });
  });

  it("delegates assignment workflow commands", async () => {
    const { controller, assignIncidentUseCase } = createController();

    await controller.assign(
      incidentId(),
      {
        assigneeId: userId()
      },
      actor()
    );

    expect(assignIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      assigneeId: userId(),
      actor: actor()
    });
  });

  it("delegates status workflow commands", async () => {
    const { controller, changeIncidentStatusUseCase } = createController();

    await controller.changeStatus(
      incidentId(),
      {
        status: "investigating"
      },
      actor()
    );

    expect(changeIncidentStatusUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      status: "investigating",
      actor: actor()
    });
  });

  it("delegates severity workflow commands", async () => {
    const { controller, changeIncidentSeverityUseCase } = createController();

    await controller.changeSeverity(
      incidentId(),
      {
        severity: "sev1"
      },
      actor()
    );

    expect(changeIncidentSeverityUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      severity: "sev1",
      actor: actor()
    });
  });

  it("delegates resolve, reopen, and close workflow commands", async () => {
    const { controller, resolveIncidentUseCase, reopenIncidentUseCase, closeIncidentUseCase } =
      createController();

    await controller.resolve(
      incidentId(),
      {
        resolutionSummary: "Error rates returned to baseline."
      },
      actor()
    );
    await controller.reopen(
      incidentId(),
      {
        reason: "Error rates increased again."
      },
      actor()
    );
    await controller.close(incidentId(), actor());

    expect(resolveIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      resolutionSummary: "Error rates returned to baseline.",
      actor: actor()
    });
    expect(reopenIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      reason: "Error rates increased again.",
      actor: actor()
    });
    expect(closeIncidentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      actor: actor()
    });
  });

  it("delegates collaboration collection commands", async () => {
    const {
      controller,
      createIncidentCommentUseCase,
      listIncidentCommentsUseCase,
      createIncidentAttachmentUseCase,
      listIncidentAttachmentsUseCase,
      listIncidentTimelineUseCase
    } = createController();

    await controller.createComment(incidentId(), { body: "Checking logs with @alice." }, actor());
    await controller.listComments(incidentId(), {}, actor());
    await controller.createAttachment(
      incidentId(),
      {
        filename: "checkout-errors.json",
        contentType: "application/json",
        size: 2048
      },
      actor()
    );
    await controller.listAttachments(incidentId(), {}, actor());
    await controller.listTimeline(incidentId(), {}, actor());

    expect(createIncidentCommentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      body: "Checking logs with @alice.",
      actor: actor()
    });
    expect(listIncidentCommentsUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      page: 1,
      pageSize: 20,
      includeDeleted: false,
      actor: actor()
    });
    expect(createIncidentAttachmentUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      filename: "checkout-errors.json",
      contentType: "application/json",
      size: 2048,
      actor: actor()
    });
    expect(listIncidentAttachmentsUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      page: 1,
      pageSize: 20,
      includeDeleted: false,
      actor: actor()
    });
    expect(listIncidentTimelineUseCase.execute).toHaveBeenCalledWith({
      incidentId: incidentId(),
      page: 1,
      pageSize: 20,
      actor: actor()
    });
  });
});

function createController() {
  const createIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const getIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const listIncidentsUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
      }
    }))
  };
  const updateIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const deleteIncidentUseCase = {
    execute: vi.fn(async () => undefined)
  };
  const assignIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const changeIncidentStatusUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const changeIncidentSeverityUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const resolveIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const reopenIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const closeIncidentUseCase = {
    execute: vi.fn(async () => ({
      incident: incidentDetail()
    }))
  };
  const createIncidentCommentUseCase = {
    execute: vi.fn(async () => ({
      comment: incidentComment()
    }))
  };
  const listIncidentCommentsUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: pagination()
    }))
  };
  const createIncidentAttachmentUseCase = {
    execute: vi.fn(async () => ({
      attachment: incidentAttachment()
    }))
  };
  const listIncidentAttachmentsUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: pagination()
    }))
  };
  const listIncidentTimelineUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: pagination()
    }))
  };

  return {
    controller: new IncidentsController(
      createIncidentUseCase as unknown as CreateIncidentUseCase,
      getIncidentUseCase as unknown as GetIncidentUseCase,
      listIncidentsUseCase as unknown as ListIncidentsUseCase,
      updateIncidentUseCase as unknown as UpdateIncidentUseCase,
      deleteIncidentUseCase as unknown as DeleteIncidentUseCase,
      assignIncidentUseCase as unknown as AssignIncidentUseCase,
      changeIncidentStatusUseCase as unknown as ChangeIncidentStatusUseCase,
      changeIncidentSeverityUseCase as unknown as ChangeIncidentSeverityUseCase,
      resolveIncidentUseCase as unknown as ResolveIncidentUseCase,
      reopenIncidentUseCase as unknown as ReopenIncidentUseCase,
      closeIncidentUseCase as unknown as CloseIncidentUseCase,
      createIncidentCommentUseCase as unknown as CreateIncidentCommentUseCase,
      listIncidentCommentsUseCase as unknown as ListIncidentCommentsUseCase,
      createIncidentAttachmentUseCase as unknown as CreateIncidentAttachmentUseCase,
      listIncidentAttachmentsUseCase as unknown as ListIncidentAttachmentsUseCase,
      listIncidentTimelineUseCase as unknown as ListIncidentTimelineUseCase
    ),
    createIncidentUseCase,
    getIncidentUseCase,
    listIncidentsUseCase,
    updateIncidentUseCase,
    deleteIncidentUseCase,
    assignIncidentUseCase,
    changeIncidentStatusUseCase,
    changeIncidentSeverityUseCase,
    resolveIncidentUseCase,
    reopenIncidentUseCase,
    closeIncidentUseCase,
    createIncidentCommentUseCase,
    listIncidentCommentsUseCase,
    createIncidentAttachmentUseCase,
    listIncidentAttachmentsUseCase,
    listIncidentTimelineUseCase
  };
}

function actor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["incidents:read", "incidents:write"]
  };
}

function incidentDetail() {
  return {
    id: incidentId(),
    title: "Checkout authorization failures",
    serviceId: serviceId(),
    serviceName: "Payments API",
    severity: "sev2" as const,
    priority: "high" as const,
    status: "open" as const,
    assigneeId: null,
    assigneeName: null,
    startedAt: "2026-08-07T10:00:00.000Z",
    updatedAt: "2026-08-07T10:00:00.000Z",
    customerImpact: null,
    description: null,
    reporterId: userId(),
    reporterName: "PlusOps Developer",
    resolvedAt: null,
    closedAt: null,
    deletedAt: null,
    comments: [],
    timeline: [],
    tags: []
  };
}

function incidentComment() {
  return {
    id: "f6f4a0ea-301c-4bfc-9973-280ab0c742f8",
    incidentId: incidentId(),
    authorId: userId(),
    authorName: "PlusOps Developer",
    body: "Checking logs with @alice.",
    editedAt: null,
    createdAt: "2026-08-07T10:00:00.000Z",
    deletedAt: null,
    mentions: []
  };
}

function incidentAttachment() {
  return {
    id: "5d567c48-dcda-4497-9e8b-b0edaaef18f3",
    incidentId: incidentId(),
    filename: "checkout-errors.json",
    contentType: "application/json",
    size: 2048,
    uploadedByUserId: userId(),
    uploadedByName: "PlusOps Developer",
    uploadedAt: "2026-08-07T10:00:00.000Z",
    storageKey: "incidents/79a7ea92-5a3e-43bb-9d5a-530c7d662a04/attachments/file",
    deletedAt: null
  };
}

function pagination() {
  return {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}
