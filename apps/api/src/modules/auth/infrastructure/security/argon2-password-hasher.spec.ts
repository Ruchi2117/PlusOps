import { describe, expect, it } from "vitest";

import { Argon2PasswordHasher } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
  it("hashes passwords with Argon2id and verifies matching passwords", async () => {
    const hasher = new Argon2PasswordHasher();

    const hash = await hasher.hash("CorrectHorseBatteryStaple123");

    expect(hash).toContain("argon2id");
    await expect(hasher.verify(hash, "CorrectHorseBatteryStaple123")).resolves.toBe(true);
  });

  it("rejects non-matching passwords without throwing", async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash("CorrectHorseBatteryStaple123");

    await expect(hasher.verify(hash, "WrongHorseBatteryStaple123")).resolves.toBe(false);
    await expect(hasher.verify("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
