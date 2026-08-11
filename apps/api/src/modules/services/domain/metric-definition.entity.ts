import type {
  MetricAggregation as MetricAggregationContract,
  MetricType,
  MetricUnit
} from "@plusops/contracts";

import { MetricAggregation } from "./metric-aggregation.value-object";
import { MetricDomainError } from "./metric-domain.error";

export type MetricDefinitionSnapshot = {
  id: string;
  serviceId: string;
  name: string;
  displayName: string;
  description: string | null;
  type: MetricType;
  unit: MetricUnit;
  customUnit: string | null;
  defaultAggregation: MetricAggregationContract;
  retentionPolicyId: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateMetricDefinitionInput = {
  id: string;
  serviceId: string;
  name: string;
  displayName: string;
  description?: string | null;
  type: MetricType;
  unit: MetricUnit;
  customUnit?: string | null;
  defaultAggregation?: MetricAggregationContract;
  retentionPolicyId?: string | null;
  isEnabled?: boolean;
  createdAt: Date;
};

export type UpdateMetricDefinitionInput = Partial<
  Pick<
    MetricDefinitionSnapshot,
    | "name"
    | "displayName"
    | "description"
    | "unit"
    | "customUnit"
    | "defaultAggregation"
    | "retentionPolicyId"
    | "isEnabled"
  >
> & {
  updatedAt: Date;
};

export class MetricDefinition {
  private constructor(private snapshot: MetricDefinitionSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateMetricDefinitionInput): MetricDefinition {
    return new MetricDefinition({
      id: input.id,
      serviceId: input.serviceId,
      name: normalizeName(input.name),
      displayName: normalizeRequiredText(input.displayName),
      description: normalizeOptionalText(input.description),
      type: input.type,
      unit: input.unit,
      customUnit: normalizeOptionalText(input.customUnit),
      defaultAggregation: input.defaultAggregation ?? MetricAggregation.defaultsFor(input.type),
      retentionPolicyId: input.retentionPolicyId ?? null,
      isEnabled: input.isEnabled ?? true,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: MetricDefinitionSnapshot): MetricDefinition {
    return new MetricDefinition({
      ...snapshot,
      name: normalizeName(snapshot.name),
      displayName: normalizeRequiredText(snapshot.displayName),
      description: normalizeOptionalText(snapshot.description),
      customUnit: normalizeOptionalText(snapshot.customUnit)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get serviceId(): string {
    return this.snapshot.serviceId;
  }

  update(input: UpdateMetricDefinitionInput): void {
    this.assertActiveRecord();

    this.snapshot = {
      ...this.snapshot,
      name: input.name === undefined ? this.snapshot.name : normalizeName(input.name),
      displayName:
        input.displayName === undefined
          ? this.snapshot.displayName
          : normalizeRequiredText(input.displayName),
      description:
        input.description === undefined
          ? this.snapshot.description
          : normalizeOptionalText(input.description),
      unit: input.unit ?? this.snapshot.unit,
      customUnit:
        input.customUnit === undefined
          ? this.snapshot.customUnit
          : normalizeOptionalText(input.customUnit),
      defaultAggregation: input.defaultAggregation ?? this.snapshot.defaultAggregation,
      retentionPolicyId:
        input.retentionPolicyId === undefined
          ? this.snapshot.retentionPolicyId
          : input.retentionPolicyId,
      isEnabled: input.isEnabled ?? this.snapshot.isEnabled,
      updatedAt: input.updatedAt
    };

    validateSnapshot(this.snapshot);
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

  toSnapshot(): MetricDefinitionSnapshot {
    return { ...this.snapshot };
  }

  private assertActiveRecord(): void {
    if (this.snapshot.deletedAt) {
      throw new MetricDomainError("Archived metric definitions cannot be updated.");
    }
  }
}

function validateSnapshot(snapshot: MetricDefinitionSnapshot): void {
  if (!["counter", "gauge", "histogram", "summary", "state"].includes(snapshot.type)) {
    throw new MetricDomainError("Metric type is invalid.");
  }

  if (
    ![
      "milliseconds",
      "seconds",
      "bytes",
      "percent",
      "count",
      "requests",
      "errors",
      "custom"
    ].includes(snapshot.unit)
  ) {
    throw new MetricDomainError("Metric unit is invalid.");
  }

  if (snapshot.unit === "custom" && !snapshot.customUnit) {
    throw new MetricDomainError("Custom metric units require customUnit.");
  }

  if (snapshot.unit !== "custom" && snapshot.customUnit) {
    throw new MetricDomainError("customUnit can only be set when unit is custom.");
  }

  MetricAggregation.assertSupported(snapshot.type, snapshot.defaultAggregation);

  if (snapshot.displayName.length < 2 || snapshot.displayName.length > 160) {
    throw new MetricDomainError("Metric display name must be between 2 and 160 characters.");
  }

  if (snapshot.description && snapshot.description.length > 1000) {
    throw new MetricDomainError("Metric description must be 1000 characters or fewer.");
  }
}

function normalizeName(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!/^[a-z][a-z0-9_:]*$/.test(normalized) || normalized.length < 2 || normalized.length > 120) {
    throw new MetricDomainError("Metric names must use lowercase metric notation.");
  }

  return normalized;
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
