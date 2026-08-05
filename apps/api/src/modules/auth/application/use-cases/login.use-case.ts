import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LoginRequest, LoginResponse } from "@plusops/contracts";

import {
  AUTH_AUDIT_LOG,
  AUTH_CLOCK,
  AUTH_PASSWORD_HASHER,
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  AUTH_USER_REPOSITORY
} from "../../auth.tokens";
import { canAuthenticate, hasVerifiedEmail } from "../../domain";
import type {
  AuthAuditLogPort,
  AuthSessionRepositoryPort,
  AuthUserRepositoryPort,
  ClockPort,
  PasswordHasherPort,
  TokenServicePort
} from "../ports";
import { toCurrentUser } from "../mappers/current-user.mapper";
import { normalizeEmail } from "./signup.use-case";

const invalidCredentialsMessage = "Invalid email or password.";

export type LoginContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type LoginUseCaseResult = {
  response: LoginResponse;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly userRepository: AuthUserRepositoryPort,
    @Inject(AUTH_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
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

  async execute(request: LoginRequest, context: LoginContext): Promise<LoginUseCaseResult> {
    const email = normalizeEmail(request.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user?.passwordHash) {
      await this.recordFailedLogin(null, "invalid_credentials", context);
      throwInvalidCredentials();
    }

    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, request.password);

    if (!passwordMatches) {
      await this.recordFailedLogin(user.id, "invalid_credentials", context);
      throwInvalidCredentials();
    }

    if (!canAuthenticate(user)) {
      await this.recordFailedLogin(user.id, "inactive_account", context);
      throwInvalidCredentials();
    }

    if (this.requiresVerifiedEmail() && !hasVerifiedEmail(user)) {
      await this.recordFailedLogin(user.id, "unverified_email", context);
      throwInvalidCredentials();
    }

    const refreshToken = await this.tokenService.createRefreshToken();
    const { session } = await this.sessionRepository.createSessionWithRefreshToken({
      session: {
        userId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        expiresAt: refreshToken.expiresAt
      },
      refreshToken: {
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt
      }
    });

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
      roles: user.roles,
      permissions: user.permissions
    });

    await this.userRepository.recordLogin(user.id, this.clock.now());
    await this.auditLog.record({
      actorUserId: user.id,
      action: "auth.login_succeeded",
      entityType: "AuthSession",
      entityId: session.id,
      metadata: {
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
      refreshToken: refreshToken.rawToken,
      refreshTokenExpiresAt: refreshToken.expiresAt
    };
  }

  private requiresVerifiedEmail(): boolean {
    return this.configService.get<boolean>("AUTH_REQUIRE_EMAIL_VERIFICATION") ?? false;
  }

  private async recordFailedLogin(
    actorUserId: string | null,
    reason: "invalid_credentials" | "inactive_account" | "unverified_email",
    context: LoginContext
  ): Promise<void> {
    await this.auditLog.record({
      actorUserId,
      action: "auth.login_failed",
      entityType: "User",
      entityId: actorUserId ?? "unknown",
      metadata: {
        reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  }
}

function throwInvalidCredentials(): never {
  throw new UnauthorizedException(invalidCredentialsMessage);
}
