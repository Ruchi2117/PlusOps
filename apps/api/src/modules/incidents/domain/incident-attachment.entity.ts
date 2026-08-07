import { IncidentDomainError } from "./incident-domain.error";

export type IncidentAttachmentSnapshot = {
  id: string;
  incidentId: string;
  uploadedByUserId: string;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  uploadedAt: Date;
  deletedAt: Date | null;
};

export type CreateIncidentAttachmentInput = {
  id: string;
  incidentId: string;
  uploadedByUserId: string;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  uploadedAt: Date;
};

export class IncidentAttachment {
  private constructor(private snapshot: IncidentAttachmentSnapshot) {
    validateAttachment(snapshot);
  }

  static create(input: CreateIncidentAttachmentInput): IncidentAttachment {
    return new IncidentAttachment({
      ...input,
      filename: input.filename.trim(),
      contentType: input.contentType.trim(),
      storageKey: input.storageKey.trim(),
      deletedAt: null
    });
  }

  static restore(snapshot: IncidentAttachmentSnapshot): IncidentAttachment {
    return new IncidentAttachment({
      ...snapshot,
      filename: snapshot.filename.trim(),
      contentType: snapshot.contentType.trim(),
      storageKey: snapshot.storageKey.trim()
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get incidentId(): string {
    return this.snapshot.incidentId;
  }

  get uploadedByUserId(): string {
    return this.snapshot.uploadedByUserId;
  }

  markDeleted(deletedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      deletedAt
    };
  }

  toSnapshot(): IncidentAttachmentSnapshot {
    return { ...this.snapshot };
  }
}

function validateAttachment(snapshot: IncidentAttachmentSnapshot): void {
  if (!snapshot.filename.trim()) {
    throw new IncidentDomainError("Incident attachment filename is required.");
  }

  if (snapshot.filename.length > 255) {
    throw new IncidentDomainError("Incident attachment filename must be 255 characters or fewer.");
  }

  if (!snapshot.contentType.trim()) {
    throw new IncidentDomainError("Incident attachment content type is required.");
  }

  if (snapshot.contentType.length > 120) {
    throw new IncidentDomainError(
      "Incident attachment content type must be 120 characters or fewer."
    );
  }

  if (!Number.isInteger(snapshot.size) || snapshot.size <= 0 || snapshot.size > 50_000_000) {
    throw new IncidentDomainError("Incident attachment size must be between 1 and 50000000 bytes.");
  }

  if (!snapshot.storageKey.trim()) {
    throw new IncidentDomainError("Incident attachment storage key is required.");
  }

  if (snapshot.storageKey.length > 500) {
    throw new IncidentDomainError(
      "Incident attachment storage key must be 500 characters or fewer."
    );
  }
}
