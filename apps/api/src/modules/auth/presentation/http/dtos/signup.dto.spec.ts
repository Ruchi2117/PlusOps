import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { SignupDto } from "./signup.dto";

describe("SignupDto", () => {
  it("accepts a valid signup payload", async () => {
    const dto = plainToInstance(SignupDto, {
      email: "developer@plusops.dev",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects invalid emails", async () => {
    const dto = plainToInstance(SignupDto, {
      email: "not-an-email",
      name: "PlusOps Developer",
      password: "StrongerPass123"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("email");
  });

  it("rejects weak passwords", async () => {
    const dto = plainToInstance(SignupDto, {
      email: "developer@plusops.dev",
      name: "PlusOps Developer",
      password: "weak"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("password");
  });

  it("rejects invalid names", async () => {
    const dto = plainToInstance(SignupDto, {
      email: "developer@plusops.dev",
      name: "A",
      password: "StrongerPass123"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("name");
  });
});
