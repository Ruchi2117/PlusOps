import type { UserRole } from "@plusops/contracts";

import type { AuthUser } from "../../domain/auth-user.entity";

export type CreatePasswordUserInput = {
  email: string;
  name: string;
  passwordHash: string;
  roleKeys: UserRole[];
};

export type UpdateAuthUserProfileInput = {
  userId: string;
  name: string;
};

export interface AuthUserRepositoryPort {
  findById(userId: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  createPasswordUser(input: CreatePasswordUserInput): Promise<AuthUser>;
  assignRoles(userId: string, roleKeys: UserRole[], assignedByUserId: string | null): Promise<void>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<void>;
  recordLogin(userId: string, loggedInAt: Date): Promise<void>;
  updateProfile(input: UpdateAuthUserProfileInput): Promise<AuthUser>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
