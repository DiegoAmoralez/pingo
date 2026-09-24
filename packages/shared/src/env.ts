import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_SECRET: z.string().min(16),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_BOT_USERNAME: z.string().optional().default('PingoMonitorBot'),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PRICE_PERSONAL: z.string().optional().default(''),
  STRIPE_PRICE_PRO: z.string().optional().default(''),
  STRIPE_PRICE_AGENCY: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('PINGO <noreply@localhost>'),
  SENTRY_DSN: z.string().optional().default(''),
  POSTHOG_API_KEY: z.string().optional().default(''),
  POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  ADMIN_EMAIL: z.string().optional().default(''),
  ADMIN_PANEL_LOGIN: z.string().optional().default(''),
  ADMIN_PANEL_PASSWORD: z.string().optional().default(''),
  REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).optional(),
  MOCK_MONITORING: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}

export function isMockMonitoring(): boolean {
  return process.env.MOCK_MONITORING === 'true' || process.env.MOCK_MONITORING === '1';
}
