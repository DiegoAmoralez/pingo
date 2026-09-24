import { getRedis } from '@pingo/shared/redis';
import { logger } from '@pingo/shared';

/**
 * Site-wide maintenance mode.
 *
 * The flag lives in Redis so every web replica sees the same value and the
 * admin toggle takes effect immediately. When Redis is unreachable we fail
 * open (site stays available) so an infra hiccup never locks users out.
 */
const KEY = 'pingo:maintenance';
/** The shared Redis client retries forever; cap the wait so pages never hang on a Redis outage. */
const READ_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`maintenance flag read timed out after ${ms}ms`)), ms);
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

export type MaintenanceState = {
  enabled: boolean;
  /** ISO timestamp of the last change, if known. */
  updatedAt: string | null;
  /** Admin login that made the last change. */
  updatedBy: string | null;
};

export async function getMaintenanceState(): Promise<MaintenanceState> {
  try {
    const raw = await withTimeout(getRedis().get(KEY), READ_TIMEOUT_MS);
    if (!raw) return { enabled: false, updatedAt: null, updatedBy: null };
    const parsed = JSON.parse(raw) as Partial<MaintenanceState>;
    return {
      enabled: parsed.enabled === true,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : null,
    };
  } catch (error) {
    logger.warn({ err: error }, 'maintenance flag unavailable; assuming disabled');
    return { enabled: false, updatedAt: null, updatedBy: null };
  }
}

export async function isMaintenanceEnabled(): Promise<boolean> {
  return (await getMaintenanceState()).enabled;
}

export async function setMaintenanceEnabled(enabled: boolean, updatedBy: string): Promise<MaintenanceState> {
  const state: MaintenanceState = { enabled, updatedAt: new Date().toISOString(), updatedBy };
  await getRedis().set(KEY, JSON.stringify(state));
  logger.info({ enabled, updatedBy }, 'maintenance mode changed');
  return state;
}

/** Telegram Mini App routes: they render their own compact maintenance screen. */
export function isTelegramMiniAppPath(pathname: string): boolean {
  return pathname === '/tg' || pathname.startsWith('/tg/');
}

/**
 * Paths the root layout must not replace with the site-wide maintenance
 * screen: the admin panel (so the flag can be switched off again), machine
 * endpoints, and the Mini App (its own layout shows a Telegram-sized screen).
 */
export function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    isTelegramMiniAppPath(pathname) ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/admin')
  );
}
