import { BadRequestException } from "@nestjs/common";

import { AIDomainError } from "../domain";

export function rethrowAIDomainError(error: unknown): never {
  if (error instanceof AIDomainError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
