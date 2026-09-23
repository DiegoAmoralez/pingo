/**
 * Thin typed access to the Telegram Web App SDK (telegram-web-app.js), loaded in
 * the /tg layout. Every helper is a no-op outside Telegram so the page can still
 * render a friendly fallback in a normal browser.
 */

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { start_param?: string; user?: { language_code?: string } };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  platform: string;
  version: string;
  ready(): void;
  expand(): void;
  close(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
  showConfirm?(message: string, callback: (ok: boolean) => void): void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const app = window.Telegram?.WebApp;
  // The script always defines WebApp; only a real client fills initData.
  return app && app.initData ? app : null;
}

export function haptic(type: 'success' | 'error' | 'warning' | 'tap') {
  const app = getWebApp();
  if (!app?.HapticFeedback) return;
  if (type === 'tap') {
    app.HapticFeedback.impactOccurred('light');
    return;
  }
  app.HapticFeedback.notificationOccurred(type);
}

export function openExternal(url: string) {
  const app = getWebApp();
  if (app) {
    app.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export function confirmDialog(message: string): Promise<boolean> {
  const app = getWebApp();
  if (app?.showConfirm) {
    return new Promise((resolve) => app.showConfirm!(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}
