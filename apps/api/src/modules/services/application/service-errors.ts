import { BadRequestException } from "@nestjs/common";

import { HealthDomainError, ServiceDomainError } from "../domain";

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
