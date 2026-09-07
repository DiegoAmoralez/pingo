import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'PINGO — Know when your website breaks',
    template: '%s · PINGO',
  },
  description:
    'PINGO monitors your website, SSL, DNS and domain and tells you in Telegram when something goes wrong.',
  openGraph: {
    title: 'PINGO — Know when your website breaks',
    description:
      'Website, SSL, DNS and domain monitoring with Telegram alerts. Setup takes less than a minute.',
    url: appUrl,
    siteName: 'PINGO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PINGO — Know when your website breaks',
    description: 'Website, SSL, DNS and domain monitoring with Telegram alerts.',
  },
  alternates: { canonical: appUrl },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
