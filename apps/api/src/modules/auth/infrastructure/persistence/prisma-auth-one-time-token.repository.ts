import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  AuthOneTimeTokenRepositoryPort,
  CreateEmailVerificationTokenInput,
  CreatePasswordResetTokenInput
} from "../../application/ports";
import type { EmailVerificationToken, PasswordResetToken } from "../../domain";
import { mapEmailVerificationToken, mapPasswordResetToken } from "./auth-prisma.mappers";

@Injectable()
export class PrismaAuthOneTimeTokenRepository implements AuthOneTimeTokenRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput
  ): Promise<EmailVerificationToken> {
    const token = await this.prisma.emailVerificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        sentToEmail: input.sentToEmail,
        expiresAt: input.expiresAt
      }
    });

    return mapEmailVerificationToken(token);
  }

  async findEmailVerificationTokenByHash(
    tokenHash: string
  ): Promise<EmailVerificationToken | null> {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash }
    });

    return token ? mapEmailVerificationToken(token) : null;
  }

  async consumeEmailVerificationToken(tokenId: string, consumedAt: Date): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { consumedAt }
    });
  }

  async createPasswordResetToken(
    input: CreatePasswordResetTokenInput
  ): Promise<PasswordResetToken> {
    const token = await this.prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      }
    });

    return mapPasswordResetToken(token);
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    return token ? mapPasswordResetToken(token) : null;
  }

  async consumePasswordResetToken(tokenId: string, consumedAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { consumedAt }
    });
  }
}
