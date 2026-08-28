import { z } from "zod";

const booleanEnvironmentSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean());

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().optional(),
  AUTH_EMAIL_VERIFICATION_TTL: z.string().default("24h"),
  AUTH_PASSWORD_RESET_TTL: z.string().default("1h"),
  AUTH_REFRESH_COOKIE_NAME: z.string().default("plusops_refresh_token"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_REQUIRE_EMAIL_VERIFICATION: booleanEnvironmentSchema.default(false),
  AI_PROVIDER: z.enum(["openai", "groq"]).default("openai"),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(20_000),
  AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().max(1_000).default(20),
  AI_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().max(3_600).default(60),
  HEALTH_CHECK_ALLOWED_HOSTS: z.string().default("localhost,127.0.0.1"),
  JWT_ACCESS_SECRET: z.string().min(24).optional(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(24).optional(),
  JWT_REFRESH_TTL: z.string().default("7d"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PLUSOPS_RECRUITER_DEMO_EMAIL: z.string().min(3).optional(),
  PLUSOPS_RECRUITER_DEMO_PASSWORD: z.string().min(12).optional(),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(1_000),
  REDIS_URL: z.string().url().optional()
}).superRefine((environment, context) => {
  if (environment.AI_API_KEY && !environment.AI_MODEL) {
    context.addIssue({
      code: "custom",
      path: ["AI_MODEL"],
      message: "AI_MODEL is required when AI_API_KEY is configured."
    });
  }

  if (Boolean(environment.PLUSOPS_RECRUITER_DEMO_EMAIL) !== Boolean(environment.PLUSOPS_RECRUITER_DEMO_PASSWORD)) {
    context.addIssue({
      code: "custom",
      path: ["PLUSOPS_RECRUITER_DEMO_EMAIL"],
      message: "Recruiter demo email and password must be configured together."
    });
  }
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return parsed.data;
}
