import type { ServiceHealthStatus } from "@plusops/contracts";

import type { HealthCheckSnapshot, ServiceSnapshot } from "../../domain";

export type HealthCheckExecution = {
  status: ServiceHealthStatus;
  responseTimeMs: number | null;
  message: string;
};

export interface HealthCheckExecutorPort {
  execute(input: {
    healthCheck: HealthCheckSnapshot;
    service: ServiceSnapshot;
  }): Promise<HealthCheckExecution>;
}
