import { Inject, Injectable } from "@nestjs/common";

import {
  AUTH_AUDIT_LOG,
  AUTH_CLOCK,
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_SERVICE
} from "../../auth.tokens";
import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  ClockPort,
  TokenServicePort
} from "../ports";

export type LogoutRequest = {
  refreshToken: string | null;
};

export type LogoutContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionRepository: AuthSessionRepositoryPort,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(request: LogoutRequest, context: LogoutContext): Promise<void> {
    if (!request.refreshToken) {
      return;
    }

    const tokenHash = await this.tokenService.hashToken(request.refreshToken);
    const refreshToken = await this.sessionRepository.findRefreshTokenByHash(tokenHash);

    if (!refreshToken) {
      return;
    }

    const session = await this.sessionRepository.findSessionById(refreshToken.sessionId);

    if (!session) {
      return;
    }

    const alreadyRevoked = session.revokedAt !== null;
    const revokedAt = this.clock.now();

    if (!alreadyRevoked) {
      await this.sessionRepository.revokeSession(session.id, revokedAt, "logout");
    }

    await this.auditLog.record({
      actorUserId: session.userId,
      action: "auth.logout_succeeded",
      entityType: "AuthSession",
      entityId: session.id,
      metadata: {
        alreadyRevoked,
        refreshTokenId: refreshToken.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  }
}
