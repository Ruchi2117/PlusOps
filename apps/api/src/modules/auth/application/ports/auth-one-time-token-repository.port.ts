import type {
  EmailVerificationToken,
  PasswordResetToken
} from "../../domain/one-time-token.entity";

export type CreateEmailVerificationTokenInput = {
  userId: string;
  tokenHash: string;
  sentToEmail: string;
  expiresAt: Date;
};

export type CreatePasswordResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface AuthOneTimeTokenRepositoryPort {
  createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput
  ): Promise<EmailVerificationToken>;
  findEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  consumeEmailVerificationToken(tokenId: string, consumedAt: Date): Promise<void>;
  createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  consumePasswordResetToken(tokenId: string, consumedAt: Date): Promise<void>;
}
