import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(await getLocale(), 'Privacy', 'Конфиденциальность') };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-7">
        <h1 className="text-4xl font-semibold tracking-tight">{t('Privacy policy', 'Политика конфиденциальности')}</h1>
        <p className="mt-4 text-muted">
          {t('This is a template. Have a lawyer review it before production use.', 'Это шаблон. Перед публикацией его должен проверить юрист.')}
        </p>
        <div className="mt-8 space-y-4">
          <p>
            {t('PingoGo stores account email, hashed passwords, monitor configuration, check results, Telegram chat identifiers and billing customer IDs needed to operate the service.', 'PingoGo хранит email аккаунта, хешированные пароли, настройки мониторинга, результаты проверок, идентификаторы чатов Telegram и платёжные идентификаторы, необходимые для работы сервиса.')}
          </p>
          <p>
            {t('We do not store card numbers. Payments are processed by Stripe. Transactional email may be sent through Resend.', 'Мы не храним номера банковских карт. Платежи обрабатывает Stripe, а сервисные письма могут отправляться через Resend.')}
          </p>
          <p>
            {t('Essential cookies are used for authentication. Optional product analytics run only when a PostHog key is configured.', 'Обязательные cookie используются для авторизации. Необязательная продуктовая аналитика работает только при настроенном ключе PostHog.')}
          </p>
          <p>{t('You can delete your account from Settings. Associated monitors and checks are removed.', 'Удалить аккаунт можно в настройках. Связанные мониторы и результаты проверок также удаляются.')}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
