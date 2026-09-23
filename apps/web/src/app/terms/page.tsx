import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await getLocale(), 'Terms', 'Условия использования') };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
        <h1 className="text-4xl font-semibold tracking-tight">{t('Terms of service', 'Условия использования')}</h1>
        <p className="mt-4 text-muted">
          {t('This is a template. Have a lawyer review it before production use.', 'Это шаблон. Перед публикацией его должен проверить юрист.')}
        </p>
        <div className="mt-8 space-y-4">
          <p>
            {t('PingoGo provides website, SSL, DNS and domain monitoring. It does not guarantee detection of every failure and is not a substitute for your own operational processes.', 'PingoGo предоставляет мониторинг сайтов, SSL, DNS и доменов. Сервис не гарантирует обнаружение каждого сбоя и не заменяет ваши собственные операционные процессы.')}
          </p>
          <p>
            {t('You must only monitor websites you are authorized to check. You must not use the service to scan internal, private or unauthorized networks.', 'Вы можете проверять только сайты, на мониторинг которых у вас есть разрешение. Запрещено использовать сервис для сканирования внутренних, приватных или неразрешённых сетей.')}
          </p>
          <p>{t('Paid plans renew until cancelled through the billing portal. Downgrades pause extra monitors instead of deleting them.', 'Платные тарифы продлеваются до отмены через платёжный портал. При понижении тарифа дополнительные мониторы приостанавливаются, а не удаляются.')}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
