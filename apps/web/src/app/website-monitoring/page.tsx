import SeoPage from '@/components/seo-page';
import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: pick(locale, 'Website monitoring', 'Мониторинг сайтов'),
    description: pick(locale, 'Uptime, HTTP status and response time monitoring with Telegram alerts.', 'Мониторинг доступности, HTTP-статуса и времени ответа с уведомлениями в Telegram.'),
  };
}

export default async function Page() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <SeoPage
      title={t('Website monitoring', 'Мониторинг сайтов')}
      description={t('Add a URL once. PingoGo checks HTTP status and response time, then opens an incident only after consecutive failures.', 'Добавьте URL один раз. PingoGo проверяет HTTP-статус и время ответа, а инцидент создаёт только после нескольких последовательных сбоев.')}
      body={[
        t('PingoGo performs lightweight HTTP checks from a background worker. It prefers HEAD requests and falls back to a bounded GET so monitoring never turns into a download proxy.', 'PingoGo выполняет лёгкие HTTP-проверки фоновым процессом. Сначала используется HEAD, а затем ограниченный GET, поэтому мониторинг не превращается в прокси для загрузок.'),
        t('A website is marked down after two consecutive failed checks. Recovery closes the incident and sends a short Telegram message with downtime duration.', 'Сайт считается недоступным после двух последовательных неудачных проверок. Восстановление закрывает инцидент и отправляет в Telegram длительность простоя.'),
        t('Private networks, cloud metadata endpoints and credentialed URLs are blocked to prevent SSRF.', 'Приватные сети, облачные metadata endpoints и URL с учётными данными блокируются для защиты от SSRF.'),
      ]}
    />
  );
}
