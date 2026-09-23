import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'PingoGo',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

/**
 * Telegram Mini App shell. No site header/footer: Telegram provides the chrome.
 * The SDK script must load before hydration so `window.Telegram.WebApp` exists.
 */
export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="beforeInteractive" />
      {children}
    </>
  );
}
