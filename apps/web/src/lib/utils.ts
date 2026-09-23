import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from '@/lib/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(date: Date | string | null | undefined, timeZone = 'UTC', locale: Locale = 'en'): string {
  if (!date) return locale === 'ru' ? 'Никогда' : 'Never';
  const value = typeof date === 'string' ? new Date(date) : date;
  const delta = Date.now() - value.getTime();
  const seconds = Math.round(delta / 1000);
  if (seconds < 10) return locale === 'ru' ? 'только что' : 'just now';
  if (seconds < 60) return locale === 'ru' ? `${seconds} сек. назад` : `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return locale === 'ru' ? `${minutes} мин. назад` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return locale === 'ru' ? `${hours} ч. назад` : `${hours} hr ago`;
  return value.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', { timeZone });
}

export function daysLabel(days: number | null | undefined, locale: Locale = 'en'): string {
  if (days == null) return locale === 'ru' ? 'Недоступно' : 'Unavailable';
  if (days < 0) return locale === 'ru' ? 'Истёк' : 'Expired';
  if (locale === 'ru') return `${days} дн.`;
  return `${days} day${days === 1 ? '' : 's'}`;
}
