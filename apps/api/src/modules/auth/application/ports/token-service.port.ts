import type { PermissionKey, UserRole } from "@plusops/contracts";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  sessionId: string;
  roles: UserRole[];
  permissions: PermissionKey[];
};

export type SignedAccessToken = {
  token: string;
  expiresAt: Date;
};

export type GeneratedOpaqueToken = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface TokenServicePort {
  signAccessToken(payload: AccessTokenPayload): Promise<SignedAccessToken>;
  createRefreshToken(): Promise<GeneratedOpaqueToken>;
  createEmailVerificationToken(): Promise<GeneratedOpaqueToken>;
  createPasswordResetToken(): Promise<GeneratedOpaqueToken>;
  hashToken(rawToken: string): Promise<string>;
  verifyTokenHash(rawToken: string, tokenHash: string): Promise<boolean>;
}
