import { describe, expect, it } from "vitest";

import { mapAuthUser } from "./auth-prisma.mappers";
import type { PrismaAuthUser } from "./auth-prisma.mappers";

describe("auth Prisma mappers", () => {
  it("maps roles and de-duplicated permissions into an AuthUser", () => {
    const user = mapAuthUser(createPrismaAuthUser());

    expect(user.roles).toEqual(["developer", "viewer"]);
    expect(user.permissions).toEqual(["incidents:read", "profile:read"]);
  });

  it("rejects unknown role keys from persistence", () => {
    const record = createPrismaAuthUser();
    record.roleAssignments[0]!.role.key = "owner";

    expect(() => mapAuthUser(record)).toThrow("Unknown user role key");
  });
});

function createPrismaAuthUser(): PrismaAuthUser {
  const now = new Date("2026-08-05T00:00:00.000Z");

  return {
    id: "user-1",
    email: "developer@plusops.test",
    name: "PlusOps Developer",
    passwordHash: "hashed-password",
    isActive: true,
    emailVerifiedAt: now,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    roleAssignments: [
      {
        id: "user-role-1",
        userId: "user-1",
        roleId: "role-1",
        assignedByUserId: null,
        assignedAt: now,
        role: {
          id: "role-1",
          key: "developer",
          name: "Developer",
          description: null,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
          permissions: [
            {
              roleId: "role-1",
              permissionId: "permission-1",
              createdAt: now,
              permission: {
                id: "permission-1",
                key: "incidents:read",
                description: null,
                createdAt: now,
                updatedAt: now
              }
            },
            {
              roleId: "role-1",
              permissionId: "permission-2",
              createdAt: now,
              permission: {
                id: "permission-2",
                key: "profile:read",
                description: null,
                createdAt: now,
                updatedAt: now
              }
            }
          ]
        }
      },
      {
        id: "user-role-2",
        userId: "user-1",
        roleId: "role-2",
        assignedByUserId: null,
        assignedAt: now,
        role: {
          id: "role-2",
          key: "viewer",
          name: "Viewer",
          description: null,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
          permissions: [
            {
              roleId: "role-2",
              permissionId: "permission-1",
              createdAt: now,
              permission: {
                id: "permission-1",
                key: "incidents:read",
                description: null,
                createdAt: now,
                updatedAt: now
              }
            }
          ]
        }
      }
    ]
  } as PrismaAuthUser;
}
