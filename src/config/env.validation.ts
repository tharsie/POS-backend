import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16).default('pos_access_secret_key_32_bytes_long_random_123'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_SECRET: z.string().min(16).default('pos_refresh_secret_key_32_bytes_long_random_456'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ALLOWED_ORIGINS: z.string().default('*'),
  APP_NAME: z.string().default('SaaS POS'),
  APP_URL: z.string().default('http://localhost:3000'),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  PLATFORM_BOOTSTRAP_ENABLED: z.enum(['true', 'false']).default('false'),
  DEV_SUPER_ADMIN_EMAIL: z.string().optional(),
  DEV_SUPER_ADMIN_PASSWORD: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = schema.safeParse(config);
  if (!result.success) {
    console.error('Invalid environment configuration details:', JSON.stringify(result.error.format(), null, 2));
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }
  return result.data;
}
