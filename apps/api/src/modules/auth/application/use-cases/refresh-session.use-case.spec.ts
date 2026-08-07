import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserRole } from "@plusops/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  AuthUserRepositoryPort,
  ClockPort,
  CreateRefreshTokenInput,
  CreateSessionWithRefreshTokenInput,
  RotateRefreshTokenInput,
  TokenServicePort,
  UpdateAuthUserProfileInput
} from "../ports";
import type { AuthSession, AuthUser, RefreshTokenRecord } from "../../domain";
import { RefreshSessionUseCase } from "./refresh-session.use-case";

describe("RefreshSessionUseCase", () => {
  let userRepository: FakeUserRepository;
  let sessionRepository: FakeSessionRepository;
  let tokenService: FakeTokenService;
  let auditLog: FakeAuditLog;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    userRepository = new FakeUserRepository();
    sessionRepository = new FakeSessionRepository();
    tokenService = new FakeTokenService();
    auditLog = new FakeAuditLog();
    useCase = createUseCase();
  });

  it("rotates a valid refresh token and returns a new access-token response", async () => {
    const result = await useCase.execute({ refreshToken: "raw-current-refresh-token" }, context());

    expect(result.response).toEqual({
      accessToken: "new-access-token",
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
    expect(result.refreshToken).toBe("raw-next-refresh-token");
    expect(result.refreshTokenExpiresAt.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("rejects invalid refresh tokens with a generic failure", async () => {
    sessionRepository.findRefreshTokenByHash.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ refreshToken: "invalid-refresh-token" }, context())
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
    expect(tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it("rejects expired refresh tokens", async () => {
    sessionRepository.findRefreshTokenByHash.mockResolvedValueOnce(
      createRefreshToken({ expiresAt: new Date("2026-08-04T00:00:00.000Z") })
    );

    await expect(
      useCase.execute({ refreshToken: "raw-current-refresh-token" }, context())
    ).rejects.toThrow("Invalid refresh session.");

    expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects revoked refresh tokens", async () => {
    sessionRepository.findRefreshTokenByHash.mockResolvedValueOnce(
      createRefreshToken({
        revokedAt: new Date("2026-08-05T00:00:00.000Z"),
        revokedReason: "logout"
      })
    );

    await expect(
      useCase.execute({ refreshToken: "raw-current-refresh-token" }, context())
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it("passes the hashed replacement token to the rotation repository call", async () => {
    await useCase.execute({ refreshToken: "raw-current-refresh-token" }, context());

    expect(tokenService.hashToken).toHaveBeenCalledWith("raw-current-refresh-token");
    expect(sessionRepository.findRefreshTokenByHash).toHaveBeenCalledWith(
      "hashed-current-refresh-token"
    );
    expect(sessionRepository.rotateRefreshToken).toHaveBeenCalledWith({
      currentTokenId: "refresh-token-1",
      nextTokenHash: "hashed-next-refresh-token",
      nextTokenExpiresAt: new Date("2026-08-12T00:00:00.000Z"),
      rotatedAt: new Date("2026-08-05T00:00:00.000Z"),
      previousTokenRevokedReason: "rotated",
      sessionExpiresAt: new Date("2026-08-12T00:00:00.000Z"),
      sessionSeenAt: new Date("2026-08-05T00:00:00.000Z")
    });
  });

  it("rejects old rotated refresh tokens and revokes the session family", async () => {
    sessionRepository.findRefreshTokenByHash.mockResolvedValueOnce(
      createRefreshToken({
        rotatedAt: new Date("2026-08-05T00:00:00.000Z"),
        revokedAt: new Date("2026-08-05T00:00:00.000Z"),
        revokedReason: "rotated",
        replacedByTokenId: "refresh-token-2"
      })
    );

    await expect(
      useCase.execute({ refreshToken: "raw-current-refresh-token" }, context())
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      "session-1",
      new Date("2026-08-05T00:00:00.000Z"),
      "refresh_token_reuse_detected"
    );
    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: "user-1",
      action: "auth.refresh_reuse_detected",
      entityType: "RefreshToken",
      entityId: "refresh-token-1",
      metadata: {
        sessionId: "session-1",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Browser"
      }
    });
  });

  it("rejects rotation conflicts and revokes the session", async () => {
    sessionRepository.rotateRefreshToken.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ refreshToken: "raw-current-refresh-token" }, context())
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      "session-1",
      new Date("2026-08-05T00:00:00.000Z"),
      "refresh_token_rotation_conflict"
    );
  });

  it("records a successful refresh audit event", async () => {
    await useCase.execute({ refreshToken: "raw-current-refresh-token" }, context());

    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: "user-1",
      action: "auth.refresh_rotated",
      entityType: "AuthSession",
      entityId: "session-1",
      metadata: {
        previousRefreshTokenId: "refresh-token-1",
        nextRefreshTokenId: "refresh-token-2",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Browser"
      }
    });
  });

  function createUseCase(config: Record<string, unknown> = {}): RefreshSessionUseCase {
    return new RefreshSessionUseCase(
      userRepository,
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
  findById = vi.fn(async (): Promise<AuthUser | null> => createAuthUser());
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
  findSessionById = vi.fn(async (): Promise<AuthSession | null> => createAuthSession());
  findRefreshTokenByHash = vi.fn(async (): Promise<RefreshTokenRecord | null> =>
    createRefreshToken()
  );
  rotateRefreshToken = vi.fn(
    async (input: RotateRefreshTokenInput): Promise<RefreshTokenRecord | null> =>
      createRefreshToken({
        id: "refresh-token-2",
        tokenHash: input.nextTokenHash,
        expiresAt: input.nextTokenExpiresAt
      })
  );
  touchSession = vi.fn(async () => undefined);
  listUserSessions = vi.fn(async () => [] as AuthSession[]);
  revokeSession = vi.fn(async () => undefined);
  revokeAllUserSessions = vi.fn(async () => undefined);
}

class FakeTokenService implements TokenServicePort {
  signAccessToken = vi.fn(async () => ({
    token: "new-access-token",
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
    rawToken: "raw-next-refresh-token",
    tokenHash: "hashed-next-refresh-token",
    expiresAt: new Date("2026-08-12T00:00:00.000Z")
  }));
  createEmailVerificationToken = vi.fn();
  createPasswordResetToken = vi.fn();
  hashToken = vi.fn(async () => "hashed-current-refresh-token");
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

function context() {
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
    tokenHash: "hashed-current-refresh-token",
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
