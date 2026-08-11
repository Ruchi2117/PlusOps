import type { AlertOperator, AlertThreshold as AlertThresholdContract } from "@plusops/contracts";

import { AlertDomainError } from "./alert-domain.error";

export class AlertThreshold {
  private constructor(private readonly snapshot: AlertThresholdContract) {
    validateThreshold(snapshot);
  }

  static create(input: AlertThresholdContract): AlertThreshold {
    return new AlertThreshold({ ...input });
  }

  evaluate(value: number): boolean {
    const threshold = this.snapshot;

    switch (threshold.operator) {
      case "greater_than":
        return value > requiredValue(threshold.value);
      case "less_than":
        return value < requiredValue(threshold.value);
      case "equals":
        return value === requiredValue(threshold.value);
      case "not_equals":
        return value !== requiredValue(threshold.value);
      case "between":
        return value >= requiredValue(threshold.min) && value <= requiredValue(threshold.max);
      case "outside_range":
        return value < requiredValue(threshold.min) || value > requiredValue(threshold.max);
      default:
        throw new AlertDomainError("Alert threshold operator is invalid.");
    }
  }

  summary(): string {
    const threshold = this.snapshot;

    if (threshold.operator === "between" || threshold.operator === "outside_range") {
      return `${threshold.operator} ${requiredValue(threshold.min)} and ${requiredValue(
        threshold.max
      )}`;
    }

    return `${threshold.operator} ${requiredValue(threshold.value)}`;
  }

  toObject(): AlertThresholdContract {
    return { ...this.snapshot };
  }
}

function validateThreshold(threshold: AlertThresholdContract): void {
  if (threshold.operator === "between" || threshold.operator === "outside_range") {
    if (threshold.min === undefined || threshold.max === undefined) {
      throw new AlertDomainError("Range thresholds require min and max values.");
    }

    if (threshold.min > threshold.max) {
      throw new AlertDomainError("Range threshold min cannot be greater than max.");
    }

    return;
  }

  if (!singleValueOperators.has(threshold.operator) || threshold.value === undefined) {
    throw new AlertDomainError("Single-value thresholds require value.");
  }
}

function requiredValue(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new AlertDomainError("Alert threshold value must be finite.");
  }

  return value;
}

const singleValueOperators = new Set<AlertOperator>([
  "greater_than",
  "less_than",
  "equals",
  "not_equals"
]);
