import { z } from "zod";

export const userRoleSchema = z.enum([
  "admin",
  "engineering_manager",
  "developer",
  "qa_engineer",
  "viewer"
]);

export const authProviderSchema = z.enum(["password", "google", "github"]);

export const permissionKeySchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export const signupRequestSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(2).max(120),
  password: passwordSchema
});

export const loginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128)
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email().max(254)
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(32).max(512),
  password: passwordSchema
});

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(32).max(512)
});

export const updateProfileRequestSchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const currentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  roles: z.array(userRoleSchema),
  permissions: z.array(permissionKeySchema)
});

export const authSessionSchema = z.object({
  id: z.string().uuid(),
  current: z.boolean(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastSeenAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: currentUserSchema,
  accessTokenExpiresAt: z.string().datetime()
});

export const loginResponseSchema = authResponseSchema;

export const refreshResponseSchema = authResponseSchema;

export const signupResponseSchema = z.object({
  user: currentUserSchema,
  emailVerificationRequired: z.boolean()
});

export const profileResponseSchema = z.object({
  user: currentUserSchema
});

export const sessionsResponseSchema = z.object({
  data: z.array(authSessionSchema)
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AuthProvider = z.infer<typeof authProviderSchema>;
export type PermissionKey = z.infer<typeof permissionKeySchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type SignupResponse = z.infer<typeof signupResponseSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type SessionsResponse = z.infer<typeof sessionsResponseSchema>;
