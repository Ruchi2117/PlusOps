import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  AuthSessionRepositoryPort,
  CreateAuthSessionInput,
  CreateRefreshTokenInput,
  CreateSessionWithRefreshTokenInput,
  CreateSessionWithRefreshTokenResult,
  RotateRefreshTokenInput
} from "../../application/ports";
import type { AuthSession, RefreshTokenRecord } from "../../domain";
import { mapAuthSession, mapRefreshToken } from "./auth-prisma.mappers";

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session = await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt
      }
    });

    return mapAuthSession(session);
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const token = await this.prisma.refreshToken.create({
      data: {
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      }
    });

    return mapRefreshToken(token);
  }

  async createSessionWithRefreshToken(
    input: CreateSessionWithRefreshTokenInput
  ): Promise<CreateSessionWithRefreshTokenResult> {
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.authSession.create({
        data: {
          userId: input.session.userId,
          ipAddress: input.session.ipAddress,
          userAgent: input.session.userAgent,
          expiresAt: input.session.expiresAt
        }
      });
      const refreshToken = await transaction.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: input.refreshToken.tokenHash,
          expiresAt: input.refreshToken.expiresAt
        }
      });

      return {
        session: mapAuthSession(session),
        refreshToken: mapRefreshToken(refreshToken)
      };
    });
  }

  async findSessionById(sessionId: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId }
    });

    return session ? mapAuthSession(session) : null;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash }
    });

    return token ? mapRefreshToken(token) : null;
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<RefreshTokenRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const currentToken = await transaction.refreshToken.findUnique({
        where: { id: input.currentTokenId }
      });

      if (!currentToken) {
        return null;
      }

      const updatedCurrentToken = await transaction.refreshToken.updateMany({
        where: {
          id: currentToken.id,
          rotatedAt: null,
          revokedAt: null
        },
        data: {
          rotatedAt: input.rotatedAt,
          revokedAt: input.rotatedAt,
          revokedReason: input.previousTokenRevokedReason
        }
      });

      if (updatedCurrentToken.count !== 1) {
        return null;
      }

      const nextToken = await transaction.refreshToken.create({
        data: {
          sessionId: currentToken.sessionId,
          tokenHash: input.nextTokenHash,
          expiresAt: input.nextTokenExpiresAt
        }
      });

      await transaction.refreshToken.update({
        where: { id: currentToken.id },
        data: {
          replacedByTokenId: nextToken.id
        }
      });

      await transaction.authSession.update({
        where: { id: currentToken.sessionId },
        data: {
          expiresAt: input.sessionExpiresAt,
          lastSeenAt: input.sessionSeenAt
        }
      });

      return mapRefreshToken(nextToken);
    });
  }

  async touchSession(sessionId: string, seenAt: Date): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: seenAt }
    });
  }

  async listUserSessions(userId: string): Promise<AuthSession[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return sessions.map(mapAuthSession);
  }

  async revokeSession(sessionId: string, revokedAt: Date, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authSession.update({
        where: { id: sessionId },
        data: {
          revokedAt,
          revokedReason: reason
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          sessionId,
          revokedAt: null
        },
        data: {
          revokedAt,
          revokedReason: reason
        }
      })
    ]);
  }

  async revokeAllUserSessions(userId: string, revokedAt: Date, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt,
          revokedReason: reason
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          session: {
            userId
          },
          revokedAt: null
        },
        data: {
          revokedAt,
          revokedReason: reason
        }
      })
    ]);
  }
}
