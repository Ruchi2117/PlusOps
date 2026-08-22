import { Injectable } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

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

  async save(storageKey: string, content: Buffer): Promise<void> {
    const path = this.resolveStoragePath(storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStoragePath(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolveStoragePath(storageKey), { force: true });
  }

  private resolveStoragePath(storageKey: string): string {
    const root = resolve(process.env.PLUSOPS_UPLOAD_DIR ?? join(process.cwd(), ".plusops", "uploads"));
    const path = resolve(root, storageKey);

    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      throw new Error("Attachment storage path escapes the configured upload directory.");
    }

    return path;
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
