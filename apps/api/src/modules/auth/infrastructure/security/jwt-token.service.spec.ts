import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";

import type { ClockPort } from "../../application/ports";
import { JwtTokenService } from "./jwt-token.service";

const accessSecret = "access-secret-with-at-least-24-characters";
const refreshSecret = "refresh-secret-with-at-least-24-characters";

describe("JwtTokenService", () => {
  it("signs short-lived access tokens", async () => {
    const jwtService = new JwtService();
    const tokenService = createTokenService(jwtService);

    const result = await tokenService.signAccessToken({
      sub: "user-1",
      email: "developer@plusops.test",
      sessionId: "session-1",
      roles: ["developer"],
      permissions: ["incidents:read"]
    });

    const decoded = await jwtService.verifyAsync<Record<string, unknown>>(result.token, {
      secret: accessSecret
    });

    expect(decoded.sub).toBe("user-1");
    expect(decoded.sessionId).toBe("session-1");
    expect(result.expiresAt.toISOString()).toBe("2026-08-05T00:15:00.000Z");
  });

  it("creates opaque refresh tokens and stores only stable hashes", async () => {
    const tokenService = createTokenService(new JwtService());

    const result = await tokenService.createRefreshToken();

    expect(result.rawToken).not.toBe(result.tokenHash);
    await expect(tokenService.hashToken(result.rawToken)).resolves.toBe(result.tokenHash);
    await expect(tokenService.verifyTokenHash(result.rawToken, result.tokenHash)).resolves.toBe(true);
    await expect(tokenService.verifyTokenHash("wrong-token", result.tokenHash)).resolves.toBe(false);
    expect(result.expiresAt.toISOString()).toBe("2026-08-12T00:00:00.000Z");
  });

  it("creates purpose-specific one-time tokens with configured expirations", async () => {
    const tokenService = createTokenService(new JwtService());

    const emailVerificationToken = await tokenService.createEmailVerificationToken();
    const passwordResetToken = await tokenService.createPasswordResetToken();

    expect(emailVerificationToken.expiresAt.toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(passwordResetToken.expiresAt.toISOString()).toBe("2026-08-05T01:00:00.000Z");
  });
});

function createTokenService(jwtService: JwtService): JwtTokenService {
  return new JwtTokenService(
    jwtService,
    new ConfigService({
      JWT_ACCESS_SECRET: accessSecret,
      JWT_REFRESH_SECRET: refreshSecret,
      JWT_ACCESS_TTL: "15m",
      JWT_REFRESH_TTL: "7d",
      AUTH_EMAIL_VERIFICATION_TTL: "24h",
      AUTH_PASSWORD_RESET_TTL: "1h"
    }),
    new FixedClock(new Date("2026-08-05T00:00:00.000Z"))
  );
}

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}
