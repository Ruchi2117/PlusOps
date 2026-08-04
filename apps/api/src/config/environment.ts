import { z } from "zod";

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(24).optional(),
  JWT_REFRESH_SECRET: z.string().min(24).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().url().optional()
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return parsed.data;
}

