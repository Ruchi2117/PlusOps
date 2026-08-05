import type { AuthSession, RefreshTokenRecord } from "../../domain/auth-session.entity";

export type CreateAuthSessionInput = {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
};

export type CreateRefreshTokenInput = {
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type CreateSessionWithRefreshTokenInput = {
  session: CreateAuthSessionInput;
  refreshToken: Omit<CreateRefreshTokenInput, "sessionId">;
};

export type CreateSessionWithRefreshTokenResult = {
  session: AuthSession;
  refreshToken: RefreshTokenRecord;
};

export type RotateRefreshTokenInput = {
  currentTokenId: string;
  nextTokenHash: string;
  nextTokenExpiresAt: Date;
  rotatedAt: Date;
  previousTokenRevokedReason: string;
  sessionExpiresAt: Date;
  sessionSeenAt: Date;
};

export interface AuthSessionRepositoryPort {
  createSession(input: CreateAuthSessionInput): Promise<AuthSession>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  createSessionWithRefreshToken(
    input: CreateSessionWithRefreshTokenInput
  ): Promise<CreateSessionWithRefreshTokenResult>;
  findSessionById(sessionId: string): Promise<AuthSession | null>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<RefreshTokenRecord | null>;
  touchSession(sessionId: string, seenAt: Date): Promise<void>;
  listUserSessions(userId: string): Promise<AuthSession[]>;
  revokeSession(sessionId: string, revokedAt: Date, reason: string): Promise<void>;
  revokeAllUserSessions(userId: string, revokedAt: Date, reason: string): Promise<void>;
}
