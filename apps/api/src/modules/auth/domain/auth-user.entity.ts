import type { PermissionKey, UserRole } from "@plusops/contracts";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  roles: UserRole[];
  permissions: PermissionKey[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export function canAuthenticate(user: Pick<AuthUser, "isActive" | "deletedAt">): boolean {
  return user.isActive && user.deletedAt === null;
}

export function hasVerifiedEmail(user: Pick<AuthUser, "emailVerifiedAt">): boolean {
  return user.emailVerifiedAt !== null;
}
