import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, 'Telegram website monitor', 'Мониторинг сайтов в Telegram'), description: pick(locale, 'Connect Telegram and receive short, useful alerts when a site, SSL, DNS or domain needs attention.', 'Подключите Telegram и получайте короткие уведомления о проблемах с сайтом, SSL, DNS или доменом.') };
}

export default async function Page() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <SeoPage
      title={t('Telegram website monitor', 'Мониторинг сайтов в Telegram')}
      description={t('PingoGo is built around Telegram. Connect once, then use /status, /list and /add from the chat.', 'PingoGo тесно интегрирован с Telegram. Подключитесь один раз, а затем используйте /status, /list и /add прямо в чате.')}
      body={[
        t('Account linking uses a hashed one-time token. Production webhooks verify Telegram secret tokens.', 'Для привязки аккаунта используется хешированный одноразовый токен. Production-webhook проверяет секретные токены Telegram.'),
        t('Critical downtime is always delivered immediately. Duplicate alerts are suppressed with a deduplication key.', 'Критические уведомления о простое доставляются немедленно. Дубликаты подавляются с помощью ключа дедупликации.'),
      ]}
    />
  );
}
