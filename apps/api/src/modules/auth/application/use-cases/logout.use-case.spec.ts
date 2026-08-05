import { describe, expect, it, vi, beforeEach } from "vitest";

import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  ClockPort,
  CreateRefreshTokenInput,
  CreateSessionWithRefreshTokenInput,
  RotateRefreshTokenInput,
  TokenServicePort
} from "../ports";
import type { AuthSession, RefreshTokenRecord } from "../../domain";
import { LogoutUseCase } from "./logout.use-case";

describe("LogoutUseCase", () => {
  let sessionRepository: FakeSessionRepository;
  let tokenService: FakeTokenService;
  let auditLog: FakeAuditLog;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    sessionRepository = new FakeSessionRepository();
    tokenService = new FakeTokenService();
    auditLog = new FakeAuditLog();
    useCase = new LogoutUseCase(
      sessionRepository,
      tokenService,
      auditLog,
      new FixedClock(new Date("2026-08-05T00:00:00.000Z"))
    );
  });

  it("revokes the session for a valid refresh cookie", async () => {
    await useCase.execute({ refreshToken: "raw-refresh-token" }, context());

    expect(tokenService.hashToken).toHaveBeenCalledWith("raw-refresh-token");
    expect(sessionRepository.findRefreshTokenByHash).toHaveBeenCalledWith("hashed-refresh-token");
    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      "session-1",
      new Date("2026-08-05T00:00:00.000Z"),
      "logout"
    );
  });

  it("does not fail or revoke anything when the refresh cookie is missing", async () => {
    await expect(useCase.execute({ refreshToken: null }, context())).resolves.toBeUndefined();

    expect(tokenService.hashToken).not.toHaveBeenCalled();
    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it("does not reveal invalid refresh tokens", async () => {
    sessionRepository.findRefreshTokenByHash.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ refreshToken: "invalid-refresh-token" }, context())
    ).resolves.toBeUndefined();

    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it("does not revoke a session that is already revoked", async () => {
    sessionRepository.findSessionById.mockResolvedValueOnce(
      createAuthSession({
        revokedAt: new Date("2026-08-04T00:00:00.000Z"),
        revokedReason: "logout"
      })
    );

    await useCase.execute({ refreshToken: "raw-refresh-token" }, context());

    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          alreadyRevoked: true
        })
      })
    );
  });

  it("records a logout audit event when a session is known", async () => {
    await useCase.execute({ refreshToken: "raw-refresh-token" }, context());

    expect(auditLog.record).toHaveBeenCalledWith({
      actorUserId: "user-1",
      action: "auth.logout_succeeded",
      entityType: "AuthSession",
      entityId: "session-1",
      metadata: {
        alreadyRevoked: false,
        refreshTokenId: "refresh-token-1",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest Browser"
      }
    });
  });
});

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
  signAccessToken = vi.fn();
  createRefreshToken = vi.fn();
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

function context() {
  return {
    ipAddress: "127.0.0.1",
    userAgent: "Vitest Browser"
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
