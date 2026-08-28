import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Request, Response } from "express";

import { AUTH_CLOCK } from "../../auth.tokens";
import type { ClockPort } from "../../application/ports";

@Injectable()
export class RefreshTokenCookieService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  setRefreshTokenCookie(response: Response, refreshToken: string, expiresAt: Date): void {
    response.cookie(this.getCookieName(), refreshToken, this.buildCookieOptions(expiresAt));
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.getCookieName(), this.buildClearCookieOptions());
  }

  getRefreshTokenFromRequest(request: Request): string | null {
    return this.getRefreshTokenFromCookieHeader(request.headers.cookie);
  }

  getRefreshTokenFromCookieHeader(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookieName = this.getCookieName();

    for (const cookiePair of cookieHeader.split(";")) {
      const [rawName, ...rawValueParts] = cookiePair.split("=");
      const name = rawName?.trim();

      if (name !== cookieName) {
        continue;
      }

      const rawValue = rawValueParts.join("=").trim();

      if (!rawValue) {
        return null;
      }

      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }

    return null;
  }

  private buildCookieOptions(expiresAt: Date): CookieOptions {
    const maxAge = Math.max(0, expiresAt.getTime() - this.clock.now().getTime());
    const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN");
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/api/v1/auth",
      maxAge,
      expires: expiresAt
    };

    if (domain) {
      options.domain = domain;
    }

    return options;
  }

  private buildClearCookieOptions(): CookieOptions {
    const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN");
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/api/v1/auth"
    };

    if (domain) {
      options.domain = domain;
    }

    return options;
  }

  private getCookieName(): string {
    return this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME") ?? "plusops_refresh_token";
  }
}
