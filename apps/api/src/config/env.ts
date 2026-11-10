import path from 'node:path';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must be a mongodb:// URI'),
  PUBLIC_ORIGIN: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  ANALYTICS_SECRET: z.string().min(32, 'ANALYTICS_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().min(1).max(24 * 14).default(12),
  SESSION_IDLE_MINUTES: z.coerce.number().min(5).max(24 * 60).default(120),
  COOKIE_SECURE: bool,
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().min(1).max(25).default(8),
  FEEDBACK_RETENTION_DAYS: z.coerce.number().int().min(7).max(3650).default(365),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(730),
  ANALYTICS_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(730),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  SERVE_WEB: bool,
  WEB_DIST_DIR: z.string().default('../web/dist'),
  RATE_LIMIT_DISABLED: bool,
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (!env.COOKIE_SECURE) throw new Error('COOKIE_SECURE must be true in production (serve over HTTPS).');
    if (/change-me/i.test(env.ANALYTICS_SECRET)) throw new Error('Set a real ANALYTICS_SECRET in production.');
    if (env.RATE_LIMIT_DISABLED) throw new Error('RATE_LIMIT_DISABLED is not allowed in production.');
  }
  return {
    ...env,
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
    uploadDir: path.resolve(process.cwd(), env.UPLOAD_DIR),
    webDistDir: path.resolve(process.cwd(), env.WEB_DIST_DIR),
    maxUploadBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
  };
}
