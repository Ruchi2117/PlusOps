import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  DeleteIncidentAttachmentUseCase
} from "../../application/use-cases/delete-incident-attachment.use-case";
import { AttachmentsController } from "./attachments.controller";

describe("AttachmentsController", () => {
  it("delegates attachment metadata deletion to the use case", async () => {
    const deleteIncidentAttachmentUseCase = {
      execute: vi.fn(async () => undefined)
    };
    const controller = new AttachmentsController(
      deleteIncidentAttachmentUseCase as unknown as DeleteIncidentAttachmentUseCase
    );

    await controller.delete(attachmentId(), actor());

    expect(deleteIncidentAttachmentUseCase.execute).toHaveBeenCalledWith({
      attachmentId: attachmentId(),
      actor: actor()
    });
  });
});

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

function attachmentId(): string {
  return "5d567c48-dcda-4497-9e8b-b0edaaef18f3";
}
