import { InternalServerErrorException, NotFoundException } from "@nestjs/common";

import type { Service, ServiceDependency } from "../../domain";
import type {
  DependencyRepositoryPort,
  ServiceDetailRecord,
  ServiceRepositoryPort
} from "../ports";

export async function loadServiceOrThrow(
  serviceRepository: ServiceRepositoryPort,
  serviceId: string
): Promise<Service> {
  const service = await serviceRepository.findById(serviceId);

  if (!service) {
    throw new NotFoundException("Service could not be found.");
  }

  return service;
}

export async function loadServiceDetailOrThrow(
  serviceRepository: ServiceRepositoryPort,
  serviceId: string,
  message: string
): Promise<ServiceDetailRecord> {
  const detail = await serviceRepository.findDetailById(serviceId);

  if (!detail) {
    throw new InternalServerErrorException(message);
  }

  return detail;
}

export async function loadDependencyOrThrow(
  dependencyRepository: DependencyRepositoryPort,
  dependencyId: string
): Promise<ServiceDependency> {
  const dependency = await dependencyRepository.findById(dependencyId);

  if (!dependency) {
    throw new NotFoundException("Service dependency could not be found.");
  }

  return dependency;
}
