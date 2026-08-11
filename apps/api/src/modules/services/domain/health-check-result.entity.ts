import type { ServiceHealthStatus } from "@plusops/contracts";

import { HealthDomainError } from "./health-domain.error";

export type HealthCheckResultSnapshot = {
  id: string;
  serviceId: string;
  healthCheckId: string;
  status: ServiceHealthStatus;
  responseTimeMs: number | null;
  message: string | null;
  checkedAt: Date;
  createdAt: Date;
};

export type CreateHealthCheckResultInput = {
  id: string;
  serviceId: string;
  healthCheckId: string;
  status: ServiceHealthStatus;
  responseTimeMs?: number | null;
  message?: string | null;
  checkedAt: Date;
  createdAt: Date;
};

export class HealthCheckResult {
  private constructor(private snapshot: HealthCheckResultSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateHealthCheckResultInput): HealthCheckResult {
    return new HealthCheckResult({
      id: input.id,
      serviceId: input.serviceId,
      healthCheckId: input.healthCheckId,
      status: input.status,
      responseTimeMs: input.responseTimeMs ?? null,
      message: normalizeOptionalText(input.message),
      checkedAt: input.checkedAt,
      createdAt: input.createdAt
    });
  }

  static restore(snapshot: HealthCheckResultSnapshot): HealthCheckResult {
    return new HealthCheckResult({
      ...snapshot,
      message: normalizeOptionalText(snapshot.message)
    });
  }

  toSnapshot(): HealthCheckResultSnapshot {
    return { ...this.snapshot };
  }
}

function validateSnapshot(snapshot: HealthCheckResultSnapshot): void {
  if (!["healthy", "degraded", "unhealthy", "unknown"].includes(snapshot.status)) {
    throw new HealthDomainError("Health check result status is invalid.");
  }

  if (
    snapshot.responseTimeMs !== null &&
    (!Number.isInteger(snapshot.responseTimeMs) ||
      snapshot.responseTimeMs < 0 ||
      snapshot.responseTimeMs > 600_000)
  ) {
    throw new HealthDomainError("Health check response time must be between 0 and 600000 ms.");
  }

  if (snapshot.message && snapshot.message.length > 1000) {
    throw new HealthDomainError("Health check result message must be 1000 characters or fewer.");
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
