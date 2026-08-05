import type {
  AuthSession as PrismaAuthSession,
  EmailVerificationToken as PrismaEmailVerificationToken,
  PasswordResetToken as PrismaPasswordResetToken,
  Prisma,
  RefreshToken as PrismaRefreshToken
} from "@prisma/client";
import type { PermissionKey, UserRole } from "@plusops/contracts";

import type { AuthSession, AuthUser, RefreshTokenRecord } from "../../domain";
import type { EmailVerificationToken, PasswordResetToken } from "../../domain";

const roleKeys = [
  "admin",
  "engineering_manager",
  "developer",
  "qa_engineer",
  "viewer"
] as const satisfies readonly UserRole[];

const roleKeySet = new Set<string>(roleKeys);
const permissionKeyPattern = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

export const authUserInclude = {
  roleAssignments: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.UserInclude;

export type PrismaAuthUser = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

export function mapAuthUser(record: PrismaAuthUser): AuthUser {
  const permissions = new Set<PermissionKey>();
  const roles = record.roleAssignments.map((assignment) => {
    assignment.role.permissions.forEach((rolePermission) => {
      permissions.add(toPermissionKey(rolePermission.permission.key));
    });

    return toUserRole(assignment.role.key);
  });

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    passwordHash: record.passwordHash,
    isActive: record.isActive,
    emailVerifiedAt: record.emailVerifiedAt,
    lastLoginAt: record.lastLoginAt,
    roles,
    permissions: Array.from(permissions).sort(),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt
  };
}

export function mapAuthSession(record: PrismaAuthSession): AuthSession {
  return {
    id: record.id,
    userId: record.userId,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    lastSeenAt: record.lastSeenAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    revokedReason: record.revokedReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function mapRefreshToken(record: PrismaRefreshToken): RefreshTokenRecord {
  return {
    id: record.id,
    sessionId: record.sessionId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    rotatedAt: record.rotatedAt,
    revokedAt: record.revokedAt,
    revokedReason: record.revokedReason,
    replacedByTokenId: record.replacedByTokenId,
    createdAt: record.createdAt
  };
}

export function mapEmailVerificationToken(
  record: PrismaEmailVerificationToken
): EmailVerificationToken {
  return {
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    sentToEmail: record.sentToEmail,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    createdAt: record.createdAt
  };
}

export function mapPasswordResetToken(record: PrismaPasswordResetToken): PasswordResetToken {
  return {
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    createdAt: record.createdAt
  };
}

function toUserRole(value: string): UserRole {
  if (!roleKeySet.has(value)) {
    throw new Error(`Unknown user role key: ${value}`);
  }

  return value as UserRole;
}

function toPermissionKey(value: string): PermissionKey {
  if (!permissionKeyPattern.test(value)) {
    throw new Error(`Invalid permission key: ${value}`);
  }

  return value as PermissionKey;
}
