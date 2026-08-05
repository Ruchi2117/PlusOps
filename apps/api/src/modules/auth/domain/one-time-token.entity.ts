export type EmailVerificationToken = {
  id: string;
  userId: string;
  tokenHash: string;
  sentToEmail: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export function isOneTimeTokenActive(
  token: Pick<EmailVerificationToken | PasswordResetToken, "consumedAt" | "expiresAt">,
  now = new Date()
): boolean {
  return token.consumedAt === null && token.expiresAt > now;
}
