import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { AUTH_CLOCK } from "../../auth.tokens";
import type { ClockPort, GeneratedOpaqueToken, TokenServicePort } from "../../application/ports";
import type { AccessTokenPayload, SignedAccessToken } from "../../application/ports";
import { addDuration, parseDurationToSeconds } from "./duration";

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async signAccessToken(payload: AccessTokenPayload): Promise<SignedAccessToken> {
    const accessTokenTtl = this.getDurationConfig("JWT_ACCESS_TTL", "15m");
    const token = await this.jwtService.signAsync(payload, {
      secret: this.getRequiredConfig("JWT_ACCESS_SECRET"),
      expiresIn: parseDurationToSeconds(accessTokenTtl)
    });

    return {
      token,
      expiresAt: addDuration(this.clock.now(), accessTokenTtl)
    };
  }

  async createRefreshToken(): Promise<GeneratedOpaqueToken> {
    return this.createOpaqueToken(this.getDurationConfig("JWT_REFRESH_TTL", "7d"));
  }

  async createEmailVerificationToken(): Promise<GeneratedOpaqueToken> {
    return this.createOpaqueToken(this.getDurationConfig("AUTH_EMAIL_VERIFICATION_TTL", "24h"));
  }

  async createPasswordResetToken(): Promise<GeneratedOpaqueToken> {
    return this.createOpaqueToken(this.getDurationConfig("AUTH_PASSWORD_RESET_TTL", "1h"));
  }

  async hashToken(rawToken: string): Promise<string> {
    return createHmac("sha256", this.getRequiredConfig("JWT_REFRESH_SECRET"))
      .update(rawToken)
      .digest("hex");
  }

  async verifyTokenHash(rawToken: string, tokenHash: string): Promise<boolean> {
    const expectedHash = Buffer.from(await this.hashToken(rawToken), "hex");
    const actualHash = Buffer.from(tokenHash, "hex");

    if (expectedHash.length !== actualHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, actualHash);
  }

  private async createOpaqueToken(ttl: string): Promise<GeneratedOpaqueToken> {
    const rawToken = randomBytes(32).toString("base64url");

    return {
      rawToken,
      tokenHash: await this.hashToken(rawToken),
      expiresAt: addDuration(this.clock.now(), ttl)
    };
  }

  private getDurationConfig(key: string, fallback: string): string {
    return this.configService.get<string>(key) ?? fallback;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`Missing required auth configuration: ${key}`);
    }

    return value;
  }
}
