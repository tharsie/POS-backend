export const appConfig = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: Number(process.env.PORT),
    name: process.env.APP_NAME,
    url: process.env.APP_URL,
    frontendUrl: process.env.FRONTEND_URL,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
  },
  platform: {
    bootstrapEnabled: (process.env.PLATFORM_BOOTSTRAP_ENABLED ?? 'false') === 'true',
  },
});
