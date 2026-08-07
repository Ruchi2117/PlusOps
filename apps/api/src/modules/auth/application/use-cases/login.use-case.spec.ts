import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LoginRequest, UserRole } from "@plusops/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  AuthUserRepositoryPort,
  ClockPort,
  CreateRefreshTokenInput,
  CreateSessionWithRefreshTokenInput,
  PasswordHasherPort,
  TokenServicePort,
  UpdateAuthUserProfileInput
} from "../ports";
import type { AuthSession, AuthUser, RefreshTokenRecord } from "../../domain";
import { LoginUseCase } from "./login.use-case";

const loginRequest = {
  email: "Developer@PlusOps.dev",
  password: "StrongerPass123"
} satisfies LoginRequest;

describe("LoginUseCase", () => {
  let userRepository: FakeUserRepository;
  let passwordHasher: FakePasswordHasher;
  let sessionRepository: FakeSessionRepository;
  let tokenService: FakeTokenService;
  let auditLog: FakeAuditLog;
  let useCase: LoginUseCase;

  beforeEach(() => {
    userRepository = new FakeUserRepository();
    passwordHasher = new FakePasswordHasher();
    sessionRepository = new FakeSessionRepository();
    tokenService = new FakeTokenService();
    auditLog = new FakeAuditLog();
    useCase = createUseCase();
  });

  it("creates a session and returns an access-token response for valid credentials", async () => {
    const result = await useCase.execute(loginRequest, createLoginContext());

    expect(result.response).toEqual({
      accessToken: "signed-access-token",
      accessTokenExpiresAt: "2026-08-05T00:15:00.000Z",
      user: {
        id: "user-1",
        email: "developer@plusops.dev",
        name: "PlusOps Developer",
        emailVerified: true,
        roles: ["developer"],
        permissions: ["incidents:read", "profile:read"]
      }
    });
    expect(result.refreshToken).toBe("raw-refresh-token");
    expect(result.refreshTokenExpiresAt.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("rejects wrong passwords with a generic authentication failure", async () => {
    passwordHasher.verify.mockResolvedValueOnce(false);

    await expect(useCase.execute(loginRequest, createLoginContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(sessionRepository.createSessionWithRefreshToken).not.toHaveBeenCalled();
    expect(tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it("rejects unknown emails with the same generic authentication failure", async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);

    await expect(useCase.execute(loginRequest, createLoginContext())).rejects.toThrow(
      "Invalid email or password."
    );

    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(sessionRepository.createSessionWithRefreshToken).not.toHaveBeenCalled();
  });

  it("normalizes email before lookup", async () => {
    await useCase.execute(
      {
        email: "  Developer@PlusOps.DEV  ",
        password: "StrongerPass123"
      },
      createLoginContext()
    );

    expect(userRepository.findByEmail).toHaveBeenCalledWith("developer@plusops.dev");
  });

  it("rejects disabled users after password verification", async () => {
    userRepository.findByEmail.mockResolvedValueOnce(createAuthUser({ isActive: false }));

    await expect(useCase.execute(loginRequest, createLoginContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(passwordHasher.verify).toHaveBeenCalled();
    expect(sessionRepository.createSessionWithRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects unverified users when email verification is required", async () => {
    userRepository.findByEmail.mockResolvedValueOnce(createAuthUser({ emailVerifiedAt: null }));
    useCase = createUseCase({ AUTH_REQUIRE_EMAIL_VERIFICATION: true });

    await expect(useCase.execute(loginRequest, createLoginContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("persists only the hashed refresh token when creating the session", async () => {
    await useCase.execute(loginRequest, createLoginContext());

    expect(sessionRepository.createSessionWithRefreshToken).toHaveBeenCalledWith({
      session: {
        userId: "user-1",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Browser",
        expiresAt: new Date("2026-08-12T00:00:00.000Z")
      },
      refreshToken: {
        tokenHash: "hashed-refresh-token",
        expiresAt: new Date("2026-08-12T00:00:00.000Z")
      }
    });
  });

  it("signs access tokens with user identity, session id, roles, and permissions", async () => {
    await useCase.execute(loginRequest, createLoginContext());

    expect(tokenService.signAccessToken).toHaveBeenCalledWith({
      sub: "user-1",
      email: "developer@plusops.dev",
      sessionId: "session-1",
      roles: ["developer"],
      permissions: ["incidents:read", "profile:read"]
    });
  });

  it("records last login and a successful login audit event", async () => {
    await useCase.execute(loginRequest, createLoginContext());

    expect(userRepository.recordLogin).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-08-05T00:00:00.000Z")
    );
    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: "user-1",
      action: "auth.login_succeeded",
      entityType: "AuthSession",
      entityId: "session-1",
      metadata: {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Browser"
      }
    });
  });

  function createUseCase(config: Record<string, unknown> = {}): LoginUseCase {
    return new LoginUseCase(
      userRepository,
      passwordHasher,
      sessionRepository,
      tokenService,
      auditLog,
      new FixedClock(new Date("2026-08-05T00:00:00.000Z")),
      new ConfigService({
        AUTH_REQUIRE_EMAIL_VERIFICATION: false,
        ...config
      })
    );
  }
});

class FakeUserRepository implements AuthUserRepositoryPort {
  findById = vi.fn(async () => null as AuthUser | null);
  findByEmail = vi.fn(async (): Promise<AuthUser | null> => createAuthUser());
  createPasswordUser = vi.fn(async () => createAuthUser());
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

class FakeSessionRepository implements AuthSessionRepositoryPort {
  createSession = vi.fn(async () => createAuthSession());
  createRefreshToken = vi.fn(async (input: CreateRefreshTokenInput) =>
    createRefreshToken({
      sessionId: input.sessionId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt
    })
  );
  createSessionWithRefreshToken = vi.fn(async (input: CreateSessionWithRefreshTokenInput) => ({
    session: createAuthSession({
      userId: input.session.userId,
      ipAddress: input.session.ipAddress,
      userAgent: input.session.userAgent,
      expiresAt: input.session.expiresAt
    }),
    refreshToken: createRefreshToken({
      sessionId: "session-1",
      tokenHash: input.refreshToken.tokenHash,
      expiresAt: input.refreshToken.expiresAt
    })
  }));
  findSessionById = vi.fn(async () => null as AuthSession | null);
  findRefreshTokenByHash = vi.fn(async () => null as RefreshTokenRecord | null);
  rotateRefreshToken = vi.fn(async () => createRefreshToken());
  touchSession = vi.fn(async () => undefined);
  listUserSessions = vi.fn(async () => [] as AuthSession[]);
  revokeSession = vi.fn(async () => undefined);
  revokeAllUserSessions = vi.fn(async () => undefined);
}

class FakeTokenService implements TokenServicePort {
  signAccessToken = vi.fn(async () => ({
    token: "signed-access-token",
    expiresAt: new Date("2026-08-05T00:15:00.000Z")
  }));
  verifyAccessToken = vi.fn(async () => ({
    sub: "user-1",
    email: "developer@plusops.dev",
    sessionId: "session-1",
    roles: ["developer"] as UserRole[],
    permissions: ["incidents:read", "profile:read"]
  }));
  createRefreshToken = vi.fn(async () => ({
    rawToken: "raw-refresh-token",
    tokenHash: "hashed-refresh-token",
    expiresAt: new Date("2026-08-12T00:00:00.000Z")
  }));
  createEmailVerificationToken = vi.fn();
  createPasswordResetToken = vi.fn();
  hashToken = vi.fn(async () => "hashed-refresh-token");
  verifyTokenHash = vi.fn(async () => true);
}

class FakeAuditLog implements AuthAuditLogPort {
  record = vi.fn(async () => undefined);
}

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}

function createLoginContext() {
  return {
    ipAddress: "127.0.0.1",
    userAgent: "Vitest Browser"
  };
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
    emailVerifiedAt: now,
    lastLoginAt: null,
    roles,
    permissions: ["incidents:read", "profile:read"],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides
  };
}

function createAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  const now = new Date("2026-08-05T00:00:00.000Z");

  return {
    id: "session-1",
    userId: "user-1",
    ipAddress: "127.0.0.1",
    userAgent: "Vitest Browser",
    lastSeenAt: null,
    expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    revokedAt: null,
    revokedReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRefreshToken(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
  return {
    id: "refresh-token-1",
    sessionId: "session-1",
    tokenHash: "hashed-refresh-token",
    expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    lastUsedAt: null,
    rotatedAt: null,
    revokedAt: null,
    revokedReason: null,
    replacedByTokenId: null,
    createdAt: new Date("2026-08-05T00:00:00.000Z"),
    ...overrides
  };
}
