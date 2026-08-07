import { Injectable } from "@nestjs/common";

import type {
  CreateIncidentAttachmentStorageKeyInput,
  IncidentAttachmentStoragePort
} from "../../application/ports";

@Injectable()
export class LocalIncidentAttachmentStorage implements IncidentAttachmentStoragePort {
  createStorageKey(input: CreateIncidentAttachmentStorageKeyInput): string {
    return [
      "incidents",
      input.incidentId,
      "attachments",
      input.attachmentId,
      sanitizeFilename(input.filename)
    ].join("/");
  }
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "attachment";
}
