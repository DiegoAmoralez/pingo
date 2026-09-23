import { getRedis } from '@pingo/shared/redis';

/**
 * Short-lived conversational state ("waiting for a URL"), kept in Redis so it
 * survives worker restarts and works the same in polling and webhook modes.
 */
export type PendingAction = { kind: 'add_url' };

const TTL_SECONDS = 10 * 60;

function key(telegramUserId: string) {
  return `tg:state:${telegramUserId}`;
}

export async function setPending(telegramUserId: string, action: PendingAction): Promise<void> {
  await getRedis().set(key(telegramUserId), JSON.stringify(action), 'EX', TTL_SECONDS);
}

export async function getPending(telegramUserId: string): Promise<PendingAction | null> {
  const raw = await getRedis().get(key(telegramUserId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export async function clearPending(telegramUserId: string): Promise<void> {
  await getRedis().del(key(telegramUserId));
}

/** Locale for chats that are not linked yet (so onboarding can still be in Russian). */
export async function setGuestLocale(telegramUserId: string, locale: string): Promise<void> {
  await getRedis().set(`tg:locale:${telegramUserId}`, locale, 'EX', 60 * 60 * 24 * 30);
}

export async function getGuestLocale(telegramUserId: string): Promise<string | null> {
  return getRedis().get(`tg:locale:${telegramUserId}`);
}
