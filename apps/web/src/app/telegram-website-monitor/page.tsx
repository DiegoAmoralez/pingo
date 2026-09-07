import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Telegram website monitor',
  description: 'Connect Telegram and receive short, useful alerts when a site, SSL, DNS or domain needs attention.',
};

export default function Page() {
  return (
    <SeoPage
      title="Telegram website monitor"
      description="PINGO is built around Telegram. Connect once, then use /status, /list and /add from the chat."
      body={[
        'Account linking uses a hashed one-time token. Production webhooks verify Telegram secret tokens.',
        'Critical downtime is always delivered immediately. Duplicate alerts are suppressed with a deduplication key.',
      ]}
    />
  );
}
