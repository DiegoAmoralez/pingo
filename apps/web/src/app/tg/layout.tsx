import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { isMaintenanceEnabled } from '@/lib/maintenance';
import { TelegramMaintenanceScreen } from '@/components/tg/maintenance-screen';

export const metadata: Metadata = {
  title: 'PingoGo',
  robots: { index: false, follow: false },
};

// The maintenance flag lives in Redis: never prerender this tree at build time.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

/**
 * Telegram Mini App shell. No site header/footer: Telegram provides the chrome.
 * The SDK script must load before hydration so `window.Telegram.WebApp` exists.
 * While the admin maintenance flag is on, the app is replaced by a compact
 * Telegram-sized maintenance screen (the root layout skips /tg on purpose).
 */
export default async function TelegramLayout({ children }: { children: React.ReactNode }) {
  const maintenance = await isMaintenanceEnabled();
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="beforeInteractive" />
      {maintenance ? <TelegramMaintenanceScreen /> : children}
    </>
  );
}
