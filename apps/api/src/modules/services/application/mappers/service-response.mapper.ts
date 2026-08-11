import type {
  ServiceDependenciesResponse,
  ServiceDetail,
  ServiceDependency,
  ServiceListResponse,
  ServicePaginationMeta,
  ServiceSummary
} from "@plusops/contracts";

import type {
  ServiceDependencyRecord,
  ServiceDetailRecord,
  ServiceListQuery,
  ServiceListResult,
  ServiceSummaryRecord
} from "../ports";

export function toServiceSummary(record: ServiceSummaryRecord): ServiceSummary {
  const snapshot = record.service.toSnapshot();

  return {
    id: snapshot.id,
    name: snapshot.name,
    slug: snapshot.slug,
    description: snapshot.description,
    ownerTeamId: snapshot.ownerTeamId,
    ownerTeamName: record.ownerTeamName,
    repositoryUrl: snapshot.repositoryUrl,
    apiBaseUrl: snapshot.apiBaseUrl,
    documentationUrl: snapshot.documentationUrl,
    runbookUrl: snapshot.runbookUrl,
    lifecycleStatus: snapshot.lifecycleStatus,
    visibility: snapshot.visibility,
    tier: snapshot.tier,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    deletedAt: snapshot.deletedAt?.toISOString() ?? null
  };
}

export function toServiceDetail(record: ServiceDetailRecord): ServiceDetail {
  return {
    ...toServiceSummary(record),
    environments: record.environments,
    upstreamDependencies: record.upstreamDependencies.map(toServiceDependency),
    downstreamDependencies: record.downstreamDependencies.map(toServiceDependency),
    deployments: record.deployments.map((deployment) => ({
      id: deployment.id,
      serviceId: deployment.serviceId,
      environmentId: deployment.environmentId,
      environmentName: deployment.environmentName,
      version: deployment.version,
      commitSha: deployment.commitSha,
      repositoryUrl: deployment.repositoryUrl,
      status: deployment.status,
      deployedByUserId: deployment.deployedByUserId,
      startedAt: deployment.startedAt.toISOString(),
      finishedAt: deployment.finishedAt?.toISOString() ?? null
    }))
  };
}

export function toServiceListResponse(
  query: ServiceListQuery,
  result: ServiceListResult
): ServiceListResponse {
  return {
    data: result.services.map(toServiceSummary),
    pagination: toPaginationMeta(query, result.total)
  };
}

export function toServiceDependenciesResponse(
  dependencies: ServiceDependencyRecord[]
): ServiceDependenciesResponse {
  return {
    data: dependencies.map(toServiceDependency)
  };
}

function toServiceDependency(record: ServiceDependencyRecord): ServiceDependency {
  return {
    id: record.id,
    upstreamServiceId: record.upstreamServiceId,
    upstreamServiceName: record.upstreamServiceName,
    upstreamServiceSlug: record.upstreamServiceSlug,
    downstreamServiceId: record.downstreamServiceId,
    downstreamServiceName: record.downstreamServiceName,
    downstreamServiceSlug: record.downstreamServiceSlug,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    deletedAt: record.deletedAt?.toISOString() ?? null
  };
}

function toPaginationMeta(query: ServiceListQuery, total: number): ServicePaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
  };
}
