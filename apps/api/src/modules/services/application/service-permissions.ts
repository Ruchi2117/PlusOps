import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { ServiceSnapshot } from "../domain";
import type { ServiceRepositoryPort } from "./ports";

export type ServiceActor = AuthenticatedUser;

export function assertCanViewServices(actor: ServiceActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_VIEW)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export async function assertCanCreateService(
  actor: ServiceActor,
  ownerTeamId: string,
  serviceRepository: ServiceRepositoryPort
): Promise<void> {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_MANAGE)) {
    return;
  }

  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_CREATE) &&
    (await serviceRepository.actorBelongsToTeam(actor.id, ownerTeamId))
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export async function assertCanUpdateService(
  actor: ServiceActor,
  service: ServiceSnapshot,
  serviceRepository: ServiceRepositoryPort
): Promise<void> {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_MANAGE)) {
    return;
  }

  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_UPDATE) &&
    (await serviceRepository.actorBelongsToTeam(actor.id, service.ownerTeamId))
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanArchiveService(actor: ServiceActor): void {
  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_ARCHIVE) ||
    hasPermission(actor, SYSTEM_PERMISSIONS.SERVICE_MANAGE)
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function hasPermission(actor: ServiceActor, permission: string): boolean {
  return actor.permissions.includes(permission);
}
