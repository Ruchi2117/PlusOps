import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type { DeleteIncidentAttachmentUseCase } from "../../application/use-cases/delete-incident-attachment.use-case";
import type { DownloadIncidentAttachmentUseCase } from "../../application/use-cases/download-incident-attachment.use-case";
import { AttachmentsController } from "./attachments.controller";

describe("AttachmentsController", () => {
  it("delegates attachment metadata deletion to the use case", async () => {
    const deleteIncidentAttachmentUseCase = {
      execute: vi.fn(async () => undefined)
    };
    const downloadIncidentAttachmentUseCase = {
      execute: vi.fn()
    };
    const controller = new AttachmentsController(
      deleteIncidentAttachmentUseCase as unknown as DeleteIncidentAttachmentUseCase,
      downloadIncidentAttachmentUseCase as unknown as DownloadIncidentAttachmentUseCase
    );

    await controller.delete(attachmentId(), actor());

    expect(deleteIncidentAttachmentUseCase.execute).toHaveBeenCalledWith({
      attachmentId: attachmentId(),
      actor: actor()
    });
  });

  it("returns uploaded attachment bytes through a protected download response", async () => {
    const deleteIncidentAttachmentUseCase = { execute: vi.fn() };
    const downloadIncidentAttachmentUseCase = {
      execute: vi.fn(async () => ({
        content: Buffer.from("incident evidence"),
        contentType: "text/plain",
        filename: "evidence.txt"
      }))
    };
    const controller = new AttachmentsController(
      deleteIncidentAttachmentUseCase as unknown as DeleteIncidentAttachmentUseCase,
      downloadIncidentAttachmentUseCase as unknown as DownloadIncidentAttachmentUseCase
    );

    const result = await controller.download(attachmentId(), actor());

    expect(downloadIncidentAttachmentUseCase.execute).toHaveBeenCalledWith({
      attachmentId: attachmentId(),
      actor: actor()
    });
    expect(result.getStream()).toBeDefined();
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
