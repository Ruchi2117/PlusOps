import { IncidentDomainError } from "./incident-domain.error";

const maxCommentBodyLength = 5000;

export type IncidentCommentSnapshot = {
  id: string;
  incidentId: string;
  authorId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type CreateIncidentCommentInput = {
  id: string;
  incidentId: string;
  authorId: string;
  body: string;
  createdAt: Date;
};

export class IncidentComment {
  private constructor(private snapshot: IncidentCommentSnapshot) {
    validateBody(snapshot.body);
  }

  static create(input: CreateIncidentCommentInput): IncidentComment {
    return new IncidentComment({
      id: input.id,
      incidentId: input.incidentId,
      authorId: input.authorId,
      body: normalizeBody(input.body),
      editedAt: null,
      createdAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: IncidentCommentSnapshot): IncidentComment {
    return new IncidentComment({
      ...snapshot,
      body: normalizeBody(snapshot.body)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get incidentId(): string {
    return this.snapshot.incidentId;
  }

  get authorId(): string {
    return this.snapshot.authorId;
  }

  updateBody(body: string, editedAt: Date): void {
    this.assertNotDeleted();

    this.snapshot = {
      ...this.snapshot,
      body: normalizeBody(body),
      editedAt
    };
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

  toSnapshot(): IncidentCommentSnapshot {
    return { ...this.snapshot };
  }

  private assertNotDeleted(): void {
    if (this.snapshot.deletedAt) {
      throw new IncidentDomainError("Deleted incident comments cannot be edited.");
    }
  }
}

function validateBody(body: string): void {
  const normalized = normalizeBody(body);

  if (!normalized) {
    throw new IncidentDomainError("Incident comment body is required.");
  }

  if (normalized.length > maxCommentBodyLength) {
    throw new IncidentDomainError("Incident comment body must be 5000 characters or fewer.");
  }
}

function normalizeBody(body: string): string {
  return body.trim();
}
