import type { BotLocale } from './i18n.js';

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function bold(value: string): string {
  return `<b>${escapeHtml(value)}</b>`;
}

export function code(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

export function formatDateTime(date: Date, locale: BotLocale, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function formatDate(date: Date, locale: BotLocale, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(date);
}

export function formatRelative(date: Date, locale: BotLocale, now = Date.now()): string {
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale === 'ru' ? 'ru' : 'en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  return rtf.format(Math.round(diffSeconds / 86400), 'day');
}

export function formatDurationMs(ms: number, locale: BotLocale): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = locale === 'ru' ? 'ч' : 'h';
  const m = locale === 'ru' ? 'мин' : 'min';
  if (hours === 0) return `${minutes} ${m}`;
  if (minutes === 0) return `${hours} ${h}`;
  return `${hours} ${h} ${minutes} ${m}`;
}

export function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}%`;
}

export function daysUntil(date: Date | null | undefined, now = Date.now()): number | null {
  if (!date) return null;
  return Math.floor((date.getTime() - now) / 86400000);
}

/** Rough URL detection so a bare message like "example.com" can be treated as "add site". */
export function looksLikeUrl(text: string): boolean {
  const value = text.trim();
  if (!value || value.includes(' ') || value.startsWith('/')) return false;
  if (/^https?:\/\/\S+$/i.test(value)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value);
}
