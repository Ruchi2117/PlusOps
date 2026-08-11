import type { ServiceDeploymentRecord } from "./service-repository.port";

export interface DeploymentRepositoryPort {
  listRecentByService(serviceId: string, limit: number): Promise<ServiceDeploymentRecord[]>;
}
