import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, 'DNS monitoring', 'Мониторинг DNS'), description: pick(locale, 'Snapshot A, AAAA, CNAME, MX and NS records and get notified on changes.', 'Сохраняйте A, AAAA, CNAME, MX и NS-записи и узнавайте об изменениях.') };
}

export default async function Page() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <SeoPage
      title={t('DNS monitoring', 'Мониторинг DNS')}
      description={t('PingoGo stores a DNS snapshot when you add a website and compares every later lookup.', 'PingoGo сохраняет снимок DNS при добавлении сайта и сравнивает с ним каждую последующую проверку.')}
      body={[
        t('A record changes and nameserver changes get their own Telegram messages. DNS changes are not treated as downtime.', 'Изменения A-записей и серверов имён получают отдельные сообщения в Telegram. Изменение DNS не считается простоем.'),
        t('TXT records can be collected for completeness but do not generate alerts in the current release.', 'TXT-записи сохраняются для полноты, но в текущей версии не создают уведомления.'),
      ]}
    />
  );
}
