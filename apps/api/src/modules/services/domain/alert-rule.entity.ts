import type {
  AlertCondition,
  AlertSeverity,
  AlertState,
  MetricAggregation,
  MetricLabel
} from "@plusops/contracts";

import { AlertDomainError } from "./alert-domain.error";
import { AlertThreshold } from "./alert-threshold.value-object";
import { MetricLabel as MetricLabelValue } from "./metric-label.value-object";

export type AlertRuleSnapshot = {
  id: string;
  name: string;
  description: string | null;
  severity: AlertSeverity;
  state: AlertState;
  condition: AlertCondition;
  isEnabled: boolean;
  mutedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateAlertRuleInput = {
  id: string;
  name: string;
  description?: string | null;
  severity: AlertSeverity;
  condition: AlertCondition;
  isEnabled?: boolean;
  mutedUntil?: Date | null;
  createdAt: Date;
};

export type UpdateAlertRuleInput = Partial<
  Pick<
    AlertRuleSnapshot,
    "name" | "description" | "severity" | "condition" | "isEnabled" | "mutedUntil"
  >
> & {
  updatedAt: Date;
};

export class AlertRule {
  private constructor(private snapshot: AlertRuleSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateAlertRuleInput): AlertRule {
    return new AlertRule({
      id: input.id,
      name: normalizeRequiredText(input.name),
      description: normalizeOptionalText(input.description),
      severity: input.severity,
      state: "ok",
      condition: normalizeCondition(input.condition),
      isEnabled: input.isEnabled ?? true,
      mutedUntil: input.mutedUntil ?? null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: AlertRuleSnapshot): AlertRule {
    return new AlertRule({
      ...snapshot,
      name: normalizeRequiredText(snapshot.name),
      description: normalizeOptionalText(snapshot.description),
      condition: normalizeCondition(snapshot.condition)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get state(): AlertState {
    return this.snapshot.state;
  }

  update(input: UpdateAlertRuleInput): void {
    this.assertActive();

    this.snapshot = {
      ...this.snapshot,
      name: input.name === undefined ? this.snapshot.name : normalizeRequiredText(input.name),
      description:
        input.description === undefined
          ? this.snapshot.description
          : normalizeOptionalText(input.description),
      severity: input.severity ?? this.snapshot.severity,
      condition:
        input.condition === undefined
          ? this.snapshot.condition
          : normalizeCondition(input.condition),
      isEnabled: input.isEnabled ?? this.snapshot.isEnabled,
      mutedUntil: input.mutedUntil === undefined ? this.snapshot.mutedUntil : input.mutedUntil,
      updatedAt: input.updatedAt
    };

    validateSnapshot(this.snapshot);
  }

  transitionTo(state: AlertState, updatedAt: Date): void {
    this.snapshot = {
      ...this.snapshot,
      state,
      updatedAt
    };
  }

  archive(archivedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      isEnabled: false,
      deletedAt: archivedAt,
      updatedAt: archivedAt
    };
  }

  toSnapshot(): AlertRuleSnapshot {
    return {
      ...this.snapshot,
      condition: cloneCondition(this.snapshot.condition)
    };
  }

  private assertActive(): void {
    if (this.snapshot.deletedAt) {
      throw new AlertDomainError("Archived alert rules cannot be updated.");
    }
  }
}

export function normalizeCondition(condition: AlertCondition): AlertCondition {
  const metricName = condition.metricName?.trim().toLowerCase();
  const filters = MetricLabelValue.normalizeMany(condition.filters ?? []);
  const threshold = AlertThreshold.create(condition.threshold).toObject();

  if (!metricName && !condition.metricDefinitionId) {
    throw new AlertDomainError("Alert conditions require metricName or metricDefinitionId.");
  }

  if (condition.aggregation === "percentile" && condition.percentile === undefined) {
    throw new AlertDomainError("Percentile alert conditions require percentile.");
  }

  const evaluationWindowSeconds = condition.evaluationWindowSeconds ?? 3600;

  if (
    !Number.isInteger(evaluationWindowSeconds) ||
    evaluationWindowSeconds < 60 ||
    evaluationWindowSeconds > 2_592_000
  ) {
    throw new AlertDomainError("Alert evaluation windows must be between 60 seconds and 30 days.");
  }

  return {
    metricName,
    metricDefinitionId: condition.metricDefinitionId,
    serviceId: condition.serviceId,
    filters,
    aggregation: condition.aggregation ?? ("average" satisfies MetricAggregation),
    percentile: condition.percentile,
    evaluationWindowSeconds,
    threshold
  };
}

function validateSnapshot(snapshot: AlertRuleSnapshot): void {
  if (snapshot.name.length < 2 || snapshot.name.length > 160) {
    throw new AlertDomainError("Alert rule names must be between 2 and 160 characters.");
  }

  if (snapshot.description && snapshot.description.length > 1000) {
    throw new AlertDomainError("Alert rule descriptions must be 1000 characters or fewer.");
  }

  if (!["critical", "warning", "info"].includes(snapshot.severity)) {
    throw new AlertDomainError("Alert severity is invalid.");
  }

  if (!["ok", "pending", "firing", "resolved", "muted"].includes(snapshot.state)) {
    throw new AlertDomainError("Alert state is invalid.");
  }
}

function cloneCondition(condition: AlertCondition): AlertCondition {
  return {
    ...condition,
    filters: condition.filters.map((label: MetricLabel) => ({ ...label })),
    threshold: { ...condition.threshold }
  };
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
