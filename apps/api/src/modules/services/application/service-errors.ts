import { BadRequestException } from "@nestjs/common";

import {
  AlertDomainError,
  HealthDomainError,
  MetricDomainError,
  ServiceDomainError
} from "../domain";

export function rethrowServiceDomainError(error: unknown): never {
  if (error instanceof ServiceDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}

export function rethrowHealthDomainError(error: unknown): never {
  if (error instanceof HealthDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}

export function rethrowMetricDomainError(error: unknown): never {
  if (error instanceof MetricDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}

export function rethrowAlertDomainError(error: unknown): never {
  if (error instanceof AlertDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
