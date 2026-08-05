import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  AuthUserRepositoryPort,
  CreatePasswordUserInput,
  UpdateAuthUserProfileInput
} from "../../application/ports";
import type { AuthUser } from "../../domain";
import { authUserInclude, mapAuthUser } from "./auth-prisma.mappers";

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async findById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude
    });

    return user ? mapAuthUser(user) : null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      include: authUserInclude
    });

    return user ? mapAuthUser(user) : null;
  }

  async createPasswordUser(input: CreatePasswordUserInput): Promise<AuthUser> {
    const roleKeys = Array.from(new Set(input.roleKeys));

    const user = await this.prisma.$transaction(async (transaction) => {
      const roles = await findRolesByKeys(transaction, roleKeys);

      return transaction.user.create({
        data: {
          email: normalizeEmail(input.email),
          name: input.name,
          passwordHash: input.passwordHash,
          roleAssignments: {
            create: roles.map((role) => ({
              roleId: role.id
            }))
          }
        },
        include: authUserInclude
      });
    });

    return mapAuthUser(user);
  }

  async assignRoles(
    userId: string,
    roleKeys: CreatePasswordUserInput["roleKeys"],
    assignedByUserId: string | null
  ): Promise<void> {
    const uniqueRoleKeys = Array.from(new Set(roleKeys));
    const roles = await findRolesByKeys(this.prisma, uniqueRoleKeys);

    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.id,
        assignedByUserId
      })),
      skipDuplicates: true
    });
  }

  async markEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: verifiedAt }
    });
  }

  async recordLogin(userId: string, loggedInAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: loggedInAt }
    });
  }

  async updateProfile(input: UpdateAuthUserProfileInput): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: input.userId },
      data: { name: input.name },
      include: authUserInclude
    });

    return mapAuthUser(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findRolesByKeys(
  prisma: Prisma.TransactionClient | PrismaService,
  roleKeys: CreatePasswordUserInput["roleKeys"]
) {
  const roles = await prisma.role.findMany({
    where: {
      key: {
        in: roleKeys
      }
    },
    select: {
      key: true,
      id: true
    }
  });

  if (roles.length !== roleKeys.length) {
    const foundKeys = new Set(roles.map((role) => role.key));
    const missingKeys = roleKeys.filter((roleKey) => !foundKeys.has(roleKey));

    throw new Error(`Missing role catalog entries: ${missingKeys.join(", ")}`);
  }

  return roles;
}
