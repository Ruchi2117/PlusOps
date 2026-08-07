import { IncidentDomainError } from "./incident-domain.error";

export type IncidentMentionSnapshot = {
  id: string;
  incidentId: string;
  commentId: string;
  mentionedUserId: string;
  handle: string;
  createdAt: Date;
};

export type CreateIncidentMentionInput = IncidentMentionSnapshot;

export class IncidentMention {
  private constructor(private readonly snapshot: IncidentMentionSnapshot) {
    validateHandle(snapshot.handle);
  }

  static create(input: CreateIncidentMentionInput): IncidentMention {
    return new IncidentMention({
      ...input,
      handle: normalizeHandle(input.handle)
    });
  }

  static restore(snapshot: IncidentMentionSnapshot): IncidentMention {
    return new IncidentMention({
      ...snapshot,
      handle: normalizeHandle(snapshot.handle)
    });
  }

  toSnapshot(): IncidentMentionSnapshot {
    return { ...this.snapshot };
  }
}

export function extractMentionHandles(body: string): string[] {
  const handles = new Set<string>();
  const mentionPattern = /(^|[^\w])@([a-zA-Z0-9][a-zA-Z0-9_-]{1,39})\b/g;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(body)) !== null) {
    handles.add(normalizeHandle(match[2] ?? ""));
  }

  return Array.from(handles);
}

function validateHandle(handle: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(normalizeHandle(handle))) {
    throw new IncidentDomainError("Incident mention handle is invalid.");
  }
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}
