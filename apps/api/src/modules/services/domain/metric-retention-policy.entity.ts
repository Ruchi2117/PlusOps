import { MetricDomainError } from "./metric-domain.error";

export type MetricRetentionPolicySnapshot = {
  id: string;
  name: string;
  retentionDays: number;
  resolutionSeconds: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class MetricRetentionPolicy {
  private constructor(private snapshot: MetricRetentionPolicySnapshot) {
    validateSnapshot(snapshot);
  }

  static create(snapshot: MetricRetentionPolicySnapshot): MetricRetentionPolicy {
    return new MetricRetentionPolicy({
      ...snapshot,
      name: snapshot.name.trim()
    });
  }

  static restore(snapshot: MetricRetentionPolicySnapshot): MetricRetentionPolicy {
    return MetricRetentionPolicy.create(snapshot);
  }

  get id(): string {
    return this.snapshot.id;
  }

  toSnapshot(): MetricRetentionPolicySnapshot {
    return { ...this.snapshot };
  }
}

function validateSnapshot(snapshot: MetricRetentionPolicySnapshot): void {
  if (snapshot.name.length < 2 || snapshot.name.length > 80) {
    throw new MetricDomainError(
      "Metric retention policy name must be between 2 and 80 characters."
    );
  }

  if (
    !Number.isInteger(snapshot.retentionDays) ||
    snapshot.retentionDays < 1 ||
    snapshot.retentionDays > 3650
  ) {
    throw new MetricDomainError("Metric retention must be between 1 and 3650 days.");
  }

  if (
    !Number.isInteger(snapshot.resolutionSeconds) ||
    snapshot.resolutionSeconds < 1 ||
    snapshot.resolutionSeconds > 86_400
  ) {
    throw new MetricDomainError("Metric resolution must be between 1 and 86400 seconds.");
  }
}
