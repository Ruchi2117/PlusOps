import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "./application/use-cases/refresh-session.use-case";
import { SignupUseCase } from "./application/use-cases/signup.use-case";
import {
  AUTH_AUDIT_LOG,
  AUTH_CLOCK,
  AUTH_ONE_TIME_TOKEN_REPOSITORY,
  AUTH_PASSWORD_HASHER,
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  AUTH_USER_REPOSITORY
} from "./auth.tokens";
import { PrismaAuthAuditLogRepository } from "./infrastructure/persistence/prisma-auth-audit-log.repository";
import { PrismaAuthOneTimeTokenRepository } from "./infrastructure/persistence/prisma-auth-one-time-token.repository";
import { PrismaAuthRoleCatalogSeeder } from "./infrastructure/persistence/prisma-auth-role-catalog.seeder";
import { PrismaAuthSessionRepository } from "./infrastructure/persistence/prisma-auth-session.repository";
import { PrismaAuthUserRepository } from "./infrastructure/persistence/prisma-auth-user.repository";
import { Argon2PasswordHasher } from "./infrastructure/security/argon2-password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";
import { SystemClock } from "./infrastructure/time/system-clock";
import { AuthController } from "./presentation/http/auth.controller";
import { AccessTokenGuard } from "./presentation/http/guards/access-token.guard";
import { PermissionsGuard } from "./presentation/http/guards/permissions.guard";
import { RefreshTokenCookieService } from "./presentation/http/refresh-token-cookie.service";

const authProviders = [
  {
    provide: AUTH_USER_REPOSITORY,
    useClass: PrismaAuthUserRepository
  },
  {
    provide: AUTH_SESSION_REPOSITORY,
    useClass: PrismaAuthSessionRepository
  },
  {
    provide: AUTH_ONE_TIME_TOKEN_REPOSITORY,
    useClass: PrismaAuthOneTimeTokenRepository
  },
  {
    provide: AUTH_PASSWORD_HASHER,
    useClass: Argon2PasswordHasher
  },
  {
    provide: AUTH_TOKEN_SERVICE,
    useClass: JwtTokenService
  },
  {
    provide: AUTH_AUDIT_LOG,
    useClass: PrismaAuthAuditLogRepository
  },
  {
    provide: AUTH_CLOCK,
    useClass: SystemClock
  }
];

const authProviderTokens = [
  AUTH_USER_REPOSITORY,
  AUTH_SESSION_REPOSITORY,
  AUTH_ONE_TIME_TOKEN_REPOSITORY,
  AUTH_PASSWORD_HASHER,
  AUTH_TOKEN_SERVICE,
  AUTH_AUDIT_LOG,
  AUTH_CLOCK
];

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [
    ...authProviders,
    PrismaAuthRoleCatalogSeeder,
    RefreshTokenCookieService,
    AccessTokenGuard,
    PermissionsGuard,
    LoginUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    SignupUseCase
  ],
  exports: [...authProviderTokens, AccessTokenGuard, PermissionsGuard]
})
export class AuthModule {}
