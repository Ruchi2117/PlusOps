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
});
