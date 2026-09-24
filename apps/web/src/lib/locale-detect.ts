import { defaultLocale, type Locale } from './i18n';

/**
 * Picks the initial UI language for visitors without a saved preference.
 *
 * 1. Country from the CDN/edge (when the platform provides one): Russian for
 *    Russian-speaking countries, English for everyone else.
 * 2. Otherwise the browser's Accept-Language: whichever of ru/en the user ranks
 *    higher wins.
 * 3. No usable signal → English.
 */
const RUSSIAN_SPEAKING_COUNTRIES = new Set(['RU', 'BY', 'KZ', 'KG', 'TJ', 'UZ', 'MD', 'AM']);

/** Country header names set by common edges/CDNs (first match wins). */
export const COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-geo-country',
] as const;

export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  if (code.length !== 2 || code === 'XX' || code === 'T1') return null;
  return RUSSIAN_SPEAKING_COUNTRIES.has(code) ? 'ru' : 'en';
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  let best: { locale: Locale; q: number } | null = null;

  for (const part of header.split(',')) {
    const [rawTag, ...params] = part.trim().split(';');
    const language = rawTag?.trim().toLowerCase().split('-')[0];
    const locale: Locale | null = language === 'ru' ? 'ru' : language === 'en' ? 'en' : null;
    if (!locale) continue;

    const qParam = params.find((p) => p.trim().startsWith('q='));
    const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
    if (Number.isNaN(q) || q <= 0) continue;

    // Higher quality wins; on a tie the earlier entry wins (strict > keeps it).
    if (!best || q > best.q) best = { locale, q };
  }

  return best?.locale ?? null;
}

export function detectLocale(input: {
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  return localeFromCountry(input.country) ?? localeFromAcceptLanguage(input.acceptLanguage) ?? defaultLocale;
}
