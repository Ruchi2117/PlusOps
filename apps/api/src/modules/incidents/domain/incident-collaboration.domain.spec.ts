import { describe, expect, it } from "vitest";

import { IncidentAttachment } from "./incident-attachment.entity";
import { IncidentComment } from "./incident-comment.entity";
import { IncidentDomainError } from "./incident-domain.error";
import { extractMentionHandles } from "./incident-mention.entity";

const now = new Date("2026-08-07T10:00:00.000Z");
const later = new Date("2026-08-07T10:05:00.000Z");

describe("Incident collaboration domain", () => {
  it("creates, edits, and soft deletes comments", () => {
    const comment = IncidentComment.create({
      id: commentId(),
      incidentId: incidentId(),
      authorId: userId(),
      body: "  Checking logs with @alice.  ",
      createdAt: now
    });

    comment.updateBody(" Mitigation deployed. ", later);
    comment.markDeleted(new Date("2026-08-07T10:10:00.000Z"));

    expect(comment.toSnapshot()).toMatchObject({
      body: "Mitigation deployed.",
      editedAt: later,
      deletedAt: new Date("2026-08-07T10:10:00.000Z")
    });
  });

  it("rejects blank comments and editing deleted comments", () => {
    expect(() =>
      IncidentComment.create({
        id: commentId(),
        incidentId: incidentId(),
        authorId: userId(),
        body: "   ",
        createdAt: now
      })
    ).toThrow(IncidentDomainError);

    const comment = createComment();
    comment.markDeleted(later);

    expect(() => comment.updateBody("New body", later)).toThrow(IncidentDomainError);
  });

  it("validates attachment metadata", () => {
    const attachment = IncidentAttachment.create({
      id: attachmentId(),
      incidentId: incidentId(),
      uploadedByUserId: userId(),
      filename: " checkout-errors.json ",
      contentType: " application/json ",
      size: 2048,
      storageKey: "incidents/incident-1/attachments/file",
      uploadedAt: now
    });

    expect(attachment.toSnapshot()).toMatchObject({
      filename: "checkout-errors.json",
      contentType: "application/json",
      size: 2048,
      deletedAt: null
    });
  });

  it("rejects invalid attachment metadata", () => {
    expect(() =>
      IncidentAttachment.create({
        id: attachmentId(),
        incidentId: incidentId(),
        uploadedByUserId: userId(),
        filename: "",
        contentType: "application/json",
        size: 2048,
        storageKey: "storage-key",
        uploadedAt: now
      })
    ).toThrow(IncidentDomainError);

    expect(() =>
      IncidentAttachment.create({
        id: attachmentId(),
        incidentId: incidentId(),
        uploadedByUserId: userId(),
        filename: "trace.json",
        contentType: "application/json",
        size: 0,
        storageKey: "storage-key",
        uploadedAt: now
      })
    ).toThrow(IncidentDomainError);
  });

  it("extracts unique mentions without matching email addresses", () => {
    expect(
      extractMentionHandles("Looping in @Alice and @bob. Email alice@example.com. @alice")
    ).toEqual(["alice", "bob"]);
  });
});

function createComment(): IncidentComment {
  return IncidentComment.create({
    id: commentId(),
    incidentId: incidentId(),
    authorId: userId(),
    body: "Checking logs.",
    createdAt: now
  });
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

function attachmentId(): string {
  return "5d567c48-dcda-4497-9e8b-b0edaaef18f3";
}
