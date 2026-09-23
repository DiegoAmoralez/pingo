import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, 'Domain expiration monitor', 'Контроль срока домена'), description: pick(locale, 'Watch domain expiry, registrar and nameservers using RDAP.', 'Следите за сроком домена, регистратором и серверами имён через RDAP.') };
}

export default async function Page() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <SeoPage
      title={t('Domain expiration monitor', 'Контроль срока домена')}
      description={t('PingoGo finds the registrable root domain, queries RDAP, and alerts before the domain expires.', 'PingoGo определяет регистрируемый корневой домен, запрашивает RDAP и предупреждает до окончания срока регистрации.')}
      body={[
        t('shop.example.co.uk becomes example.co.uk using the Public Suffix List. Multiple websites on the same domain share one Domain Watch.', 'С помощью Public Suffix List адрес shop.example.co.uk преобразуется в example.co.uk. Несколько сайтов на одном домене используют одну проверку домена.'),
        t('If a registry does not publish an expiration date, PingoGo shows Domain expiration unavailable and retries later. The website monitor is never blocked by a WHOIS gap.', 'Если реестр не публикует дату окончания, PingoGo покажет, что срок домена недоступен, и повторит попытку позже. Это не блокирует мониторинг сайта.'),
      ]}
    />
  );
}
