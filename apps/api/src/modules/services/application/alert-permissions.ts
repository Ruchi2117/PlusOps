import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import { hasPermission } from "./service-permissions";

export type AlertActor = AuthenticatedUser;

export function assertCanViewAlerts(actor: AlertActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.ALERTS_VIEW)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanEvaluateAlerts(actor: AlertActor): void {
  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.ALERTS_EVALUATE) ||
    hasPermission(actor, SYSTEM_PERMISSIONS.ALERTS_MANAGE)
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanManageAlerts(actor: AlertActor): void {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.ALERTS_MANAGE)) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}
