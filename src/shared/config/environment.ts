import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  ELASTICSEARCH_URL: z.string().min(1).optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().min(1).default("no-reply@tickets-handler.local"),
  APP_PUBLIC_URL: z.string().min(1).default("http://localhost:3000"),
  INVITATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
});

const parsed = schema.parse(process.env);

export const environment = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  logLevel: parsed.LOG_LEVEL,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  elasticsearchUrl: parsed.ELASTICSEARCH_URL,
  rateLimitMax: parsed.RATE_LIMIT_MAX,
  rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  refreshTokenTtlDays: parsed.REFRESH_TOKEN_TTL_DAYS,
  smtpHost: parsed.SMTP_HOST,
  smtpPort: parsed.SMTP_PORT,
  smtpFrom: parsed.SMTP_FROM,
  appPublicUrl: parsed.APP_PUBLIC_URL,
  invitationTtlHours: parsed.INVITATION_TTL_HOURS,
} as const;

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida`);
  }
  return value;
};

export const requireDatabaseUrl = (): string => required(environment.databaseUrl, "de base de datos");

export const requireRedisUrl = (): string => required(environment.redisUrl, "REDIS_URL");

export const requireElasticsearchUrl = (): string => required(environment.elasticsearchUrl, "ELASTICSEARCH_URL");

export const requireJwtSecret = (): string => required(environment.jwtSecret, "JWT_SECRET");
