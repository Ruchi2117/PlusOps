import { describe, expect, it } from "vitest";

import { validateEnvironment } from "./environment";

describe("validateEnvironment", () => {
  it("parses AUTH_REQUIRE_EMAIL_VERIFICATION=true as true", () => {
    const environment = validateEnvironment({
      AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
    });

    expect(environment.AUTH_REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it("parses AUTH_REQUIRE_EMAIL_VERIFICATION=false as false", () => {
    const environment = validateEnvironment({
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
    });

    expect(environment.AUTH_REQUIRE_EMAIL_VERIFICATION).toBe(false);
  });

  it("defaults AUTH_REQUIRE_EMAIL_VERIFICATION to false when missing", () => {
    const environment = validateEnvironment({});

    expect(environment.AUTH_REQUIRE_EMAIL_VERIFICATION).toBe(false);
  });

  it("rejects invalid AUTH_REQUIRE_EMAIL_VERIFICATION values", () => {
    expect(() =>
      validateEnvironment({
        AUTH_REQUIRE_EMAIL_VERIFICATION: "yes"
      })
    ).toThrow("Invalid environment");
  });

  it("parses Redis and AI rate-limit configuration", () => {
    const environment = validateEnvironment({
      REDIS_URL: "redis://localhost:6379/1",
      REDIS_CONNECT_TIMEOUT_MS: "1500",
      AI_RATE_LIMIT_MAX_REQUESTS: "5",
      AI_RATE_LIMIT_WINDOW_SECONDS: "30"
    });

    expect(environment.REDIS_URL).toBe("redis://localhost:6379/1");
    expect(environment.REDIS_CONNECT_TIMEOUT_MS).toBe(1500);
    expect(environment.AI_RATE_LIMIT_MAX_REQUESTS).toBe(5);
    expect(environment.AI_RATE_LIMIT_WINDOW_SECONDS).toBe(30);
  });

  it("rejects invalid Redis and rate-limit configuration", () => {
    expect(() =>
      validateEnvironment({
        REDIS_URL: "not-a-url",
        AI_RATE_LIMIT_MAX_REQUESTS: "0"
      })
    ).toThrow("Invalid environment");
  });
});
