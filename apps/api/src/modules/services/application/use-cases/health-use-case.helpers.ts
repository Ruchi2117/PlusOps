import { InternalServerErrorException, NotFoundException } from "@nestjs/common";

import type { HealthCheck, Service } from "../../domain";
import type { HealthCheckRepositoryPort, ServiceRepositoryPort } from "../ports";

export async function loadServiceOrThrowForHealth(
  serviceRepository: ServiceRepositoryPort,
  serviceId: string
): Promise<Service> {
  const service = await serviceRepository.findById(serviceId);

  if (!service) {
    throw new NotFoundException("Service could not be found.");
  }

  return service;
}

export async function loadHealthCheckOrThrow(
  healthCheckRepository: HealthCheckRepositoryPort,
  healthCheckId: string
): Promise<HealthCheck> {
  const healthCheck = await healthCheckRepository.findById(healthCheckId);

  if (!healthCheck) {
    throw new NotFoundException("Health check could not be found.");
  }

  return healthCheck;
}

export function assertHealthCheckReloaded(healthCheck: HealthCheck | null): HealthCheck {
  if (!healthCheck) {
    throw new InternalServerErrorException("Health check could not be loaded.");
  }

  return healthCheck;
}
