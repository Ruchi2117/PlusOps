import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { ServiceSnapshot } from "../domain";
import type { ServiceRepositoryPort } from "./ports";
import { hasPermission } from "./service-permissions";

export type MetricActor = AuthenticatedUser;

export function assertCanViewMetrics(actor: MetricActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.METRICS_VIEW)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export async function assertCanSubmitMetricSample(
  actor: MetricActor,
  service: ServiceSnapshot,
  serviceRepository: ServiceRepositoryPort
): Promise<void> {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.METRICS_MANAGE)) {
    return;
  }

  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.METRICS_SUBMIT) &&
    (await serviceRepository.actorBelongsToTeam(actor.id, service.ownerTeamId))
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanManageMetrics(actor: MetricActor): void {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.METRICS_MANAGE)) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}
