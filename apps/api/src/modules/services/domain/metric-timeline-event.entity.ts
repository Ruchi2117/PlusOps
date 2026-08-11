import type { MetricTimelineEventType } from "@plusops/contracts";
import { metricTimelineEventTypeValues } from "@plusops/contracts";

import { MetricDomainError } from "./metric-domain.error";

export type MetricTimelineEventSnapshot = {
  id: string;
  serviceId: string;
  metricDefinitionId: string | null;
  actorUserId: string | null;
  type: MetricTimelineEventType;
  message: string;
  fromValue: string | null;
  toValue: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type CreateMetricTimelineEventInput = MetricTimelineEventSnapshot;

export class MetricTimelineEvent {
  private constructor(private snapshot: MetricTimelineEventSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateMetricTimelineEventInput): MetricTimelineEvent {
    return new MetricTimelineEvent({
      ...input,
      message: input.message.trim(),
      metadata: input.metadata ? { ...input.metadata } : null
    });
  }

  toSnapshot(): MetricTimelineEventSnapshot {
    return {
      ...this.snapshot,
      metadata: this.snapshot.metadata ? { ...this.snapshot.metadata } : null
    };
  }
}

function validateSnapshot(snapshot: MetricTimelineEventSnapshot): void {
  if (!metricTimelineEventTypeValues.includes(snapshot.type)) {
    throw new MetricDomainError("Metric timeline event type is invalid.");
  }

  if (snapshot.message.length < 1 || snapshot.message.length > 1000) {
    throw new MetricDomainError(
      "Metric timeline event message must be between 1 and 1000 characters."
    );
  }
}
