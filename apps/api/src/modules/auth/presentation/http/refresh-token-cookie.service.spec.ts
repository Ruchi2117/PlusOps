import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";

import type { ClockPort } from "../../application/ports";
import { RefreshTokenCookieService } from "./refresh-token-cookie.service";

describe("RefreshTokenCookieService", () => {
  it("sets a protected refresh token cookie in production", () => {
    const response = createResponse();
    const service = createService({
      NODE_ENV: "production",
      AUTH_REFRESH_COOKIE_NAME: "plusops_refresh",
      AUTH_COOKIE_DOMAIN: ".plusops.dev"
    });

    service.setRefreshTokenCookie(response, "raw-refresh-token", expiresAt());

    expect(response.cookie).toHaveBeenCalledWith("plusops_refresh", "raw-refresh-token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/api/v1/auth",
      maxAge: 604_800_000,
      expires: expiresAt(),
      domain: ".plusops.dev"
    });
  });

  it("keeps local development cookies usable over http localhost", () => {
    const response = createResponse();
    const service = createService({ NODE_ENV: "development" });

    service.setRefreshTokenCookie(response, "raw-refresh-token", expiresAt());

    expect(response.cookie).toHaveBeenCalledWith(
      "plusops_refresh_token",
      "raw-refresh-token",
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      })
    );
  });

  it("extracts the configured refresh token cookie from a cookie header", () => {
    const service = createService({
      AUTH_REFRESH_COOKIE_NAME: "plusops_refresh"
    });

    expect(
      service.getRefreshTokenFromCookieHeader("theme=dark; plusops_refresh=raw-refresh-token")
    ).toBe("raw-refresh-token");
  });

  it("returns null when the refresh cookie is missing", () => {
    const service = createService({
      AUTH_REFRESH_COOKIE_NAME: "plusops_refresh"
    });

    expect(service.getRefreshTokenFromCookieHeader("theme=dark")).toBeNull();
    expect(service.getRefreshTokenFromCookieHeader(undefined)).toBeNull();
  });

  it("clears the refresh token cookie with matching production attributes", () => {
    const response = createResponse();
    const service = createService({
      NODE_ENV: "production",
      AUTH_REFRESH_COOKIE_NAME: "plusops_refresh",
      AUTH_COOKIE_DOMAIN: ".plusops.dev"
    });

    service.clearRefreshTokenCookie(response);

    expect(response.clearCookie).toHaveBeenCalledWith("plusops_refresh", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/api/v1/auth",
      domain: ".plusops.dev"
    });
  });
});

function createService(config: Record<string, unknown>): RefreshTokenCookieService {
  return new RefreshTokenCookieService(
    new ConfigService({
      AUTH_REFRESH_COOKIE_NAME: "plusops_refresh_token",
      ...config
    }),
    new FixedClock(new Date("2026-08-05T00:00:00.000Z"))
  );
}

function createResponse(): Response {
  return {
    clearCookie: vi.fn(),
    cookie: vi.fn()
  } as unknown as Response;
}

function expiresAt(): Date {
  return new Date("2026-08-12T00:00:00.000Z");
}

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}
