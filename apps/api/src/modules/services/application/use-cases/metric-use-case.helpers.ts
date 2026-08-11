import { InternalServerErrorException, NotFoundException } from "@nestjs/common";

import type { MetricDefinition, Service } from "../../domain";
import type { MetricDefinitionRepositoryPort, ServiceRepositoryPort } from "../ports";

export async function loadServiceOrThrowForMetrics(
  serviceRepository: ServiceRepositoryPort,
  serviceId: string
): Promise<Service> {
  const service = await serviceRepository.findById(serviceId);

  if (!service) {
    throw new NotFoundException("Service could not be found.");
  }

  return service;
}

export async function loadMetricDefinitionOrThrow(
  metricDefinitionRepository: MetricDefinitionRepositoryPort,
  metricDefinitionId: string
): Promise<MetricDefinition> {
  const metric = await metricDefinitionRepository.findById(metricDefinitionId);

  if (!metric) {
    throw new NotFoundException("Metric definition could not be found.");
  }

  return metric;
}

export function assertMetricDefinitionReloaded(metric: MetricDefinition | null): MetricDefinition {
  if (!metric) {
    throw new InternalServerErrorException("Metric definition could not be loaded.");
  }

  return metric;
}
