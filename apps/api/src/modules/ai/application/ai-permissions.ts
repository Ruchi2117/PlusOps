import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";

export type AIActor = AuthenticatedUser;

export function assertCanUseAI(actor: AIActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.AI_USE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanUseEngineeringAI(actor: AIActor): void {
  if (
    !hasPermission(actor, SYSTEM_PERMISSIONS.AI_ENGINEERING_USE) &&
    !hasPermission(actor, SYSTEM_PERMISSIONS.AI_PROMPTS_MANAGE) &&
    !hasPermission(actor, SYSTEM_PERMISSIONS.AI_PROVIDERS_MANAGE)
  ) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanManagePrompts(actor: AIActor): void {
  if (
    !hasPermission(actor, SYSTEM_PERMISSIONS.AI_PROMPTS_MANAGE) &&
    !hasPermission(actor, SYSTEM_PERMISSIONS.AI_PROVIDERS_MANAGE)
  ) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanManageProviders(actor: AIActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.AI_PROVIDERS_MANAGE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

function hasPermission(actor: AIActor, permission: string): boolean {
  return actor.permissions.includes(permission);
}
