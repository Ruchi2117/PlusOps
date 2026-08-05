export type AuthAuditAction =
  | "auth.signup_requested"
  | "auth.signup_completed"
  | "auth.login_succeeded"
  | "auth.login_failed"
  | "auth.refresh_failed"
  | "auth.logout_succeeded"
  | "auth.refresh_rotated"
  | "auth.refresh_reuse_detected"
  | "auth.email_verified"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.password_changed"
  | "auth.role_assigned";

export type RecordAuthAuditEventInput = {
  actorUserId: string | null;
  action: AuthAuditAction;
  entityType: "User" | "AuthSession" | "RefreshToken" | "Role";
  entityId: string;
  metadata?: Record<string, unknown>;
};

export interface AuthAuditLogPort {
  record(input: RecordAuthAuditEventInput): Promise<void>;
}
