import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import type { Environment } from "../../../../config/environment";
import type { AuthUserRepositoryPort, PasswordHasherPort } from "../../application/ports";
import type { AuthUser } from "../../domain";
import { RecruiterDemoAccountBootstrap } from "./recruiter-demo-account.bootstrap";

describe("RecruiterDemoAccountBootstrap", () => {
  it("does nothing when the public demo credential is not configured", async () => {
    const { bootstrap, userRepository } = createBootstrap({});

    await bootstrap.onModuleInit();

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("synchronizes the configured password for an existing Viewer", async () => {
    const { bootstrap, userRepository, passwordHasher } = createBootstrap({
      PLUSOPS_RECRUITER_DEMO_EMAIL: "viewer@plusops.local",
      PLUSOPS_RECRUITER_DEMO_PASSWORD: "PublicViewer123!"
    });
    passwordHasher.verify = vi.fn(async () => false);
    passwordHasher.hash = vi.fn(async () => "new-password-hash");

    await bootstrap.onModuleInit();

    expect(passwordHasher.hash).toHaveBeenCalledWith("PublicViewer123!");
    expect(userRepository.updatePasswordHash).toHaveBeenCalledWith("viewer-user", "new-password-hash");
  });

  it("does not rewrite an already matching password", async () => {
    const { bootstrap, userRepository, passwordHasher } = createBootstrap({
      PLUSOPS_RECRUITER_DEMO_EMAIL: "viewer@plusops.local",
      PLUSOPS_RECRUITER_DEMO_PASSWORD: "PublicViewer123!"
    });

    await bootstrap.onModuleInit();

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.updatePasswordHash).not.toHaveBeenCalled();
  });

  it("refuses to expose an account with broader permissions", async () => {
    const { bootstrap, userRepository } = createBootstrap({
      PLUSOPS_RECRUITER_DEMO_EMAIL: "viewer@plusops.local",
      PLUSOPS_RECRUITER_DEMO_PASSWORD: "PublicViewer123!"
    });
    userRepository.findByEmail = vi.fn(async () => createUser(["viewer", "admin"]));

    await expect(bootstrap.onModuleInit()).rejects.toThrow(
      "Recruiter demo credentials may only be assigned to an account with the Viewer role."
    );
  });
});

function createBootstrap(overrides: Partial<Environment>) {
  const userRepository = {
    findByEmail: vi.fn(async () => createUser(["viewer"])),
    updatePasswordHash: vi.fn(async () => undefined)
  } as unknown as AuthUserRepositoryPort;
  const passwordHasher: PasswordHasherPort = {
    hash: vi.fn(async () => "new-password-hash"),
    verify: vi.fn(async () => true)
  };
  const config = new ConfigService(overrides as Environment) as ConfigService<Environment, true>;
  const bootstrap = new RecruiterDemoAccountBootstrap(userRepository, passwordHasher, config);

  return { bootstrap, passwordHasher, userRepository };
}

function createUser(roles: AuthUser["roles"]): AuthUser {
  return {
    id: "viewer-user",
    email: "viewer@plusops.local",
    name: "Portfolio Viewer",
    passwordHash: "existing-password-hash",
    isActive: true,
    emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    lastLoginAt: null,
    roles,
    permissions: [],
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    deletedAt: null
  };
}
