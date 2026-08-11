import type { MetricLabel as MetricLabelContract, MetricUnit } from "@plusops/contracts";

import type { MetricDefinitionSnapshot } from "./metric-definition.entity";
import { MetricDomainError } from "./metric-domain.error";
import { MetricLabel } from "./metric-label.value-object";

export type MetricSampleSnapshot = {
  id: string;
  metricDefinitionId: string;
  metricSeriesId: string;
  serviceId: string;
  timestamp: Date;
  value: number;
  labels: MetricLabelContract[];
  source: string;
  retentionPolicyId: string | null;
  createdAt: Date;
};

export type CreateMetricSampleInput = {
  id: string;
  metricDefinition: MetricDefinitionSnapshot;
  metricSeriesId: string;
  timestamp: Date;
  value: number;
  labels?: MetricLabelContract[];
  source: string;
  retentionPolicyId?: string | null;
  createdAt: Date;
};

export class MetricSample {
  private constructor(private snapshot: MetricSampleSnapshot) {
    validateSample(snapshot);
  }

  static create(input: CreateMetricSampleInput): MetricSample {
    const labels = MetricLabel.normalizeMany(input.labels ?? []);
    validateValueForUnit(input.value, input.metricDefinition.unit);

    if (input.metricDefinition.type === "counter" && input.value < 0) {
      throw new MetricDomainError("Counter metric samples cannot be negative.");
    }

    return new MetricSample({
      id: input.id,
      metricDefinitionId: input.metricDefinition.id,
      metricSeriesId: input.metricSeriesId,
      serviceId: input.metricDefinition.serviceId,
      timestamp: input.timestamp,
      value: input.value,
      labels,
      source: input.source.trim() || "manual",
      retentionPolicyId: input.retentionPolicyId ?? input.metricDefinition.retentionPolicyId,
      createdAt: input.createdAt
    });
  }

  static restore(snapshot: MetricSampleSnapshot): MetricSample {
    return new MetricSample({
      ...snapshot,
      labels: MetricLabel.normalizeMany(snapshot.labels),
      source: snapshot.source.trim() || "manual"
    });
  }

  toSnapshot(): MetricSampleSnapshot {
    return {
      ...this.snapshot,
      labels: this.snapshot.labels.map((label) => ({ ...label }))
    };
  }
}

function validateSample(snapshot: MetricSampleSnapshot): void {
  if (!Number.isFinite(snapshot.value)) {
    throw new MetricDomainError("Metric sample value must be finite.");
  }

  if (snapshot.source.length < 1 || snapshot.source.length > 120) {
    throw new MetricDomainError("Metric sample source must be between 1 and 120 characters.");
  }
}

function validateValueForUnit(value: number, unit: MetricUnit): void {
  if (unit === "percent" && (value < 0 || value > 100)) {
    throw new MetricDomainError("Percent metric samples must be between 0 and 100.");
  }
}
