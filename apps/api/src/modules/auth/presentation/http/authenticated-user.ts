import type { PermissionKey, UserRole } from "@plusops/contracts";

export type AuthenticatedUser = {
  id: string;
  email: string;
  sessionId: string;
  roles: UserRole[];
  permissions: PermissionKey[];
};
