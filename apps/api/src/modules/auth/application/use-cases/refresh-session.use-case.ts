import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RefreshResponse } from "@plusops/contracts";

import {
  AUTH_AUDIT_LOG,
  AUTH_CLOCK,
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  AUTH_USER_REPOSITORY
} from "../../auth.tokens";
import {
  canAuthenticate,
  hasVerifiedEmail,
  isRefreshTokenActive,
  isRefreshTokenRotated,
  isSessionActive
} from "../../domain";
import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  AuthUserRepositoryPort,
  ClockPort,
  TokenServicePort
} from "../ports";
import { toCurrentUser } from "../mappers/current-user.mapper";

const invalidRefreshMessage = "Invalid refresh session.";

export type RefreshSessionRequest = {
  refreshToken: string | null;
};

export type RefreshSessionContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type RefreshSessionUseCaseResult = {
  response: RefreshResponse;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

type RefreshFailureReason =
  | "missing_refresh_token"
  | "invalid_refresh_token"
  | "revoked_refresh_token"
  | "expired_refresh_token"
  | "invalid_session"
  | "inactive_account"
  | "unverified_email"
  | "rotation_conflict";

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly userRepository: AuthUserRepositoryPort,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionRepository: AuthSessionRepositoryPort,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  async execute(
    request: RefreshSessionRequest,
    context: RefreshSessionContext
  ): Promise<RefreshSessionUseCaseResult> {
    const now = this.clock.now();

    if (!request.refreshToken) {
      await this.recordFailedRefresh(null, "unknown", "missing_refresh_token", context);
      throwInvalidRefreshSession();
    }

    const tokenHash = await this.tokenService.hashToken(request.refreshToken);
    const currentRefreshToken = await this.sessionRepository.findRefreshTokenByHash(tokenHash);

    if (!currentRefreshToken) {
      await this.recordFailedRefresh(null, "unknown", "invalid_refresh_token", context);
      throwInvalidRefreshSession();
    }

    const session = await this.sessionRepository.findSessionById(currentRefreshToken.sessionId);

    if (isRefreshTokenRotated(currentRefreshToken)) {
      if (session) {
        await this.sessionRepository.revokeSession(session.id, now, "refresh_token_reuse_detected");
      }

      await this.auditLog.record({
        actorUserId: session?.userId ?? null,
        action: "auth.refresh_reuse_detected",
        entityType: "RefreshToken",
        entityId: currentRefreshToken.id,
        metadata: {
          sessionId: currentRefreshToken.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      });
      throwInvalidRefreshSession();
    }

    if (currentRefreshToken.revokedAt !== null) {
      await this.recordFailedRefresh(
        session?.userId ?? null,
        currentRefreshToken.id,
        "revoked_refresh_token",
        context
      );
      throwInvalidRefreshSession();
    }

    if (!isRefreshTokenActive(currentRefreshToken, now)) {
      await this.recordFailedRefresh(
        session?.userId ?? null,
        currentRefreshToken.id,
        "expired_refresh_token",
        context
      );
      throwInvalidRefreshSession();
    }

    if (!session || !isSessionActive(session, now)) {
      await this.recordFailedRefresh(
        session?.userId ?? null,
        currentRefreshToken.id,
        "invalid_session",
        context
      );
      throwInvalidRefreshSession();
    }

    const user = await this.userRepository.findById(session.userId);

    if (!user || !canAuthenticate(user)) {
      await this.sessionRepository.revokeSession(session.id, now, "inactive_account");
      await this.recordFailedRefresh(
        user?.id ?? session.userId,
        currentRefreshToken.id,
        "inactive_account",
        context
      );
      throwInvalidRefreshSession();
    }

    if (this.requiresVerifiedEmail() && !hasVerifiedEmail(user)) {
      await this.sessionRepository.revokeSession(session.id, now, "unverified_email");
      await this.recordFailedRefresh(user.id, currentRefreshToken.id, "unverified_email", context);
      throwInvalidRefreshSession();
    }

    const nextRefreshToken = await this.tokenService.createRefreshToken();
    const rotatedRefreshToken = await this.sessionRepository.rotateRefreshToken({
      currentTokenId: currentRefreshToken.id,
      nextTokenHash: nextRefreshToken.tokenHash,
      nextTokenExpiresAt: nextRefreshToken.expiresAt,
      rotatedAt: now,
      previousTokenRevokedReason: "rotated",
      sessionExpiresAt: nextRefreshToken.expiresAt,
      sessionSeenAt: now
    });

    if (!rotatedRefreshToken) {
      await this.sessionRepository.revokeSession(
        session.id,
        now,
        "refresh_token_rotation_conflict"
      );
      await this.auditLog.record({
        actorUserId: user.id,
        action: "auth.refresh_reuse_detected",
        entityType: "RefreshToken",
        entityId: currentRefreshToken.id,
        metadata: {
          reason: "rotation_conflict",
          sessionId: session.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      });
      throwInvalidRefreshSession();
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
      roles: user.roles,
      permissions: user.permissions
    });

    await this.auditLog.record({
      actorUserId: user.id,
      action: "auth.refresh_rotated",
      entityType: "AuthSession",
      entityId: session.id,
      metadata: {
        previousRefreshTokenId: currentRefreshToken.id,
        nextRefreshTokenId: rotatedRefreshToken.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    return {
      response: {
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
        user: toCurrentUser(user)
      },
      refreshToken: nextRefreshToken.rawToken,
      refreshTokenExpiresAt: nextRefreshToken.expiresAt
    };
  }

  private requiresVerifiedEmail(): boolean {
    return this.configService.get<boolean>("AUTH_REQUIRE_EMAIL_VERIFICATION") ?? false;
  }

  private async recordFailedRefresh(
    actorUserId: string | null,
    entityId: string,
    reason: RefreshFailureReason,
    context: RefreshSessionContext
  ): Promise<void> {
    await this.auditLog.record({
      actorUserId,
      action: "auth.refresh_failed",
      entityType: "RefreshToken",
      entityId,
      metadata: {
        reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  }
}

function throwInvalidRefreshSession(): never {
  throw new UnauthorizedException(invalidRefreshMessage);
}
