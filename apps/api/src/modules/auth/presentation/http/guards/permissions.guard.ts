import { ForbiddenException, Inject, Injectable, SetMetadata } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PermissionKey } from "@plusops/contracts";

import type { AuthenticatedUser } from "../authenticated-user";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionKey[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Permission denied.");
    }

    const grantedPermissions = new Set(user.permissions);
    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission)
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException("Permission denied.");
    }

    return true;
  }
}
