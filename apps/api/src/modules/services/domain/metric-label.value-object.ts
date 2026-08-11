import type { MetricLabel as MetricLabelContract } from "@plusops/contracts";

import { MetricDomainError } from "./metric-domain.error";

const riskyHighCardinalityKeys = new Set([
  "user",
  "user_id",
  "userid",
  "email",
  "ip",
  "ip_address",
  "request_id",
  "requestid",
  "trace_id",
  "traceid",
  "span_id",
  "spanid",
  "session_id",
  "sessionid",
  "token",
  "uuid"
]);

export class MetricLabel {
  private constructor(
    readonly key: string,
    readonly value: string
  ) {}

  static create(input: MetricLabelContract): MetricLabel {
    const key = input.key.trim().toLowerCase();
    const value = input.value.trim();

    if (!/^[a-z][a-z0-9_]*$/.test(key) || key.length > 63) {
      throw new MetricDomainError(
        "Metric label keys must be snake_case and 63 characters or fewer."
      );
    }

    if (value.length < 1 || value.length > 120) {
      throw new MetricDomainError("Metric label values must be between 1 and 120 characters.");
    }

    if (riskyHighCardinalityKeys.has(key)) {
      throw new MetricDomainError(`Metric label key '${key}' is too high-cardinality.`);
    }

    return new MetricLabel(key, value);
  }

  static normalizeMany(labels: MetricLabelContract[] = []): MetricLabelContract[] {
    if (labels.length > 10) {
      throw new MetricDomainError("Metric series cannot have more than 10 labels.");
    }

    const normalized = labels.map((label) => MetricLabel.create(label));
    const seenKeys = new Set<string>();

    for (const label of normalized) {
      if (seenKeys.has(label.key)) {
        throw new MetricDomainError(`Metric label key '${label.key}' is duplicated.`);
      }

      seenKeys.add(label.key);
    }

    return normalized
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((label) => label.toObject());
  }

  static hash(labels: MetricLabelContract[]): string {
    return MetricLabel.normalizeMany(labels)
      .map((label) => `${label.key}=${label.value}`)
      .join("|");
  }

  toObject(): MetricLabelContract {
    return {
      key: this.key,
      value: this.value
    };
  }
}
