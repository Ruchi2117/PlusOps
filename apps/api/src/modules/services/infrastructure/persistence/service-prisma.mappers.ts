import type {
  DeploymentStatus as PrismaDeploymentStatus,
  EnvironmentType as PrismaEnvironmentType,
  Prisma,
  Service as PrismaService,
  ServiceDependency as PrismaServiceDependency,
  ServiceLifecycleStatus as PrismaServiceLifecycleStatus,
  ServiceVisibility as PrismaServiceVisibility
} from "@prisma/client";
import type {
  DeploymentStatus,
  EnvironmentType,
  ServiceLifecycleStatus,
  ServiceVisibility
} from "@plusops/contracts";

import type {
  ServiceDependencyRecord,
  ServiceDeploymentRecord,
  ServiceDetailRecord,
  ServiceEnvironmentRecord,
  ServiceSummaryRecord
} from "../../application/ports";
import { Service, ServiceDependency } from "../../domain";
import type { ServiceDependencySnapshot, ServiceSnapshot } from "../../domain";

export const serviceSummaryInclude = {
  ownerTeam: {
    select: {
      name: true
    }
  }
} satisfies Prisma.ServiceInclude;

export const serviceDetailInclude = {
  ownerTeam: {
    select: {
      name: true
    }
  },
  environments: {
    where: {
      deletedAt: null,
      environment: {
        deletedAt: null
      }
    },
    include: {
      environment: true
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  upstreamDependencies: {
    where: {
      deletedAt: null,
      downstreamService: {
        deletedAt: null
      }
    },
    include: {
      upstreamService: {
        select: {
          name: true,
          slug: true
        }
      },
      downstreamService: {
        select: {
          name: true,
          slug: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  downstreamDependencies: {
    where: {
      deletedAt: null,
      upstreamService: {
        deletedAt: null
      }
    },
    include: {
      upstreamService: {
        select: {
          name: true,
          slug: true
        }
      },
      downstreamService: {
        select: {
          name: true,
          slug: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  deployments: {
    include: {
      environment: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 10
  }
} satisfies Prisma.ServiceInclude;

export const serviceDependencyInclude = {
  upstreamService: {
    select: {
      name: true,
      slug: true
    }
  },
  downstreamService: {
    select: {
      name: true,
      slug: true
    }
  }
} satisfies Prisma.ServiceDependencyInclude;

export type PrismaServiceSummary = Prisma.ServiceGetPayload<{
  include: typeof serviceSummaryInclude;
}>;

export type PrismaServiceDetail = Prisma.ServiceGetPayload<{
  include: typeof serviceDetailInclude;
}>;

export type PrismaServiceDependencyRecord = Prisma.ServiceDependencyGetPayload<{
  include: typeof serviceDependencyInclude;
}>;

export function mapService(prismaService: PrismaService): Service {
  return Service.restore(mapServiceSnapshot(prismaService));
}

export function mapServiceSummary(prismaService: PrismaServiceSummary): ServiceSummaryRecord {
  return {
    service: mapService(prismaService),
    ownerTeamName: prismaService.ownerTeam.name
  };
}

export function mapServiceDetail(prismaService: PrismaServiceDetail): ServiceDetailRecord {
  return {
    ...mapServiceSummary(prismaService),
    environments: prismaService.environments.map(
      (serviceEnvironment): ServiceEnvironmentRecord => ({
        id: serviceEnvironment.environment.id,
        name: serviceEnvironment.environment.name,
        slug: serviceEnvironment.environment.slug,
        type: mapEnvironmentType(serviceEnvironment.environment.type),
        baseUrl: serviceEnvironment.baseUrl
      })
    ),
    upstreamDependencies: prismaService.upstreamDependencies.map(mapServiceDependencyRecord),
    downstreamDependencies: prismaService.downstreamDependencies.map(mapServiceDependencyRecord),
    deployments: prismaService.deployments.map(
      (deployment): ServiceDeploymentRecord => ({
        id: deployment.id,
        serviceId: deployment.serviceId,
        environmentId: deployment.environmentId,
        environmentName: deployment.environment.name,
        version: deployment.version,
        commitSha: deployment.commitSha,
        repositoryUrl: deployment.repositoryUrl,
        status: mapDeploymentStatus(deployment.status),
        deployedByUserId: deployment.deployedByUserId,
        startedAt: deployment.startedAt,
        finishedAt: deployment.finishedAt
      })
    )
  };
}

export function mapServiceSnapshot(prismaService: PrismaService): ServiceSnapshot {
  return {
    id: prismaService.id,
    name: prismaService.name,
    slug: prismaService.slug,
    description: prismaService.description,
    ownerTeamId: prismaService.ownerTeamId,
    repositoryUrl: prismaService.repositoryUrl,
    apiBaseUrl: prismaService.apiBaseUrl,
    documentationUrl: prismaService.documentationUrl,
    runbookUrl: prismaService.runbookUrl,
    lifecycleStatus: mapServiceLifecycleStatus(prismaService.lifecycleStatus),
    visibility: mapServiceVisibility(prismaService.visibility),
    tier: prismaService.tier,
    createdAt: prismaService.createdAt,
    updatedAt: prismaService.updatedAt,
    deletedAt: prismaService.deletedAt
  };
}

export function mapServiceDependency(
  prismaDependency: PrismaServiceDependency
): ServiceDependency {
  return ServiceDependency.restore(mapServiceDependencySnapshot(prismaDependency));
}

export function mapServiceDependencySnapshot(
  prismaDependency: PrismaServiceDependency
): ServiceDependencySnapshot {
  return {
    id: prismaDependency.id,
    upstreamServiceId: prismaDependency.upstreamServiceId,
    downstreamServiceId: prismaDependency.downstreamServiceId,
    description: prismaDependency.description,
    createdByUserId: prismaDependency.createdByUserId,
    createdAt: prismaDependency.createdAt,
    deletedAt: prismaDependency.deletedAt
  };
}

export function mapServiceDependencyRecord(
  dependency: PrismaServiceDependencyRecord
): ServiceDependencyRecord {
  return {
    id: dependency.id,
    upstreamServiceId: dependency.upstreamServiceId,
    upstreamServiceName: dependency.upstreamService.name,
    upstreamServiceSlug: dependency.upstreamService.slug,
    downstreamServiceId: dependency.downstreamServiceId,
    downstreamServiceName: dependency.downstreamService.name,
    downstreamServiceSlug: dependency.downstreamService.slug,
    description: dependency.description,
    createdAt: dependency.createdAt,
    deletedAt: dependency.deletedAt
  };
}

export function toPrismaServiceWrite(snapshot: ServiceSnapshot) {
  return {
    name: snapshot.name,
    slug: snapshot.slug,
    description: snapshot.description,
    ownerTeamId: snapshot.ownerTeamId,
    repositoryUrl: snapshot.repositoryUrl,
    apiBaseUrl: snapshot.apiBaseUrl,
    documentationUrl: snapshot.documentationUrl,
    runbookUrl: snapshot.runbookUrl,
    lifecycleStatus: toPrismaServiceLifecycleStatus(snapshot.lifecycleStatus),
    visibility: toPrismaServiceVisibility(snapshot.visibility),
    tier: snapshot.tier,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function toPrismaServiceDependencyWrite(snapshot: ServiceDependencySnapshot) {
  return {
    upstreamServiceId: snapshot.upstreamServiceId,
    downstreamServiceId: snapshot.downstreamServiceId,
    description: snapshot.description,
    createdByUserId: snapshot.createdByUserId,
    createdAt: snapshot.createdAt,
    deletedAt: snapshot.deletedAt
  };
}

export function mapServiceLifecycleStatus(
  status: PrismaServiceLifecycleStatus
): ServiceLifecycleStatus {
  return status.toLowerCase() as ServiceLifecycleStatus;
}

export function toPrismaServiceLifecycleStatus(
  status: ServiceLifecycleStatus
): PrismaServiceLifecycleStatus {
  return status.toUpperCase() as PrismaServiceLifecycleStatus;
}

export function mapServiceVisibility(visibility: PrismaServiceVisibility): ServiceVisibility {
  return visibility.toLowerCase() as ServiceVisibility;
}

export function toPrismaServiceVisibility(
  visibility: ServiceVisibility
): PrismaServiceVisibility {
  return visibility.toUpperCase() as PrismaServiceVisibility;
}

export function mapEnvironmentType(type: PrismaEnvironmentType): EnvironmentType {
  return type.toLowerCase() as EnvironmentType;
}

export function mapDeploymentStatus(status: PrismaDeploymentStatus): DeploymentStatus {
  return status.toLowerCase() as DeploymentStatus;
}
