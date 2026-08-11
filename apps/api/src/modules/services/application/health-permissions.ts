import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { ServiceSnapshot } from "../domain";
import type { ServiceRepositoryPort } from "./ports";
import { hasPermission } from "./service-permissions";

export type HealthActor = AuthenticatedUser;

export function assertCanViewHealth(actor: HealthActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.HEALTH_VIEW)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export async function assertCanRunHealthCheck(
  actor: HealthActor,
  service: ServiceSnapshot,
  serviceRepository: ServiceRepositoryPort
): Promise<void> {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.HEALTH_MANAGE)) {
    return;
  }

  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.HEALTH_RUN) &&
    (await serviceRepository.actorBelongsToTeam(actor.id, service.ownerTeamId))
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanManageHealthChecks(actor: HealthActor): void {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.HEALTH_MANAGE)) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}
