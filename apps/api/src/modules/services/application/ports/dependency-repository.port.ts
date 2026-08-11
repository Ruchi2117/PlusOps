import type { ServiceDependency } from "../../domain";
import type { ServiceDependencyRecord } from "./service-repository.port";

export interface DependencyRepositoryPort {
  save(dependency: ServiceDependency): Promise<ServiceDependency>;
  findById(dependencyId: string): Promise<ServiceDependency | null>;
  findActiveBetween(
    upstreamServiceId: string,
    downstreamServiceId: string
  ): Promise<ServiceDependency | null>;
  listByService(serviceId: string): Promise<ServiceDependencyRecord[]>;
  wouldCreateCycle(upstreamServiceId: string, downstreamServiceId: string): Promise<boolean>;
}
