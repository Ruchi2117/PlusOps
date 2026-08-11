import { BadRequestException } from "@nestjs/common";

import { ServiceDomainError } from "../domain";

export function rethrowServiceDomainError(error: unknown): never {
  if (error instanceof ServiceDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
