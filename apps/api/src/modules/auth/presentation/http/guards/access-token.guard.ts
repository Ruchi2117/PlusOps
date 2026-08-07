import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { canAuthenticate } from "../../../domain";
import type { AuthUserRepositoryPort, TokenServicePort } from "../../../application/ports";
import { AUTH_TOKEN_SERVICE, AUTH_USER_REPOSITORY } from "../../../auth.tokens";
import type { AuthenticatedUser } from "../authenticated-user";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
    @Inject(AUTH_USER_REPOSITORY)
    private readonly userRepository: AuthUserRepositoryPort
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      const user = await this.userRepository.findById(payload.sub);

      if (!user || !canAuthenticate(user)) {
        throw new UnauthorizedException("Authentication required.");
      }

      request.user = {
        id: user.id,
        email: user.email,
        sessionId: payload.sessionId,
        roles: user.roles,
        permissions: user.permissions
      };

      return true;
    } catch {
      throw new UnauthorizedException("Authentication required.");
    }
  }
}

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}
