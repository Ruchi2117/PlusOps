import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type { DeleteIncidentCommentUseCase } from "../../application/use-cases/delete-incident-comment.use-case";
import type { UpdateIncidentCommentUseCase } from "../../application/use-cases/update-incident-comment.use-case";
import { CommentsController } from "./comments.controller";

describe("CommentsController", () => {
  it("delegates comment updates to the use case", async () => {
    const { controller, updateIncidentCommentUseCase } = createController();

    await controller.update(commentId(), { body: "Updated mitigation notes." }, actor());

    expect(updateIncidentCommentUseCase.execute).toHaveBeenCalledWith({
      commentId: commentId(),
      body: "Updated mitigation notes.",
      actor: actor()
    });
  });

  it("delegates comment soft deletion to the use case", async () => {
    const { controller, deleteIncidentCommentUseCase } = createController();

    await controller.delete(commentId(), actor());

    expect(deleteIncidentCommentUseCase.execute).toHaveBeenCalledWith({
      commentId: commentId(),
      actor: actor()
    });
  });
});

function createController() {
  const updateIncidentCommentUseCase = {
    execute: vi.fn(async () => ({
      comment: {
        id: commentId(),
        incidentId: incidentId(),
        authorId: userId(),
        authorName: "PlusOps Developer",
        body: "Updated mitigation notes.",
        editedAt: "2026-08-07T10:05:00.000Z",
        createdAt: "2026-08-07T10:00:00.000Z",
        deletedAt: null,
        mentions: []
      }
    }))
  };
  const deleteIncidentCommentUseCase = {
    execute: vi.fn(async () => undefined)
  };

  return {
    controller: new CommentsController(
      updateIncidentCommentUseCase as unknown as UpdateIncidentCommentUseCase,
      deleteIncidentCommentUseCase as unknown as DeleteIncidentCommentUseCase
    ),
    updateIncidentCommentUseCase,
    deleteIncidentCommentUseCase
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

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}

function commentId(): string {
  return "f6f4a0ea-301c-4bfc-9973-280ab0c742f8";
}
