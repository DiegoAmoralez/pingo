import pino from 'pino';

const REDACT_PATHS = [
  'password',
  'passwordHash',
  'token',
  'secret',
  'authorization',
  'cookie',
  'req.headers.authorization',
  'headers.authorization',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'APP_SECRET',
  'RESEND_API_KEY',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: REDACT_PATHS,
    censor: '[redacted]',
  },
  base: {
    service: process.env.PINGO_SERVICE ?? 'pingo',
  },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
