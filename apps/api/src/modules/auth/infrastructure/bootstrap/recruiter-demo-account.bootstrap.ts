import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Environment } from "../../../../config/environment";
import type { AuthUserRepositoryPort, PasswordHasherPort } from "../../application/ports";
import { AUTH_PASSWORD_HASHER, AUTH_USER_REPOSITORY } from "../../auth.tokens";

@Injectable()
export class RecruiterDemoAccountBootstrap implements OnModuleInit {
  private readonly logger = new Logger(RecruiterDemoAccountBootstrap.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly userRepository: AuthUserRepositoryPort,
    @Inject(AUTH_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get("PLUSOPS_RECRUITER_DEMO_EMAIL", { infer: true });
    const password = this.config.get("PLUSOPS_RECRUITER_DEMO_PASSWORD", { infer: true });

    if (!email || !password) {
      return;
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      this.logger.warn("Recruiter demo account was not found; public demo login remains unavailable.");
      return;
    }

    if (user.roles.length !== 1 || user.roles[0] !== "viewer") {
      throw new Error("Recruiter demo credentials may only be assigned to an account with the Viewer role.");
    }

    if (!user.isActive || user.deletedAt) {
      throw new Error("Recruiter demo credentials may only be assigned to an active account.");
    }

    if (user.passwordHash && (await this.passwordHasher.verify(user.passwordHash, password))) {
      return;
    }

    const passwordHash = await this.passwordHasher.hash(password);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);
    this.logger.log("Public read-only recruiter demo credential synchronized.");
  }
}
