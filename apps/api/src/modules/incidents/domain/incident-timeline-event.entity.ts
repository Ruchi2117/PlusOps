import type { IncidentTimelineEventType } from "@plusops/contracts";

import { IncidentDomainError } from "./incident-domain.error";

export type IncidentTimelineEventSnapshot = {
  id: string;
  incidentId: string;
  actorUserId: string | null;
  type: IncidentTimelineEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type CreateIncidentTimelineEventInput = {
  id: string;
  incidentId: string;
  actorUserId: string | null;
  type: IncidentTimelineEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export class IncidentTimelineEvent {
  private constructor(private readonly snapshot: IncidentTimelineEventSnapshot) {
    validateMessage(snapshot.message);
  }

  static create(input: CreateIncidentTimelineEventInput): IncidentTimelineEvent {
    return new IncidentTimelineEvent({
      ...input,
      message: input.message.trim()
    });
  }

  static restore(snapshot: IncidentTimelineEventSnapshot): IncidentTimelineEvent {
    return new IncidentTimelineEvent({
      ...snapshot,
      message: snapshot.message.trim()
    });
  }

  toSnapshot(): IncidentTimelineEventSnapshot {
    return { ...this.snapshot };
  }
}

function validateMessage(message: string): void {
  const normalized = message.trim();

  if (!normalized) {
    throw new IncidentDomainError("Incident timeline message is required.");
  }

  if (normalized.length > 1000) {
    throw new IncidentDomainError("Incident timeline message must be 1000 characters or fewer.");
  }
}
