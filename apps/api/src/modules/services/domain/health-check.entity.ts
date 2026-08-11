import type { HealthCheckType } from "@plusops/contracts";

import { HealthDomainError } from "./health-domain.error";

export type HealthCheckConfiguration = Record<string, unknown>;

export type HealthCheckSnapshot = {
  id: string;
  serviceId: string;
  name: string;
  type: HealthCheckType;
  target: string | null;
  description: string | null;
  isCritical: boolean;
  isEnabled: boolean;
  intervalSeconds: number;
  timeoutMs: number;
  staleAfterSeconds: number;
  configuration: HealthCheckConfiguration | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateHealthCheckInput = {
  id: string;
  serviceId: string;
  name: string;
  type: HealthCheckType;
  target?: string | null;
  description?: string | null;
  isCritical?: boolean;
  isEnabled?: boolean;
  intervalSeconds?: number;
  timeoutMs?: number;
  staleAfterSeconds?: number;
  configuration?: HealthCheckConfiguration | null;
  createdAt: Date;
};

export type UpdateHealthCheckInput = Partial<
  Pick<
    HealthCheckSnapshot,
    | "name"
    | "type"
    | "target"
    | "description"
    | "isCritical"
    | "isEnabled"
    | "intervalSeconds"
    | "timeoutMs"
    | "staleAfterSeconds"
    | "configuration"
  >
> & {
  updatedAt: Date;
};

export class HealthCheck {
  private constructor(private snapshot: HealthCheckSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateHealthCheckInput): HealthCheck {
    const intervalSeconds = input.intervalSeconds ?? 60;

    return new HealthCheck({
      id: input.id,
      serviceId: input.serviceId,
      name: normalizeRequiredText(input.name),
      type: input.type,
      target: normalizeOptionalText(input.target),
      description: normalizeOptionalText(input.description),
      isCritical: input.isCritical ?? true,
      isEnabled: input.isEnabled ?? true,
      intervalSeconds,
      timeoutMs: input.timeoutMs ?? 5000,
      staleAfterSeconds: input.staleAfterSeconds ?? intervalSeconds * 5,
      configuration: normalizeConfiguration(input.configuration),
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null
    });
  }

  static restore(snapshot: HealthCheckSnapshot): HealthCheck {
    return new HealthCheck({
      ...snapshot,
      name: normalizeRequiredText(snapshot.name),
      target: normalizeOptionalText(snapshot.target),
      description: normalizeOptionalText(snapshot.description),
      configuration: normalizeConfiguration(snapshot.configuration)
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get serviceId(): string {
    return this.snapshot.serviceId;
  }

  update(input: UpdateHealthCheckInput): void {
    this.assertActiveRecord();

    this.snapshot = {
      ...this.snapshot,
      name: input.name === undefined ? this.snapshot.name : normalizeRequiredText(input.name),
      type: input.type ?? this.snapshot.type,
      target:
        input.target === undefined ? this.snapshot.target : normalizeOptionalText(input.target),
      description:
        input.description === undefined
          ? this.snapshot.description
          : normalizeOptionalText(input.description),
      isCritical: input.isCritical ?? this.snapshot.isCritical,
      isEnabled: input.isEnabled ?? this.snapshot.isEnabled,
      intervalSeconds: input.intervalSeconds ?? this.snapshot.intervalSeconds,
      timeoutMs: input.timeoutMs ?? this.snapshot.timeoutMs,
      staleAfterSeconds: input.staleAfterSeconds ?? this.snapshot.staleAfterSeconds,
      configuration:
        input.configuration === undefined
          ? this.snapshot.configuration
          : normalizeConfiguration(input.configuration),
      updatedAt: input.updatedAt
    };

    validateSnapshot(this.snapshot);
  }

  markDeleted(deletedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      isEnabled: false,
      deletedAt,
      updatedAt: deletedAt
    };
  }

  toSnapshot(): HealthCheckSnapshot {
    return {
      ...this.snapshot,
      configuration: cloneConfiguration(this.snapshot.configuration)
    };
  }

  private assertActiveRecord(): void {
    if (this.snapshot.deletedAt) {
      throw new HealthDomainError("Deleted health checks cannot be updated.");
    }
  }
}

function validateSnapshot(snapshot: HealthCheckSnapshot): void {
  if (snapshot.name.length < 2 || snapshot.name.length > 120) {
    throw new HealthDomainError("Health check name must be between 2 and 120 characters.");
  }

  if (
    !["http_endpoint", "tcp", "synthetic", "dependency", "database", "cache"].includes(
      snapshot.type
    )
  ) {
    throw new HealthDomainError("Health check type is invalid.");
  }

  if (snapshot.target && snapshot.target.length > 500) {
    throw new HealthDomainError("Health check target must be 500 characters or fewer.");
  }

  if (snapshot.description && snapshot.description.length > 1000) {
    throw new HealthDomainError("Health check description must be 1000 characters or fewer.");
  }

  if (
    !Number.isInteger(snapshot.intervalSeconds) ||
    snapshot.intervalSeconds < 10 ||
    snapshot.intervalSeconds > 86_400
  ) {
    throw new HealthDomainError("Health check interval must be between 10 and 86400 seconds.");
  }

  if (
    !Number.isInteger(snapshot.timeoutMs) ||
    snapshot.timeoutMs < 100 ||
    snapshot.timeoutMs > 120_000
  ) {
    throw new HealthDomainError("Health check timeout must be between 100 and 120000 ms.");
  }

  if (
    !Number.isInteger(snapshot.staleAfterSeconds) ||
    snapshot.staleAfterSeconds < snapshot.intervalSeconds ||
    snapshot.staleAfterSeconds > 604_800
  ) {
    throw new HealthDomainError(
      "Health check stale window must be at least the interval and at most 604800 seconds."
    );
  }
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

function normalizeConfiguration(
  configuration: HealthCheckConfiguration | null | undefined
): HealthCheckConfiguration | null {
  if (configuration === null || configuration === undefined) {
    return null;
  }

  if (Array.isArray(configuration)) {
    throw new HealthDomainError("Health check configuration must be an object.");
  }

  return cloneConfiguration(configuration);
}

function cloneConfiguration(
  configuration: HealthCheckConfiguration | null
): HealthCheckConfiguration | null {
  return configuration ? { ...configuration } : null;
}
