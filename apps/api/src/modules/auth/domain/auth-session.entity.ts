export type AuthSession = {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  replacedByTokenId: string | null;
  createdAt: Date;
};

export function isSessionActive(session: AuthSession, now = new Date()): boolean {
  return session.revokedAt === null && session.expiresAt > now;
}

export function isRefreshTokenActive(token: RefreshTokenRecord, now = new Date()): boolean {
  return token.revokedAt === null && token.expiresAt > now;
}

export function isRefreshTokenRotated(token: RefreshTokenRecord): boolean {
  return token.rotatedAt !== null || token.replacedByTokenId !== null;
}
