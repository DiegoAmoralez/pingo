export const APP_NAME = 'PINGO';

export const DEFAULT_TIMEOUT_SECONDS = 10;
export const DEFAULT_FOLLOW_REDIRECTS = true;
export const DEFAULT_EXPECTED_STATUS = '200-399';
export const DEFAULT_CHECK_INTERVAL_SECONDS = 300;
export const MAX_REDIRECTS = 3;
export const MAX_RESPONSE_BYTES = 64 * 1024;
export const MAX_HEADER_BYTES = 32 * 1024;
export const MANUAL_CHECK_COOLDOWN_SECONDS = 15;
export const CONSECUTIVE_FAILURES_FOR_DOWN = 2;
export const DNS_CHECK_INTERVAL_SECONDS = 30 * 60;
export const SSL_CHECK_INTERVAL_SECONDS = 24 * 60 * 60;
export const DOMAIN_CHECK_INTERVAL_SECONDS = 24 * 60 * 60;
export const DISPATCH_INTERVAL_MS = 15_000;
export const WORKER_HEARTBEAT_ID = 'primary';
export const TELEGRAM_TOKEN_TTL_MINUTES = 15;
export const MAX_URL_LENGTH = 2048;

export const SSL_ALERT_THRESHOLDS = [30, 14, 7, 3, 1, 0] as const;
export const DOMAIN_ALERT_THRESHOLDS = [90, 60, 30, 14, 7, 3, 1] as const;

export const ERROR_CATEGORY_LABELS = {
  DNS_ERROR: 'DNS error',
  CONNECTION_REFUSED: 'Connection refused',
  CONNECTION_TIMEOUT: 'Connection timeout',
  TLS_ERROR: 'TLS error',
  HTTP_ERROR: 'HTTP error',
  REDIRECT_ERROR: 'Redirect error',
  SSRF_BLOCKED: 'URL not allowed',
  UNKNOWN: 'Unknown error',
} as const;

export type ErrorCategory = keyof typeof ERROR_CATEGORY_LABELS;

export const QUEUE_JOB_ATTEMPTS = 3;
export const QUEUE_BACKOFF_MS = 2000;
