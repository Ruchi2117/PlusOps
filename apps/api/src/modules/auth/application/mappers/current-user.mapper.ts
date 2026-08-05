import type { CurrentUser } from "@plusops/contracts";

import type { AuthUser } from "../../domain";

export function toCurrentUser(user: AuthUser): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerifiedAt !== null,
    roles: user.roles,
    permissions: user.permissions
  };
}
