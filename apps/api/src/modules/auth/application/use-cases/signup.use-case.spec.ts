import { ConflictException } from "@nestjs/common";
import type { UserRole } from "@plusops/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AuthAuditLogPort,
  AuthUserRepositoryPort,
  CreatePasswordUserInput,
  PasswordHasherPort,
  UpdateAuthUserProfileInput
} from "../ports";
import type { AuthUser } from "../../domain";
import { SignupUseCase, normalizeEmail } from "./signup.use-case";

describe("SignupUseCase", () => {
  let userRepository: FakeUserRepository;
  let passwordHasher: FakePasswordHasher;
  let auditLog: FakeAuditLog;
  let useCase: SignupUseCase;

  beforeEach(() => {
    userRepository = new FakeUserRepository();
    passwordHasher = new FakePasswordHasher();
    auditLog = new FakeAuditLog();
    useCase = new SignupUseCase(userRepository, passwordHasher, auditLog);
  });

  it("creates a new account without issuing auth tokens", async () => {
    const response = await useCase.execute({
      email: "Developer@PlusOps.dev",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    expect(response).toEqual({
      user: {
        id: "user-1",
        email: "developer@plusops.dev",
        name: "PlusOps Developer",
        emailVerified: false,
        roles: ["developer"],
        permissions: ["incidents:read", "profile:read"]
      },
      emailVerificationRequired: true
    });
    expect(response).not.toHaveProperty("accessToken");
  });

  it("rejects duplicate emails before hashing the password", async () => {
    userRepository.findByEmail.mockResolvedValueOnce(createAuthUser());

    await expect(
      useCase.execute({
        email: "developer@plusops.dev",
        name: "PlusOps Developer",
        password: "StrongerPass123"
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.createPasswordUser).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it("normalizes email before lookup and persistence", async () => {
    await useCase.execute({
      email: "  Developer@PlusOps.DEV  ",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith("developer@plusops.dev");
    expect(userRepository.createPasswordUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "developer@plusops.dev"
      })
    );
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("hashes the submitted password before persistence", async () => {
    await useCase.execute({
      email: "developer@plusops.dev",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith("StrongerPass123");
    expect(userRepository.createPasswordUser).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: "hashed-password"
      })
    );
  });

  it("assigns the default developer role during registration", async () => {
    await useCase.execute({
      email: "developer@plusops.dev",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    expect(userRepository.createPasswordUser).toHaveBeenCalledWith(
      expect.objectContaining({
        roleKeys: ["developer"]
      })
    );
  });

  it("records a signup audit event after account creation", async () => {
    await useCase.execute({
      email: "developer@plusops.dev",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: null,
      action: "auth.signup_completed",
      entityType: "User",
      entityId: "user-1",
      metadata: {
        defaultRole: "developer",
        emailVerified: false
      }
    });
  });
});

class FakeUserRepository implements AuthUserRepositoryPort {
  findById = vi.fn(async () => null as AuthUser | null);
  findByEmail = vi.fn(async () => null as AuthUser | null);
  createPasswordUser = vi.fn(async (input: CreatePasswordUserInput) =>
    createAuthUser({
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      roles: input.roleKeys
    })
  );
  assignRoles = vi.fn(async () => undefined);
  markEmailVerified = vi.fn(async () => undefined);
  recordLogin = vi.fn(async () => undefined);
  updateProfile = vi.fn(async (input: UpdateAuthUserProfileInput) =>
    createAuthUser({ id: input.userId, name: input.name })
  );
  updatePasswordHash = vi.fn(async () => undefined);
}

class FakePasswordHasher implements PasswordHasherPort {
  hash = vi.fn(async () => "hashed-password");
  verify = vi.fn(async () => true);
}

class FakeAuditLog implements AuthAuditLogPort {
  record = vi.fn(async () => undefined);
}

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  const now = new Date("2026-08-05T00:00:00.000Z");
  const roles = overrides.roles ?? (["developer"] satisfies UserRole[]);

  return {
    id: "user-1",
    email: "developer@plusops.dev",
    name: "PlusOps Developer",
    passwordHash: "hashed-password",
    isActive: true,
    emailVerifiedAt: null,
    lastLoginAt: null,
    roles,
    permissions: ["incidents:read", "profile:read"],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides
  };
}
