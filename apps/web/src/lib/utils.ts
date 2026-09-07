import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(date: Date | string | null | undefined, timeZone = 'UTC'): string {
  if (!date) return 'Never';
  const value = typeof date === 'string' ? new Date(date) : date;
  const delta = Date.now() - value.getTime();
  const seconds = Math.round(delta / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return value.toLocaleString(undefined, { timeZone });
}

export function daysLabel(days: number | null | undefined): string {
  if (days == null) return 'Unavailable';
  if (days < 0) return 'Expired';
  return `${days} day${days === 1 ? '' : 's'}`;
}
