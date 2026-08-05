import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

import type { PasswordHasherPort } from "../../application/ports";

@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  async hash(plainTextPassword: string): Promise<string> {
    return argon2.hash(plainTextPassword, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1
    });
  }

  async verify(passwordHash: string, plainTextPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainTextPassword);
    } catch {
      return false;
    }
  }
}
