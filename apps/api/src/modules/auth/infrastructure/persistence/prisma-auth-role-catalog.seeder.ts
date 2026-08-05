import { Inject, Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import type { PermissionKey, UserRole } from "@plusops/contracts";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { ROLE_PERMISSION_MATRIX } from "../../authorization/permission-catalog";

const roleMetadata = {
  admin: {
    name: "Admin",
    description: "Full platform administration access."
  },
  engineering_manager: {
    name: "Engineering Manager",
    description: "Team ownership, incident escalation, and operational reports."
  },
  developer: {
    name: "Developer",
    description: "Service ownership and incident response access."
  },
  qa_engineer: {
    name: "QA Engineer",
    description: "API testing, report visibility, and incident collaboration."
  },
  viewer: {
    name: "Viewer",
    description: "Read-only operational visibility."
  }
} satisfies Record<UserRole, { name: string; description: string }>;

@Injectable()
export class PrismaAuthRoleCatalogSeeder implements OnModuleInit {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const permissionKeys = Array.from(new Set(Object.values(ROLE_PERMISSION_MATRIX).flat()));

      for (const permissionKey of permissionKeys) {
        await transaction.permission.upsert({
          where: { key: permissionKey },
          update: {},
          create: {
            key: permissionKey,
            description: describePermission(permissionKey)
          }
        });
      }

      for (const [roleKey, metadata] of Object.entries(roleMetadata)) {
        const role = await transaction.role.upsert({
          where: { key: roleKey },
          update: {
            name: metadata.name,
            description: metadata.description,
            isSystem: true
          },
          create: {
            key: roleKey,
            name: metadata.name,
            description: metadata.description,
            isSystem: true
          }
        });

        const permissions = await transaction.permission.findMany({
          where: {
            key: {
              in: [...ROLE_PERMISSION_MATRIX[roleKey as UserRole]]
            }
          },
          select: {
            id: true
          }
        });

        await transaction.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id
          })),
          skipDuplicates: true
        });
      }
    });
  }
}

function describePermission(permissionKey: PermissionKey): string {
  const [resource, action] = permissionKey.split(":");
  return `Allows ${action ?? "requested"} access for ${resource ?? "the resource"}.`;
}
