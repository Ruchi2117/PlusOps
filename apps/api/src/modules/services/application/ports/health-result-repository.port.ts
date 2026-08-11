import type { HealthCheckResult } from "../../domain";

export interface HealthResultRepositoryPort {
  save(result: HealthCheckResult): Promise<void>;
  findLatestByCheckId(healthCheckId: string): Promise<HealthCheckResult | null>;
  findLatestByCheckIds(healthCheckIds: string[]): Promise<HealthCheckResult[]>;
}
