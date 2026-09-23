import { cookies } from 'next/headers';
import { defaultLocale, isLocale } from '@/lib/i18n';

export async function getLocale() {
  const value = (await cookies()).get('pingogo_locale')?.value;
  return isLocale(value) ? value : defaultLocale;
}
