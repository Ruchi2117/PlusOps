import type {
  ServiceLifecycleStatus,
  ServiceSortDirection,
  ServiceSortField,
  ServiceVisibility
} from "@plusops/contracts";

import type { Service } from "../../domain";

export type ServiceListFilters = {
  search?: string;
  ownerTeamId?: string;
  lifecycleStatus?: ServiceLifecycleStatus;
  visibility?: ServiceVisibility;
  includeDeleted?: boolean;
};

export type ServiceListQuery = {
  page: number;
  pageSize: number;
  filters?: ServiceListFilters;
  sort?: {
    field: ServiceSortField;
    direction: ServiceSortDirection;
  };
};

export type ServiceSummaryRecord = {
  service: Service;
  ownerTeamName: string;
};

export type ServiceEnvironmentRecord = {
  id: string;
  name: string;
  slug: string;
  type: "development" | "staging" | "production" | "preview";
  baseUrl: string | null;
};

export type ServiceDeploymentRecord = {
  id: string;
  serviceId: string;
  environmentId: string;
  environmentName: string;
  version: string;
  commitSha: string | null;
  repositoryUrl: string | null;
  status: "pending" | "running" | "succeeded" | "failed" | "rolled_back";
  deployedByUserId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export type ServiceDependencyRecord = {
  id: string;
  upstreamServiceId: string;
  upstreamServiceName: string;
  upstreamServiceSlug: string;
  downstreamServiceId: string;
  downstreamServiceName: string;
  downstreamServiceSlug: string;
  description: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type ServiceDetailRecord = ServiceSummaryRecord & {
  environments: ServiceEnvironmentRecord[];
  upstreamDependencies: ServiceDependencyRecord[];
  downstreamDependencies: ServiceDependencyRecord[];
  deployments: ServiceDeploymentRecord[];
};

export type ServiceListResult = {
  services: ServiceSummaryRecord[];
  total: number;
};

export type SaveServiceOptions = {
  environmentIds?: string[];
};

export interface ServiceRepositoryPort {
  save(service: Service, options?: SaveServiceOptions): Promise<void>;
  findById(serviceId: string, options?: { includeDeleted?: boolean }): Promise<Service | null>;
  findDetailById(
    serviceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<ServiceDetailRecord | null>;
  findBySlug(
    slug: string,
    options?: { excludeServiceId?: string; includeDeleted?: boolean }
  ): Promise<Service | null>;
  list(query: ServiceListQuery): Promise<ServiceListResult>;
  ownerTeamExists(teamId: string): Promise<boolean>;
  actorBelongsToTeam(actorUserId: string, teamId: string): Promise<boolean>;
}
