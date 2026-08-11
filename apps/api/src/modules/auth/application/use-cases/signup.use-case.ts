import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { SignupRequest, SignupResponse } from "@plusops/contracts";

import { SYSTEM_ROLES } from "../../authorization/permission-catalog";
import { AUTH_AUDIT_LOG, AUTH_PASSWORD_HASHER, AUTH_USER_REPOSITORY } from "../../auth.tokens";
import type { AuthAuditLogPort, AuthUserRepositoryPort, PasswordHasherPort } from "../ports";
import { toCurrentUser } from "../mappers/current-user.mapper";

@Injectable()
export class SignupUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly userRepository: AuthUserRepositoryPort,
    @Inject(AUTH_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort
  ) {}

  async execute(request: SignupRequest): Promise<SignupResponse> {
    const email = normalizeEmail(request.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Unable to create account with those details.");
    }

    const passwordHash = await this.passwordHasher.hash(request.password);
    const user = await this.userRepository.createPasswordUser({
      email,
      name: request.name.trim(),
      passwordHash,
      roleKeys: [SYSTEM_ROLES.DEVELOPER]
    });

    await this.auditLog.record({
      actorUserId: null,
      action: "auth.signup_completed",
      entityType: "User",
      entityId: user.id,
      metadata: {
        defaultRole: SYSTEM_ROLES.DEVELOPER,
        emailVerified: false
      }
    });

    return {
      user: toCurrentUser(user),
      emailVerificationRequired: true
    };
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
