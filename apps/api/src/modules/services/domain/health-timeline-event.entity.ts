import type { HealthTimelineEventType, ServiceHealthStatus } from "@plusops/contracts";

import { HealthDomainError } from "./health-domain.error";

export type HealthTimelineEventSnapshot = {
  id: string;
  serviceId: string;
  healthCheckId: string | null;
  actorUserId: string | null;
  type: HealthTimelineEventType;
  message: string;
  fromStatus: ServiceHealthStatus | null;
  toStatus: ServiceHealthStatus | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type CreateHealthTimelineEventInput = HealthTimelineEventSnapshot;

export class HealthTimelineEvent {
  private constructor(private snapshot: HealthTimelineEventSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateHealthTimelineEventInput): HealthTimelineEvent {
    return new HealthTimelineEvent({
      ...input,
      message: input.message.trim(),
      metadata: input.metadata ? { ...input.metadata } : null
    });
  }

  toSnapshot(): HealthTimelineEventSnapshot {
    return {
      ...this.snapshot,
      metadata: this.snapshot.metadata ? { ...this.snapshot.metadata } : null
    };
  }
}

function validateSnapshot(snapshot: HealthTimelineEventSnapshot): void {
  if (
    ![
      "service_health_degraded",
      "service_health_unhealthy",
      "service_health_recovered",
      "service_health_unknown",
      "health_check_failed",
      "health_check_restored"
    ].includes(snapshot.type)
  ) {
    throw new HealthDomainError("Health timeline event type is invalid.");
  }

  if (snapshot.message.length < 1 || snapshot.message.length > 1000) {
    throw new HealthDomainError(
      "Health timeline event message must be between 1 and 1000 characters."
    );
  }
}
