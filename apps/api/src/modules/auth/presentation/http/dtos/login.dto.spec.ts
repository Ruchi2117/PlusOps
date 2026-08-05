import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  it("accepts a valid login payload", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "developer@plusops.dev",
      password: "StrongerPass123"
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects invalid emails", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "not-an-email",
      password: "StrongerPass123"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("email");
  });

  it("rejects missing passwords", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "developer@plusops.dev",
      password: ""
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("password");
  });
});
