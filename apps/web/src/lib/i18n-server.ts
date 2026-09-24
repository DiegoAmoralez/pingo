import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/lib/i18n';

/**
 * Current UI language on the server.
 * Saved preference (cookie) → language detected by the middleware from
 * geo / Accept-Language (`x-locale`) → English.
 */
export async function getLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const saved = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const detected = requestHeaders.get('x-locale');
  return isLocale(detected) ? detected : defaultLocale;
}
