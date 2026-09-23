import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { getSiteUrl } from '@/lib/site-url';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';
import { LocaleProvider } from '@/components/locale-provider';
import './globals.css';

// Fonts are self-hosted (variable woff2, latin + cyrillic) so the production
// build does not depend on fonts.googleapis.com being reachable from the builder.
const manrope = localFont({
  src: './fonts/manrope-variable.woff2',
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
});

// Handwritten annotations on the landing "sticker board".
const caveat = localFont({
  src: './fonts/caveat-variable.woff2',
  weight: '400 700',
  variable: '--font-hand',
  display: 'swap',
});

const appUrl = getSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = pick(
    locale,
    'Monitor website uptime, SSL certificates, DNS and domain expiry in one place. Get instant Telegram alerts before downtime costs you customers.',
    'Контролируйте доступность сайта, SSL, DNS и срок домена в одном месте. Получайте уведомления в Telegram раньше, чем простой обойдётся вам в клиентов.',
  );
  return {
    metadataBase: new URL(appUrl),
    title: {
      default: pick(locale, 'PingoGo — Website Monitoring with Instant Telegram Alerts', 'PingoGo — мониторинг сайтов с мгновенными уведомлениями в Telegram'),
      template: '%s · PingoGo',
    },
    description,
    applicationName: 'PingoGo',
    authors: [{ name: 'PingoGo', url: appUrl }],
    creator: 'PingoGo',
    publisher: 'PingoGo',
    category: 'technology',
    keywords: locale === 'ru'
      ? ['мониторинг сайтов', 'мониторинг доступности', 'уведомления Telegram', 'проверка SSL', 'срок домена', 'мониторинг DNS']
      : ['website monitoring', 'uptime monitoring', 'Telegram alerts', 'SSL monitoring', 'domain expiration monitor', 'DNS monitoring'],
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icon.png', type: 'image/png', sizes: '256x256' },
      ],
      shortcut: '/icon.svg',
      apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '256x256' }],
    },
    manifest: '/manifest.webmanifest',
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      title: pick(locale, 'PingoGo — Your Website Never Goes Unnoticed', 'PingoGo — ваш сайт никогда не останется без внимания'),
      description,
      url: appUrl,
      siteName: 'PingoGo',
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'PingoGo website monitoring dashboard' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pick(locale, 'PingoGo — Website Monitoring with Telegram Alerts', 'PingoGo — мониторинг сайтов с уведомлениями в Telegram'),
      description,
      images: ['/opengraph-image'],
    },
    alternates: { canonical: appUrl },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const description = pick(
    locale,
    'Website, SSL, DNS and domain monitoring with Telegram alerts.',
    'Мониторинг сайта, SSL, DNS и домена с уведомлениями в Telegram.',
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${appUrl}/#organization`,
        name: 'PingoGo',
        url: appUrl,
        logo: `${appUrl}/logo.png`,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'PingoGo',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: appUrl,
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: locale === 'ru'
          ? ['Мониторинг доступности сайта', 'Уведомления в Telegram', 'Мониторинг SSL', 'Мониторинг DNS', 'Контроль срока домена']
          : ['Website uptime monitoring', 'Telegram alerts', 'SSL monitoring', 'DNS monitoring', 'Domain expiry monitoring'],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          [
            pick(locale, 'Can I start without a credit card?', 'Можно начать без банковской карты?'),
            pick(locale, 'Yes. The Free plan watches two websites and includes Telegram alerts.', 'Да. Бесплатный тариф отслеживает два сайта и включает уведомления в Telegram.'),
          ],
          [
            pick(locale, 'How fast are checks?', 'Как часто выполняются проверки?'),
            pick(locale, 'Every 5 minutes on Free, every minute on paid plans.', 'Каждые 5 минут на бесплатном тарифе и каждую минуту на платных.'),
          ],
        ].map(([name, text]) => ({
          '@type': 'Question',
          name,
          acceptedAnswer: { '@type': 'Answer', text },
        })),
      },
    ],
  };

  return (
    <html lang={locale} className={`${manrope.variable} ${caveat.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
