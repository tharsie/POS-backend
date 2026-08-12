import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string(),
  APP_NAME: z.string().min(1),
  APP_URL: z.string().url(),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  PLATFORM_BOOTSTRAP_ENABLED: z.enum(['true', 'false']).default('false'),
  DEV_SUPER_ADMIN_EMAIL: z.string().optional(),
  DEV_SUPER_ADMIN_PASSWORD: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }
  return result.data;
}
