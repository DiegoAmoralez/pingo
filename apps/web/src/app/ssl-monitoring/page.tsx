import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, 'SSL monitoring', 'Мониторинг SSL'), description: pick(locale, 'Track certificate expiry and get Telegram warnings before HTTPS breaks.', 'Следите за сроком сертификата и получайте уведомления в Telegram до проблем с HTTPS.') };
}

export default async function Page() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <SeoPage
      title={t('SSL monitoring', 'Мониторинг SSL')}
      description={t('PingoGo reads the live certificate, stores issuer and expiry, and warns at 30, 14, 7, 3 and 1 day.', 'PingoGo проверяет действующий сертификат, сохраняет издателя и срок действия и предупреждает за 30, 14, 7, 3 и 1 день.')}
      body={[
        t('SSL checks run daily. We never spam the same threshold twice.', 'SSL проверяется ежедневно. Мы не отправляем повторные уведомления для одного порога.'),
        t('If a certificate cannot be read, the website monitor still continues. SSL simply shows as unavailable until the next successful lookup.', 'Если сертификат не удалось прочитать, мониторинг сайта продолжится. SSL будет отмечен как недоступный до следующей успешной проверки.'),
      ]}
    />
  );
}
