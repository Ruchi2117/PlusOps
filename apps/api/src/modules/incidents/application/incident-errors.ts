import { BadRequestException } from "@nestjs/common";

import { IncidentDomainError } from "../domain";

export function rethrowIncidentDomainError(error: unknown): never {
  if (error instanceof IncidentDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
