import type { HealthCheck } from "../../domain";

export type HealthCheckListOptions = {
  includeDisabled?: boolean;
  includeDeleted?: boolean;
};

export interface HealthCheckRepositoryPort {
  save(healthCheck: HealthCheck): Promise<void>;
  findById(
    healthCheckId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<HealthCheck | null>;
  listByService(serviceId: string, options?: HealthCheckListOptions): Promise<HealthCheck[]>;
}
