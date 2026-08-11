import type { AlertState, AlertTimelineEventType } from "@plusops/contracts";
import { alertTimelineEventTypeValues } from "@plusops/contracts";

import { AlertDomainError } from "./alert-domain.error";

export type AlertTimelineEventSnapshot = {
  id: string;
  alertRuleId: string;
  actorUserId: string | null;
  type: AlertTimelineEventType;
  message: string;
  fromState: AlertState | null;
  toState: AlertState | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export class AlertTimelineEvent {
  private constructor(private snapshot: AlertTimelineEventSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: AlertTimelineEventSnapshot): AlertTimelineEvent {
    return new AlertTimelineEvent({
      ...input,
      message: input.message.trim(),
      metadata: input.metadata ? { ...input.metadata } : null
    });
  }

  toSnapshot(): AlertTimelineEventSnapshot {
    return {
      ...this.snapshot,
      metadata: this.snapshot.metadata ? { ...this.snapshot.metadata } : null
    };
  }
}

function validateSnapshot(snapshot: AlertTimelineEventSnapshot): void {
  if (!alertTimelineEventTypeValues.includes(snapshot.type)) {
    throw new AlertDomainError("Alert timeline event type is invalid.");
  }

  if (snapshot.message.length < 1 || snapshot.message.length > 1000) {
    throw new AlertDomainError(
      "Alert timeline event message must be between 1 and 1000 characters."
    );
  }
}
