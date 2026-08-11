import type { ServiceHealthStatus } from "@plusops/contracts";

import type { HealthCheckResultSnapshot } from "./health-check-result.entity";
import type { HealthCheckSnapshot } from "./health-check.entity";
import { HealthDomainError } from "./health-domain.error";

export type HealthEvaluationSnapshot = {
  id: string;
  serviceId: string;
  status: ServiceHealthStatus;
  summary: string;
  evaluatedAt: Date;
  createdAt: Date;
};

export type CreateHealthEvaluationInput = {
  id: string;
  serviceId: string;
  status: ServiceHealthStatus;
  summary: string;
  evaluatedAt: Date;
  createdAt: Date;
};

export type EvaluateServiceHealthInput = {
  id: string;
  serviceId: string;
  checks: HealthCheckSnapshot[];
  latestResults: HealthCheckResultSnapshot[];
  evaluatedAt: Date;
};

type EvaluatedCheck = {
  check: HealthCheckSnapshot;
  status: ServiceHealthStatus;
  stale: boolean;
};

export class HealthEvaluation {
  private constructor(private snapshot: HealthEvaluationSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateHealthEvaluationInput): HealthEvaluation {
    return new HealthEvaluation({
      id: input.id,
      serviceId: input.serviceId,
      status: input.status,
      summary: normalizeRequiredText(input.summary),
      evaluatedAt: input.evaluatedAt,
      createdAt: input.createdAt
    });
  }

  static restore(snapshot: HealthEvaluationSnapshot): HealthEvaluation {
    return new HealthEvaluation({
      ...snapshot,
      summary: normalizeRequiredText(snapshot.summary)
    });
  }

  static evaluate(input: EvaluateServiceHealthInput): HealthEvaluation {
    const enabledChecks = input.checks.filter((check) => check.isEnabled && !check.deletedAt);

    if (enabledChecks.length === 0) {
      return HealthEvaluation.create({
        id: input.id,
        serviceId: input.serviceId,
        status: "unknown",
        summary: "No enabled health checks are configured.",
        evaluatedAt: input.evaluatedAt,
        createdAt: input.evaluatedAt
      });
    }

    const latestResultsByCheckId = new Map(
      input.latestResults.map((result) => [result.healthCheckId, result])
    );
    const evaluatedChecks = enabledChecks.map((check): EvaluatedCheck => {
      const latestResult = latestResultsByCheckId.get(check.id);
      const stale =
        !latestResult ||
        input.evaluatedAt.getTime() - latestResult.checkedAt.getTime() >
          check.staleAfterSeconds * 1000;

      return {
        check,
        status: stale ? "unknown" : latestResult.status,
        stale
      };
    });
    const criticalChecks = evaluatedChecks.filter((evaluatedCheck) => evaluatedCheck.check.isCritical);
    const optionalChecks = evaluatedChecks.filter((evaluatedCheck) => !evaluatedCheck.check.isCritical);

    if (criticalChecks.some((evaluatedCheck) => evaluatedCheck.status === "unhealthy")) {
      return evaluated(input, "unhealthy", "A critical health check is failing.");
    }

    if (criticalChecks.some((evaluatedCheck) => evaluatedCheck.status === "unknown")) {
      return evaluated(input, "unknown", "A critical health check has no recent result.");
    }

    if (
      criticalChecks.some((evaluatedCheck) => evaluatedCheck.status === "degraded") ||
      optionalChecks.some((evaluatedCheck) => evaluatedCheck.status !== "healthy")
    ) {
      return evaluated(input, "degraded", "One or more health checks are degraded.");
    }

    return evaluated(input, "healthy", "All enabled health checks are healthy.");
  }

  get status(): ServiceHealthStatus {
    return this.snapshot.status;
  }

  toSnapshot(): HealthEvaluationSnapshot {
    return { ...this.snapshot };
  }
}

function evaluated(
  input: EvaluateServiceHealthInput,
  status: ServiceHealthStatus,
  summary: string
): HealthEvaluation {
  return HealthEvaluation.create({
    id: input.id,
    serviceId: input.serviceId,
    status,
    summary,
    evaluatedAt: input.evaluatedAt,
    createdAt: input.evaluatedAt
  });
}

function validateSnapshot(snapshot: HealthEvaluationSnapshot): void {
  if (!["healthy", "degraded", "unhealthy", "unknown"].includes(snapshot.status)) {
    throw new HealthDomainError("Health evaluation status is invalid.");
  }

  if (snapshot.summary.length < 1 || snapshot.summary.length > 1000) {
    throw new HealthDomainError("Health evaluation summary must be between 1 and 1000 characters.");
  }
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}
