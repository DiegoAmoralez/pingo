import { logger } from '@pingo/shared';
import { getRedis } from '@pingo/shared/redis';
import { configuredStripeModes, defaultStripeMode, isStripeMode, type StripeMode } from './config.js';

/**
 * Which Stripe world the product is currently selling in.
 *
 * Stored in Redis so web replicas, the worker and the Telegram bot agree, and
 * the admin toggle applies instantly. If Redis is unreachable we fall back to
 * the default mode rather than failing checkout.
 */
const KEY = 'pingo:stripe:mode';
/** The shared Redis client retries forever; never let a Redis outage hang a request. */
const READ_TIMEOUT_MS = 1500;

export type StripeModeState = {
  /** Active mode, or null when no key set is configured at all. */
  mode: StripeMode | null;
  /** Modes that have a secret key configured. */
  configured: StripeMode[];
  /** Where the active mode came from. */
  source: 'admin' | 'default';
  updatedAt: string | null;
  updatedBy: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`stripe mode read timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function getStripeModeState(): Promise<StripeModeState> {
  const configured = configuredStripeModes();
  const fallback: StripeModeState = {
    mode: defaultStripeMode(),
    configured,
    source: 'default',
    updatedAt: null,
    updatedBy: null,
  };
  if (configured.length === 0) return { ...fallback, mode: null };

  try {
    const raw = await withTimeout(getRedis().get(KEY), READ_TIMEOUT_MS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { mode?: unknown; updatedAt?: unknown; updatedBy?: unknown };
    // A saved mode whose keys were removed since must not be used.
    if (!isStripeMode(parsed.mode) || !configured.includes(parsed.mode)) return fallback;
    return {
      mode: parsed.mode,
      configured,
      source: 'admin',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : null,
    };
  } catch (error) {
    logger.warn({ err: error }, 'stripe mode unavailable; using default');
    return fallback;
  }
}

export async function getStripeMode(): Promise<StripeMode | null> {
  return (await getStripeModeState()).mode;
}

export async function setStripeMode(mode: StripeMode, updatedBy: string): Promise<StripeModeState> {
  const configured = configuredStripeModes();
  if (!configured.includes(mode)) {
    throw new Error(`Stripe ${mode} mode has no secret key configured`);
  }
  const updatedAt = new Date().toISOString();
  await getRedis().set(KEY, JSON.stringify({ mode, updatedAt, updatedBy }));
  logger.info({ mode, updatedBy }, 'stripe mode changed');
  return { mode, configured, source: 'admin', updatedAt, updatedBy };
}

/**
 * A subscription row belongs to the world it was created in. Rows without a
 * mode (manual grants, legacy data) apply everywhere.
 */
export function subscriptionAppliesToMode(
  subscription: { providerMode: string | null } | null | undefined,
  mode: StripeMode | null,
): boolean {
  if (!subscription) return false;
  if (!subscription.providerMode || !mode) return true;
  return subscription.providerMode === mode;
}
