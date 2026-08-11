import type { MetricLabel as MetricLabelContract } from "@plusops/contracts";

import { MetricLabel } from "./metric-label.value-object";

export type MetricSeriesSnapshot = {
  id: string;
  metricDefinitionId: string;
  serviceId: string;
  labels: MetricLabelContract[];
  labelHash: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  lastSampleAt: Date | null;
};

export type CreateMetricSeriesInput = {
  id: string;
  metricDefinitionId: string;
  serviceId: string;
  labels?: MetricLabelContract[];
  source: string;
  createdAt: Date;
};

export class MetricSeries {
  private constructor(private snapshot: MetricSeriesSnapshot) {}

  static create(input: CreateMetricSeriesInput): MetricSeries {
    const labels = MetricLabel.normalizeMany(input.labels ?? []);

    return new MetricSeries({
      id: input.id,
      metricDefinitionId: input.metricDefinitionId,
      serviceId: input.serviceId,
      labels,
      labelHash: MetricLabel.hash(labels),
      source: normalizeSource(input.source),
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      lastSampleAt: null
    });
  }

  static restore(snapshot: MetricSeriesSnapshot): MetricSeries {
    const labels = MetricLabel.normalizeMany(snapshot.labels);

    return new MetricSeries({
      ...snapshot,
      labels,
      labelHash: snapshot.labelHash || MetricLabel.hash(labels),
      source: normalizeSource(snapshot.source)
    });
  }

  recordSample(sampledAt: Date): void {
    this.snapshot = {
      ...this.snapshot,
      lastSampleAt: sampledAt,
      updatedAt: sampledAt
    };
  }

  get id(): string {
    return this.snapshot.id;
  }

  get labelHash(): string {
    return this.snapshot.labelHash;
  }

  toSnapshot(): MetricSeriesSnapshot {
    return {
      ...this.snapshot,
      labels: this.snapshot.labels.map((label) => ({ ...label }))
    };
  }
}

function normalizeSource(source: string): string {
  return source.trim() || "manual";
}
