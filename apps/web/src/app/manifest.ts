import type { MetadataRoute } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  return {
    name: pick(locale, 'PingoGo — Website Monitoring', 'PingoGo — мониторинг сайтов'),
    short_name: 'PingoGo',
    description: pick(locale, 'Website, SSL, DNS and domain monitoring with instant Telegram alerts.', 'Мониторинг сайтов, SSL, DNS и доменов с мгновенными уведомлениями в Telegram.'),
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f7faf4',
    theme_color: '#008a70',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '256x256',
        type: 'image/png',
      },
    ],
  };
}
