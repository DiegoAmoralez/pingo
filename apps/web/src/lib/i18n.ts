export type Locale = 'en' | 'ru';

export const defaultLocale: Locale = 'en';

/** Cookie that stores the visitor's chosen interface language. */
export const LOCALE_COOKIE = 'pingogo_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ru';
}

export function pick(locale: Locale, en: string, ru: string) {
  return locale === 'ru' ? ru : en;
}

export function pluralRu(value: number, one: string, few: string, many: string) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
